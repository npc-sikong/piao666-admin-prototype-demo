"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActionButton,
  Dialog,
  InlineNotice,
  StatusBadge,
} from "@/components/admin-workspace/admin-workspace";
import { PageState } from "@/components/page-state/page-state";
import {
  adjustStationMasterPoints,
  apiErrorMessage,
  changeStationMasterStatus,
  createStationMaster,
  formatPoints,
  getAdminCommandResult,
  getStationMaster,
  isForbiddenError,
  isNotReadyError,
  isUnknownSubmission,
  listBudgets,
  listStationMasters,
  listStations,
  migrateStationMaster,
  newClientIntentId,
  newIntentKey,
  nonNegativeWholePoints,
  resetStationMasterPassword,
  subtractPoints,
  updateStationMaster,
  wholePoints,
  type PendingCommand,
  type StationMasterFilters,
} from "./station-management-api";
import type {
  BudgetAccount,
  CommandResult,
  Station,
  StationLimits,
  StationMaster,
  TaskAccepted,
  ToggleStatus,
} from "./station-management-models";
import styles from "./station-management.module.css";

interface Props {
  permissions: readonly string[];
}

type DialogKind = "detail" | "create" | "edit" | "status" | "password" | "migration" | "adjust";

interface ActiveDialog {
  kind: DialogKind;
  target: StationMaster | null;
  etag: string | null;
}

interface MasterForm {
  clientIntentId: string;
  name: string;
  account: string;
  initialPassword: string;
  confirmPassword: string;
  stationId: string;
  status: ToggleStatus;
  singleGrantLimit: string;
  singleDeductLimit: string;
  dailyOperationLimit: string;
  initialDisposablePoints: string;
  remark: string;
}

interface ReasonForm {
  reason: string;
  proofCode: string;
  newPassword: string;
  confirmPassword: string;
  targetStationId: string;
  moveOwnedMembers: boolean;
  adjustmentType: "ADMIN_GRANT" | "ADMIN_DEDUCT";
  points: string;
}

const emptyFilters: StationMasterFilters = {};

export function StationMastersTab({ permissions }: Props) {
  const canView = permissions.includes("station-master:view");
  const canCreate = permissions.includes("station-master:create");
  const canUpdate = permissions.includes("station-master:update");
  const canStatus = permissions.includes("station-master:status");
  const canPassword = permissions.includes("station-master:password:reset");
  const canMigrate = permissions.includes("station-master:migrate");
  const canAdjust = permissions.includes("station-master:points:adjust");
  const canBudgetView = permissions.includes("budget:view");
  const canStationView = permissions.includes("station:view");
  const canCommandRead = permissions.includes("command:read:self");
  const canAuthorize = permissions.includes("action:authorize");
  const canSensitiveAction = canAuthorize && canCommandRead;
  const [draftFilters, setDraftFilters] = useState<StationMasterFilters>(emptyFilters);
  const [filters, setFilters] = useState<StationMasterFilters>(emptyFilters);
  const [items, setItems] = useState<readonly StationMaster[]>([]);
  const [stations, setStations] = useState<readonly Station[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "forbidden" | "not-ready">("loading");
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<ActiveDialog | null>(null);
  const [masterForm, setMasterForm] = useState<MasterForm>(() => blankMasterForm([]));
  const [reasonForm, setReasonForm] = useState<ReasonForm>(blankReasonForm);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingCommand, setPendingCommand] = useState<PendingCommand | null>(null);
  const [commandResult, setCommandResult] = useState<CommandResult | null>(null);
  const [acceptedTask, setAcceptedTask] = useState<TaskAccepted | null>(null);
  const [distributionBudget, setDistributionBudget] = useState<BudgetAccount | null>(null);

  const load = useCallback(async (current: StationMasterFilters, append = false) => {
    if (!canView) {
      setStatus("forbidden");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const [page, stationPage] = await Promise.all([
        listStationMasters(current),
        canStationView ? listStations() : Promise.resolve(null),
      ]);
      setItems((previous) => append ? [...previous, ...page.items] : page.items);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
      if (stationPage !== null) {
        setStations(stationPage.items);
      }
      setStatus("ready");
    } catch (cause) {
      setError(apiErrorMessage(cause));
      setStatus(isForbiddenError(cause) ? "forbidden" : isNotReadyError(cause) ? "not-ready" : "error");
    }
  }, [canStationView, canView]);

  useEffect(() => {
    void load(filters);
  }, [filters, load]);

  const loadedTotals = useMemo(() => ({
    enabled: items.filter((item) => item.status === "ENABLED").length,
    members: items.reduce((total, item) => total + item.memberCount, 0),
  }), [items]);

  async function openDialog(kind: DialogKind, candidate?: StationMaster) {
    setFeedback(null);
    setAcceptedTask(null);
    setCommandResult(null);
    setReasonForm(blankReasonForm());
    if (kind === "create") {
      setMasterForm(blankMasterForm(stations));
      setDialog({ kind, target: null, etag: null });
      return;
    }
    if (candidate === undefined) return;
    try {
      const current = await getStationMaster(candidate.id);
      setDialog({ kind, target: current.value, etag: current.etag });
      setMasterForm(formFromMaster(current.value));
      if (kind === "adjust" && canBudgetView) {
        const page = await listBudgets();
        setDistributionBudget(page.items.find((item) => item.type === "DISTRIBUTION_BUDGET") ?? null);
      }
    } catch (cause) {
      setFeedback(apiErrorMessage(cause));
    }
  }

  function closeDialog() {
    setMasterForm((value) => ({ ...value, initialPassword: "", confirmPassword: "" }));
    setReasonForm(blankReasonForm());
    setDialog(null);
    setDistributionBudget(null);
  }

  async function submitCreate() {
    const limits = limitsFromForm(masterForm);
    const initialPoints = nonNegativeWholePoints(masterForm.initialDisposablePoints);
    if (masterForm.initialPassword !== masterForm.confirmPassword) {
      setFeedback("两次输入的初始密码不一致。");
      return;
    }
    if (limits === null || initialPoints === null) {
      setFeedback("操作上限和初始额度必须是非负整数。");
      return;
    }
    const idempotencyKey = newIntentKey("createStationMaster");
    setSubmitting(true);
    setFeedback(null);
    try {
      const created = await createStationMaster({
        clientIntentId: masterForm.clientIntentId,
        name: masterForm.name.trim(),
        account: masterForm.account.trim(),
        initialPassword: masterForm.initialPassword,
        stationId: masterForm.stationId,
        status: masterForm.status,
        limits,
        initialDisposablePoints: initialPoints,
        remark: masterForm.remark.trim(),
      }, idempotencyKey);
      setFeedback(`站长 ${created.name} 已创建；密码未保存在页面，初始额度结果以账本回执为准。`);
      closeDialog();
      await load(filters);
    } catch (cause) {
      if (isUnknownSubmission(cause)) {
        setPendingCommand({ operationId: "createStationMaster", idempotencyKey, label: "创建站长" });
      }
      setFeedback(apiErrorMessage(cause));
    } finally {
      setMasterForm((value) => ({ ...value, initialPassword: "", confirmPassword: "" }));
      setSubmitting(false);
    }
  }

  async function submitEdit() {
    if (dialog?.target === null || dialog?.target === undefined || dialog.etag === null) return;
    const limits = limitsFromForm(masterForm);
    if (limits === null) {
      setFeedback("操作上限必须是非负整数，0 表示禁止该类操作。");
      return;
    }
    const idempotencyKey = newIntentKey("updateStationMaster");
    setSubmitting(true);
    setFeedback(null);
    try {
      await updateStationMaster(dialog.target.id, {
        name: masterForm.name.trim(),
        account: masterForm.account.trim(),
        limits,
        remark: masterForm.remark.trim(),
      }, dialog.etag, idempotencyKey);
      setFeedback("站长资料与操作上限已按服务端最新版本保存；余额未被普通编辑修改。");
      closeDialog();
      await load(filters);
    } catch (cause) {
      if (isUnknownSubmission(cause)) {
        setPendingCommand({ operationId: "updateStationMaster", idempotencyKey, label: "编辑站长" });
      }
      setFeedback(apiErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitStatus() {
    const target = dialog?.target;
    const etag = dialog?.etag;
    if (target === null || target === undefined || etag === null || etag === undefined) return;
    const nextStatus: ToggleStatus = target.status === "ENABLED" ? "DISABLED" : "ENABLED";
    const idempotencyKey = newIntentKey("changeStationMasterStatus");
    setSubmitting(true);
    setFeedback(null);
    try {
      await changeStationMasterStatus(target, nextStatus, reasonForm.reason.trim(), etag, idempotencyKey);
      setFeedback(nextStatus === "DISABLED"
        ? "站长已停用；邀请和积分操作会被禁止，历史账务与会员余额保持不变。"
        : "站长已启用。");
      closeDialog();
      await load(filters);
    } catch (cause) {
      if (isUnknownSubmission(cause)) {
        setPendingCommand({ operationId: "changeStationMasterStatus", idempotencyKey, label: "变更站长状态" });
      }
      setFeedback(apiErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitPassword() {
    const target = dialog?.target;
    if (target === null || target === undefined) return;
    if (reasonForm.newPassword !== reasonForm.confirmPassword) {
      setFeedback("两次输入的新密码不一致。");
      return;
    }
    const idempotencyKey = newIntentKey("resetStationMasterPassword");
    setSubmitting(true);
    setFeedback(null);
    try {
      await resetStationMasterPassword({
        stationMaster: target,
        newPassword: reasonForm.newPassword,
        reason: reasonForm.reason.trim(),
        proofCode: reasonForm.proofCode,
        idempotencyKey,
      });
      setFeedback("新密码已由服务端设置，旧会话已撤销；页面不会回显或保留密码。");
      closeDialog();
    } catch (cause) {
      if (isUnknownSubmission(cause)) {
        setPendingCommand({ operationId: "resetStationMasterPassword", idempotencyKey, label: "设置站长新密码" });
      }
      setFeedback(apiErrorMessage(cause));
    } finally {
      setReasonForm((value) => ({ ...value, newPassword: "", confirmPassword: "", proofCode: "" }));
      setSubmitting(false);
    }
  }

  async function submitMigration() {
    const target = dialog?.target;
    const etag = dialog?.etag;
    if (target === null || target === undefined || etag === null || etag === undefined) return;
    const idempotencyKey = newIntentKey("migrateStationMaster");
    setSubmitting(true);
    setFeedback(null);
    try {
      const task = await migrateStationMaster({
        stationMaster: target,
        targetStationId: reasonForm.targetStationId,
        moveOwnedMembers: reasonForm.moveOwnedMembers,
        reason: reasonForm.reason.trim(),
        proofCode: reasonForm.proofCode,
        etag,
        idempotencyKey,
      });
      setAcceptedTask(task);
      setPendingCommand({ operationId: "migrateStationMaster", idempotencyKey, label: "迁移站长归属" });
      setFeedback("迁移任务已受理，尚未完成；请查询原命令确认最终状态。");
      closeDialog();
    } catch (cause) {
      if (isUnknownSubmission(cause)) {
        setPendingCommand({ operationId: "migrateStationMaster", idempotencyKey, label: "迁移站长归属" });
      }
      setFeedback(apiErrorMessage(cause));
    } finally {
      setReasonForm((value) => ({ ...value, proofCode: "" }));
      setSubmitting(false);
    }
  }

  async function submitAdjustment() {
    const target = dialog?.target;
    if (target === null || target === undefined) return;
    const points = wholePoints(reasonForm.points);
    if (points === null) {
      setFeedback("调整数量必须是正整数积分。");
      return;
    }
    const idempotencyKey = newIntentKey("adjustStationMasterPoints");
    setSubmitting(true);
    setFeedback(null);
    try {
      const receipt = await adjustStationMasterPoints({
        stationMaster: target,
        type: reasonForm.adjustmentType,
        points,
        reason: reasonForm.reason.trim(),
        proofCode: reasonForm.proofCode,
        idempotencyKey,
      });
      setFeedback(`账本已确认：${receipt.transactionId}，站长可支配积分 ${formatPoints(receipt.stationMasterBalanceBefore)} → ${formatPoints(receipt.stationMasterBalanceAfter)}。`);
      closeDialog();
      await load(filters);
    } catch (cause) {
      if (isUnknownSubmission(cause)) {
        setPendingCommand({ operationId: "adjustStationMasterPoints", idempotencyKey, label: "调整站长额度" });
      }
      setFeedback(apiErrorMessage(cause));
    } finally {
      setReasonForm((value) => ({ ...value, proofCode: "" }));
      setSubmitting(false);
    }
  }

  async function recoverCommand() {
    if (pendingCommand === null) return;
    setFeedback(null);
    try {
      const result = await getAdminCommandResult(pendingCommand);
      setCommandResult(result);
      setFeedback(result.status === "PROCESSING"
        ? `${pendingCommand.label}仍在处理中，请稍后沿同一命令查询。`
        : result.status === "SUCCEEDED"
          ? result.httpStatus === 202
            ? `${pendingCommand.label}已由服务端确认受理；任务尚未因此完成。`
            : `${pendingCommand.label}已由服务端确认完成。`
          : `${pendingCommand.label}执行失败：${result.failureCode ?? "未提供失败码"}。`);
      if (result.status !== "PROCESSING") {
        setPendingCommand(null);
        await load(filters);
      }
    } catch (cause) {
      setFeedback(apiErrorMessage(cause));
    }
  }

  if (!canView) {
    return <PageState description="当前员工没有站长查看权限。" kind="forbidden" />;
  }

  return (
    <>
      <div className={styles.sectionLead}>
        <div>
          <strong>A10 / A11 · 站长与额度</strong>
          <span>当前已载入 {items.length} 位站长，其中启用 {loadedTotals.enabled} 位、名下会员 {loadedTotals.members} 人。</span>
        </div>
        {canCreate ? <ActionButton disabled={!canStationView || !canCommandRead} onClick={() => void openDialog("create")} variant="primary">新增站长</ActionButton> : null}
      </div>

      {!canStationView && canCreate ? (
        <InlineNotice title="缺少站点查看权限" tone="warning">
          创建站长需要先读取授权站点，当前员工无法完成站点选择。
        </InlineNotice>
      ) : null}
      {!canAuthorize && (canPassword || canMigrate || canAdjust) ? (
        <InlineNotice title="缺少动作授权权限" tone="warning">
          设置新密码、迁移归属和额度调整都需要员工 MFA 动作授权；当前会话只能执行非敏感查看或资料操作。
        </InlineNotice>
      ) : null}
      {!canCommandRead && (canCreate || canUpdate || canStatus || canPassword || canMigrate || canAdjust) ? (
        <InlineNotice title="缺少原命令查询权限" tone="warning">
          幂等写操作可能出现未知提交结果；当前员工不能查询本人原命令，因此写入入口已禁用。
        </InlineNotice>
      ) : null}

      <form className={styles.filterBar} onSubmit={(event) => {
        event.preventDefault();
        setFilters(masterFilterValues(draftFilters));
      }}>
        <label className={styles.field} data-grow="true">
          <span>姓名 / 编号 / 登录账号</span>
          <input onChange={(event) => setDraftFilters((value) => ({ ...value, keyword: event.target.value }))} placeholder="输入姓名、编号或登录账号" value={draftFilters.keyword ?? ""} />
        </label>
        {stations.length > 0 ? (
          <label className={styles.field}>
            <span>归属站点</span>
            <select onChange={(event) => setDraftFilters((value) => masterFilterValues(value, {
              stationId: event.target.value === "" ? null : event.target.value,
            }))} value={draftFilters.stationId ?? ""}>
              <option value="">全部授权站点</option>
              {stations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}
            </select>
          </label>
        ) : null}
        <label className={styles.field}>
          <span>状态</span>
          <select onChange={(event) => setDraftFilters((value) => masterFilterValues(value, {
            status: event.target.value === "" ? null : event.target.value as ToggleStatus,
          }))} value={draftFilters.status ?? ""}>
            <option value="">全部状态</option>
            <option value="ENABLED">启用</option>
            <option value="DISABLED">停用</option>
          </select>
        </label>
        <ActionButton type="submit" variant="primary">查询</ActionButton>
        <ActionButton onClick={() => { setDraftFilters(emptyFilters); setFilters(emptyFilters); }}>重置</ActionButton>
      </form>

      {pendingCommand !== null && canCommandRead ? (
        <div className={styles.commandBar}>
          <div><strong>{pendingCommand.label}</strong><span>幂等意图已保留，查询原命令不会重复执行。</span></div>
          <ActionButton onClick={() => void recoverCommand()}>查询原命令</ActionButton>
        </div>
      ) : null}
      {acceptedTask === null ? null : (
        <InlineNotice title="任务已受理" tone="warning">
          任务号 {acceptedTask.taskId}，当前状态 {acceptedTask.status}；受理不代表迁移已完成。
        </InlineNotice>
      )}
      {commandResult === null ? null : (
        <InlineNotice title={`命令状态：${commandResult.status}`} tone={commandResult.status === "FAILED" ? "danger" : commandResult.status === "SUCCEEDED" ? "success" : "warning"}>
          HTTP {commandResult.httpStatus}；资源 {commandResult.resourceId ?? "尚未生成"}；任务 {commandResult.taskId ?? "无"}。{commandResult.httpStatus === 202 ? "当前只确认受理，不代表任务完成。" : ""}
        </InlineNotice>
      )}
      {feedback === null ? null : <p className={styles.feedback} role="status">{feedback}</p>}

      {status === "loading" ? <PageState kind="loading" title="正在读取站长" /> : null}
      {status === "forbidden" ? <PageState kind="forbidden" /> : null}
      {status === "not-ready" ? <PageState kind="not-ready" /> : null}
      {status === "error" ? <PageState action={<ActionButton onClick={() => void load(filters)}>重试</ActionButton>} description={error ?? undefined} kind="error" /> : null}

      {status === "ready" ? (
        items.length === 0 ? <PageState kind="empty" title="当前范围没有站长" /> : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table} data-wide="true">
                <thead><tr><th>站长</th><th>归属站点</th><th>状态</th><th>可支配积分</th><th>推广会员</th><th>累计加分</th><th>累计减分</th><th>净转出</th><th>操作</th></tr></thead>
                <tbody>
                  {items.map((master) => (
                    <tr key={master.id}>
                      <td><span className={styles.entity}><strong>{master.name}</strong><small>{master.code} · {master.account}</small></span></td>
                      <td><span className={styles.entity}><strong>{master.station.name}</strong><small>{master.station.code}</small></span></td>
                      <td><StatusBadge label={master.status === "ENABLED" ? "启用" : "停用"} status={master.status} /></td>
                      <td><strong className={styles.points}>{formatPoints(master.disposablePoints)}</strong></td>
                      <td>{master.memberCount}</td>
                      <td className={styles.positive}>+{formatPoints(master.grantedMemberPoints)}</td>
                      <td className={styles.negative}>-{formatPoints(master.deductedMemberPoints)}</td>
                      <td><strong>{formatPoints(subtractPoints(master.grantedMemberPoints, master.deductedMemberPoints))}</strong></td>
                      <td><div className={styles.rowActions}>
                        <button onClick={() => void openDialog("detail", master)} type="button">详情</button>
                        {canUpdate && canCommandRead ? <button onClick={() => void openDialog("edit", master)} type="button">编辑</button> : null}
                        {canAdjust && canSensitiveAction ? <button onClick={() => void openDialog("adjust", master)} type="button">调整额度</button> : null}
                        {canStatus && canCommandRead ? <button onClick={() => void openDialog("status", master)} type="button">{master.status === "ENABLED" ? "停用" : "启用"}</button> : null}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasMore && nextCursor !== null ? <div className={styles.loadMore}><ActionButton onClick={() => void load({ ...filters, cursor: nextCursor }, true)}>加载更多</ActionButton></div> : null}
          </>
        )
      ) : null}

      <Dialog
        description={dialogDescription(dialog?.kind)}
        footer={dialogFooter(dialog?.kind, submitting || pendingCommand !== null, closeDialog)}
        onClose={closeDialog}
        open={dialog !== null}
        title={dialogTitle(dialog?.kind, dialog?.target)}
        width={dialog?.kind === "detail" || dialog?.kind === "create" || dialog?.kind === "edit" ? "wide" : "medium"}
      >
        {feedback === null ? null : <p className={styles.feedback} role="alert">{feedback}</p>}
        {dialog?.kind === "detail" && dialog.target !== null ? (
          <MasterDetail
            canAdjust={canAdjust && canSensitiveAction}
            canMigrate={canMigrate && canSensitiveAction}
            canPassword={canPassword && canSensitiveAction}
            master={dialog.target}
            onAction={(kind) => void openDialog(kind, dialog.target ?? undefined)}
          />
        ) : null}
        {dialog?.kind === "create" || dialog?.kind === "edit" ? (
          <MasterEditor
            form={masterForm}
            mode={dialog.kind}
            onChange={setMasterForm}
            onSubmit={() => void (dialog.kind === "create" ? submitCreate() : submitEdit())}
            stations={stations}
          />
        ) : null}
        {dialog?.kind === "status" && dialog.target !== null ? (
          <ReasonActionForm formId="master-status-form" form={reasonForm} onChange={setReasonForm} onSubmit={() => void submitStatus()}>
            <InlineNotice tone="warning">
              {dialog.target.status === "ENABLED" ? "停用会立即禁止邀请与加减分，并撤销敏感操作会话；历史账务不变。" : "启用只恢复该站长状态，不修改会员归属或任何余额。"}
            </InlineNotice>
          </ReasonActionForm>
        ) : null}
        {dialog?.kind === "password" && dialog.target !== null ? (
          <PasswordForm form={reasonForm} onChange={setReasonForm} onSubmit={() => void submitPassword()} />
        ) : null}
        {dialog?.kind === "migration" && dialog.target !== null ? (
          <MigrationForm form={reasonForm} master={dialog.target} onChange={setReasonForm} onSubmit={() => void submitMigration()} stations={stations} />
        ) : null}
        {dialog?.kind === "adjust" && dialog.target !== null ? (
          <AdjustmentForm budget={distributionBudget} form={reasonForm} master={dialog.target} onChange={setReasonForm} onSubmit={() => void submitAdjustment()} />
        ) : null}
      </Dialog>
    </>
  );
}

function MasterDetail({ master, canPassword, canMigrate, canAdjust, onAction }: {
  master: StationMaster;
  canPassword: boolean;
  canMigrate: boolean;
  canAdjust: boolean;
  onAction(kind: "password" | "migration" | "adjust"): void;
}) {
  return (
    <div className={styles.detailStack}>
      <InlineNotice title={`${master.name} · ${master.code}`} tone={master.status === "ENABLED" ? "success" : "warning"}>
        用户端账号 {master.account}，归属 {master.station.name}；当前密码从不回显。
      </InlineNotice>
      <div className={styles.factGrid}>
        <span><small>可支配积分</small><strong>{formatPoints(master.disposablePoints)}</strong></span>
        <span><small>名下会员</small><strong>{master.memberCount}</strong></span>
        <span><small>累计加会员积分</small><strong>{formatPoints(master.grantedMemberPoints)}</strong></span>
        <span><small>累计减会员积分</small><strong>{formatPoints(master.deductedMemberPoints)}</strong></span>
      </div>
      <dl className={styles.definitionList}>
        <div><dt>单次加分上限</dt><dd>{formatPoints(master.limits.singleGrantLimit)}</dd></div>
        <div><dt>单次减分上限</dt><dd>{formatPoints(master.limits.singleDeductLimit)}</dd></div>
        <div><dt>每日操作上限</dt><dd>{formatPoints(master.limits.dailyOperationLimit)}</dd></div>
        <div><dt>操作凭据</dt><dd>{master.operationCredentialConfigured ? "已设置" : "未设置"}</dd></div>
        <div><dt>备注</dt><dd>{master.remark || "无"}</dd></div>
      </dl>
      <div className={styles.dialogActionRow}>
        {canAdjust ? <ActionButton onClick={() => onAction("adjust")} variant="primary">调整可支配积分</ActionButton> : null}
        {canMigrate ? <ActionButton onClick={() => onAction("migration")}>迁移归属</ActionButton> : null}
        {canPassword ? <ActionButton onClick={() => onAction("password")}>设置新密码</ActionButton> : null}
      </div>
    </div>
  );
}

function MasterEditor({ mode, form, stations, onChange, onSubmit }: {
  mode: "create" | "edit";
  form: MasterForm;
  stations: readonly Station[];
  onChange(value: MasterForm): void;
  onSubmit(): void;
}) {
  const set = <K extends keyof MasterForm>(key: K, value: MasterForm[K]) => onChange({ ...form, [key]: value });
  return (
    <form className={styles.formGrid} id="master-editor-form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      {mode === "create" ? <div className={styles.span2}><InlineNotice>新增时由运营手动填写用户端账号和初始密码；提交后页面立即清除密码。</InlineNotice></div> : null}
      <label className={styles.field}><span>站长姓名</span><input maxLength={80} onChange={(event) => set("name", event.target.value)} required value={form.name} /></label>
      <label className={styles.field}><span>登录账号</span><input autoComplete="off" maxLength={32} pattern="[A-Za-z0-9_-]{4,32}" onChange={(event) => set("account", event.target.value)} required value={form.account} /></label>
      {mode === "create" ? <>
        <label className={styles.field}><span>归属站点</span><select onChange={(event) => set("stationId", event.target.value)} required value={form.stationId}><option value="">请选择</option>{stations.filter((station) => station.status === "ENABLED").map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}</select></label>
        <label className={styles.field}><span>初始状态</span><select onChange={(event) => set("status", event.target.value as ToggleStatus)} value={form.status}><option value="ENABLED">启用</option><option value="DISABLED">停用</option></select></label>
        <label className={styles.field}><span>初始密码</span><input autoComplete="new-password" minLength={8} maxLength={20} pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,20}" onChange={(event) => set("initialPassword", event.target.value)} required type="password" value={form.initialPassword} /></label>
        <label className={styles.field}><span>确认初始密码</span><input autoComplete="new-password" minLength={8} maxLength={20} onChange={(event) => set("confirmPassword", event.target.value)} required type="password" value={form.confirmPassword} /></label>
      </> : null}
      <label className={styles.field}><span>单次加分上限</span><input inputMode="numeric" onChange={(event) => set("singleGrantLimit", event.target.value)} pattern="(0|[1-9][0-9]{0,15})" required value={form.singleGrantLimit} /><small>0 表示禁止，不代表无限。</small></label>
      <label className={styles.field}><span>单次减分上限</span><input inputMode="numeric" onChange={(event) => set("singleDeductLimit", event.target.value)} pattern="(0|[1-9][0-9]{0,15})" required value={form.singleDeductLimit} /><small>0 表示禁止，不代表无限。</small></label>
      <label className={styles.field}><span>每日操作上限</span><input inputMode="numeric" onChange={(event) => set("dailyOperationLimit", event.target.value)} pattern="(0|[1-9][0-9]{0,15})" required value={form.dailyOperationLimit} /><small>上海业务日内加分与减分绝对值合计。</small></label>
      {mode === "create" ? <label className={styles.field}><span>初始可支配积分</span><input inputMode="numeric" onChange={(event) => set("initialDisposablePoints", event.target.value)} pattern="(0|[1-9][0-9]{0,15})" required value={form.initialDisposablePoints} /><small>非零值会与开户共同生成独立账本流水。</small></label> : null}
      {mode === "edit" ? <label className={`${styles.field} ${styles.span2}`}><span>备注</span><textarea maxLength={500} onChange={(event) => set("remark", event.target.value)} value={form.remark} /></label> : null}
    </form>
  );
}

function ReasonActionForm({ formId, form, onChange, onSubmit, children }: {
  formId: string;
  form: ReasonForm;
  onChange(value: ReasonForm): void;
  onSubmit(): void;
  children?: ReactNode;
}) {
  return <form className={styles.formStack} id={formId} onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
    {children}
    <label className={styles.field}><span>操作原因</span><textarea minLength={2} maxLength={500} onChange={(event) => onChange({ ...form, reason: event.target.value })} required value={form.reason} /></label>
  </form>;
}

function PasswordForm({ form, onChange, onSubmit }: { form: ReasonForm; onChange(value: ReasonForm): void; onSubmit(): void }) {
  return <form className={styles.formStack} id="master-password-form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
    <InlineNotice>后台不会显示当前密码。设置后旧会话撤销，站长下次登录必须修改密码。</InlineNotice>
    <label className={styles.field}><span>新密码</span><input autoComplete="new-password" minLength={8} maxLength={20} pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,20}" onChange={(event) => onChange({ ...form, newPassword: event.target.value })} required type="password" value={form.newPassword} /></label>
    <label className={styles.field}><span>确认新密码</span><input autoComplete="new-password" minLength={8} maxLength={20} onChange={(event) => onChange({ ...form, confirmPassword: event.target.value })} required type="password" value={form.confirmPassword} /></label>
    <label className={styles.field}><span>设置原因</span><textarea minLength={2} maxLength={500} onChange={(event) => onChange({ ...form, reason: event.target.value })} required value={form.reason} /></label>
    <label className={styles.field}><span>员工 MFA 动作凭据</span><input autoComplete="one-time-code" minLength={6} maxLength={200} onChange={(event) => onChange({ ...form, proofCode: event.target.value })} required type="password" value={form.proofCode} /></label>
  </form>;
}

function MigrationForm({ form, master, stations, onChange, onSubmit }: { form: ReasonForm; master: StationMaster; stations: readonly Station[]; onChange(value: ReasonForm): void; onSubmit(): void }) {
  return <form className={styles.formStack} id="master-migration-form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
    <InlineNotice title="迁移影响预览" tone="warning">当前归属 {master.station.name}，名下会员 {master.memberCount} 人。历史流水保留原站点与站长快照，不转成新站长业绩。</InlineNotice>
    <label className={styles.field}><span>目标站点</span><select onChange={(event) => onChange({ ...form, targetStationId: event.target.value })} required value={form.targetStationId}><option value="">请选择</option>{stations.filter((station) => station.status === "ENABLED" && station.id !== master.station.id).map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}</select></label>
    <label className={styles.checkField}><input checked={form.moveOwnedMembers} onChange={(event) => onChange({ ...form, moveOwnedMembers: event.target.checked })} type="checkbox" /><span>明确同时迁移名下会员（{master.memberCount} 人）</span></label>
    <label className={styles.field}><span>迁移原因</span><textarea minLength={2} maxLength={500} onChange={(event) => onChange({ ...form, reason: event.target.value })} required value={form.reason} /></label>
    <label className={styles.field}><span>员工 MFA 动作凭据</span><input autoComplete="one-time-code" minLength={6} maxLength={200} onChange={(event) => onChange({ ...form, proofCode: event.target.value })} required type="password" value={form.proofCode} /></label>
  </form>;
}

function AdjustmentForm({ form, master, budget, onChange, onSubmit }: { form: ReasonForm; master: StationMaster; budget: BudgetAccount | null; onChange(value: ReasonForm): void; onSubmit(): void }) {
  const points = wholePoints(form.points);
  const nextBalance = points === null ? "—" : form.adjustmentType === "ADMIN_GRANT"
    ? addPoints(master.disposablePoints, points)
    : subtractPoints(master.disposablePoints, points);
  return <form className={styles.formStack} id="master-adjust-form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
    <div className={styles.factGrid}>
      <span><small>站长</small><strong>{master.name}</strong></span>
      <span><small>当前可支配积分</small><strong>{formatPoints(master.disposablePoints)}</strong></span>
      <span><small>调整后预览</small><strong>{nextBalance === "—" ? nextBalance : formatPoints(nextBalance)}</strong></span>
      <span><small>平台分配预算</small><strong>{budget === null ? "无查看权限" : formatPoints(budget.availablePoints)}</strong></span>
    </div>
    <label className={styles.field}><span>调整方向</span><select onChange={(event) => onChange({ ...form, adjustmentType: event.target.value as ReasonForm["adjustmentType"] })} value={form.adjustmentType}><option value="ADMIN_GRANT">平台预算拨付给站长</option><option value="ADMIN_DEDUCT">从站长回收到平台预算</option></select></label>
    <label className={styles.field}><span>积分数量</span><input inputMode="numeric" onChange={(event) => onChange({ ...form, points: event.target.value })} pattern="[1-9][0-9]{0,15}" required value={form.points} /></label>
    <label className={styles.field}><span>调整原因</span><textarea minLength={2} maxLength={500} onChange={(event) => onChange({ ...form, reason: event.target.value })} required value={form.reason} /></label>
    <label className={styles.field}><span>员工 MFA 动作凭据</span><input autoComplete="one-time-code" minLength={6} maxLength={200} onChange={(event) => onChange({ ...form, proofCode: event.target.value })} required type="password" value={form.proofCode} /></label>
    <InlineNotice tone="warning">确认后服务端执行并发、非负与预算检查，并生成不可修改的双边账本流水。</InlineNotice>
  </form>;
}

function dialogFooter(kind: DialogKind | undefined, submitting: boolean, close: () => void) {
  if (kind === undefined) return undefined;
  const form = kind === "create" || kind === "edit" ? "master-editor-form"
    : kind === "status" ? "master-status-form"
      : kind === "password" ? "master-password-form"
        : kind === "migration" ? "master-migration-form"
          : kind === "adjust" ? "master-adjust-form" : null;
  return <>
    <ActionButton disabled={submitting} onClick={close}>{kind === "detail" ? "关闭" : "取消"}</ActionButton>
    {form === null ? null : <ActionButton disabled={submitting} form={form} type="submit" variant={kind === "status" ? "danger" : "primary"}>{submitting ? "提交中" : kind === "migration" ? "受理迁移任务" : "确认提交"}</ActionButton>}
  </>;
}

function dialogTitle(kind: DialogKind | undefined, target: StationMaster | null | undefined): string {
  if (kind === "create") return "新增站长";
  if (kind === "edit") return "编辑站长资料与上限";
  if (kind === "status") return target?.status === "ENABLED" ? "停用站长" : "启用站长";
  if (kind === "password") return "设置站长新密码";
  if (kind === "migration") return "迁移站长归属";
  if (kind === "adjust") return "调整站长可支配积分";
  return target === null || target === undefined ? "站长详情" : `${target.name} · 站长详情`;
}

function dialogDescription(kind: DialogKind | undefined): string | undefined {
  if (kind === "create") return "开户与非零初始额度在同一提交内完成。";
  if (kind === "edit") return "普通编辑不能修改余额、密码或归属。";
  if (kind === "migration") return "提交只代表任务受理，完成状态必须沿原命令查询。";
  if (kind === "adjust") return "方向、数量、原因、对象版本与最终幂等键共同绑定动作凭据。";
  return undefined;
}

function blankMasterForm(stations: readonly Station[]): MasterForm {
  return {
    clientIntentId: newClientIntentId(),
    name: "",
    account: "",
    initialPassword: "",
    confirmPassword: "",
    stationId: stations.find((station) => station.status === "ENABLED")?.id ?? "",
    status: "ENABLED",
    singleGrantLimit: "0",
    singleDeductLimit: "0",
    dailyOperationLimit: "0",
    initialDisposablePoints: "0",
    remark: "",
  };
}

function formFromMaster(master: StationMaster): MasterForm {
  return {
    ...blankMasterForm([]),
    name: master.name,
    account: master.account,
    stationId: master.station.id,
    status: master.status,
    singleGrantLimit: integerPart(master.limits.singleGrantLimit),
    singleDeductLimit: integerPart(master.limits.singleDeductLimit),
    dailyOperationLimit: integerPart(master.limits.dailyOperationLimit),
    remark: master.remark,
  };
}

function blankReasonForm(): ReasonForm {
  return { reason: "", proofCode: "", newPassword: "", confirmPassword: "", targetStationId: "", moveOwnedMembers: false, adjustmentType: "ADMIN_GRANT", points: "" };
}

function limitsFromForm(form: MasterForm): StationLimits | null {
  const singleGrantLimit = nonNegativeWholePoints(form.singleGrantLimit);
  const singleDeductLimit = nonNegativeWholePoints(form.singleDeductLimit);
  const dailyOperationLimit = nonNegativeWholePoints(form.dailyOperationLimit);
  return singleGrantLimit === null || singleDeductLimit === null || dailyOperationLimit === null
    ? null
    : { singleGrantLimit, singleDeductLimit, dailyOperationLimit };
}

function integerPart(value: string): string {
  return value.endsWith(".00") ? value.slice(0, -3) : value;
}

function addPoints(left: string, right: string): string {
  const leftParts = left.split(".");
  const rightParts = right.split(".");
  const total = BigInt(leftParts[0] ?? "0") * 100n + BigInt(leftParts[1] ?? "0")
    + BigInt(rightParts[0] ?? "0") * 100n + BigInt(rightParts[1] ?? "0");
  return `${total / 100n}.${String(total % 100n).padStart(2, "0")}`;
}

function masterFilterValues(
  value: StationMasterFilters,
  overrides: Readonly<{ stationId?: string | null; status?: ToggleStatus | null }> = {},
): StationMasterFilters {
  const stationId = overrides.stationId === undefined ? value.stationId ?? null : overrides.stationId;
  const status = overrides.status === undefined ? value.status ?? null : overrides.status;
  return {
    ...(value.keyword === undefined ? {} : { keyword: value.keyword }),
    ...(stationId === null ? {} : { stationId }),
    ...(status === null ? {} : { status }),
  };
}
