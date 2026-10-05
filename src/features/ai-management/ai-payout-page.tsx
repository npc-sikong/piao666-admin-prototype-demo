"use client";
import { ChangeNotesButton } from "@/features/change-notes/change-notes";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ActionButton,
  Dialog,
  InlineNotice,
  MetricStrip,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/admin-workspace/admin-workspace";
import { PageState } from "@/components/page-state/page-state";
import { useAdminSession } from "@/session/admin-session";
import {
  errorView,
  getCommandResult,
  getPayout,
  getSettlementExecution,
  getPool,
  listAllocations,
  listBudgets,
  listPayoutItems,
  newIntent,
  preparePayout,
  retryPayout,
  submitPayout,
} from "./ai-management-api";
import type {
  AiPoolAdmin,
  Allocation,
  BudgetAccount,
  CommandResult,
  PayoutBatch,
  PayoutItem,
  PayoutPreparation,
} from "./ai-management-models";
import {
  Breadcrumbs,
  Definition,
  DefinitionList,
  ErrorState,
  PoolStatusBadge,
  TaskReceipt,
  formatAiPoints,
  subtractAiPoints,
  formatDateTime,
  shortHash,
} from "./ai-management-ui";
import { useAiTask } from "./use-ai-task";
import styles from "./ai-management.module.css";

interface ExecuteIntent {
  confirmText: string;
  idempotencyKey: string;
}

interface RetryIntent {
  reason: string;
  idempotencyKey: string;
}

interface RecoverableCommand {
  idempotencyKey: string;
  operationId: "preparePayout" | "submitPayout" | "retryPayout";
}

export function AiPayoutPage({ poolIssueId }: Readonly<{ poolIssueId: string }>) {
  const session = useAdminSession();
  const permissions = session.identity?.permissions ?? [];
  const canViewPool = permissions.includes("ai-pool:view");
  const canPrepare = permissions.includes("ai-payout:prepare");
  const canExecute = permissions.includes("ai-payout:execute");
  const canViewPayout = permissions.includes("ai-payout:view");
  const canRetry = permissions.includes("ai-payout:retry");
  const canViewBudget = permissions.includes("budget:view");
  const canRecover = permissions.includes("command:read:self");
  const [pool, setPool] = useState<AiPoolAdmin | null>(null);
  const [allocation, setAllocation] = useState<Allocation | null>(null);
  const [budgets, setBudgets] = useState<readonly BudgetAccount[]>([]);
  const [preparation, setPreparation] = useState<PayoutPreparation | null>(null);
  const [batch, setBatch] = useState<PayoutBatch | null>(null);
  const [items, setItems] = useState<readonly PayoutItem[]>([]);
  const [itemCursor, setItemCursor] = useState<string | null>(null);
  const [itemsHaveMore, setItemsHaveMore] = useState(false);
  const [itemsLoadingMore, setItemsLoadingMore] = useState(false);
  const [batchIdInput, setBatchIdInput] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const [error, setError] = useState<ReturnType<typeof errorView> | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [prepareIntent, setPrepareIntent] = useState<string | null>(null);
  const [executeIntent, setExecuteIntent] = useState<ExecuteIntent | null>(null);
  const [retryIntent, setRetryIntent] = useState<RetryIntent | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<ReturnType<typeof errorView> | null>(null);
  const [recoverable, setRecoverable] = useState<RecoverableCommand | null>(null);
  const [commandResult, setCommandResult] = useState<CommandResult | null>(null);
  const task = useAiTask();

  const loadBase = useCallback(async () => {
    if (!canViewPool) {
      setStatus("forbidden");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const [poolResult, allocationPage, budgetPage] = await Promise.all([
        getPool(poolIssueId),
        listAllocations(poolIssueId),
        canViewBudget ? listBudgets() : Promise.resolve(null),
      ]);
      setPool(poolResult.value);
      const latestAllocation = allocationPage.items[0] ?? null;
      setAllocation(latestAllocation?.confirmationStatus === "CONFIRMED" && latestAllocation.status === "SOLVED" ? latestAllocation : null);
      setBudgets(budgetPage?.items ?? []);
      setStatus("ready");
    } catch (cause) {
      const view = errorView(cause);
      setError(view);
      setStatus(view.kind === "forbidden" ? "forbidden" : "error");
    }
  }, [canViewBudget, canViewPool, poolIssueId]);

  const loadBatch = useCallback(async (batchId: string) => {
    if (!canViewPayout || batchId.trim() === "") return;
    setError(null);
    try {
      const [batchResult, itemPage] = await Promise.all([
        getPayout(batchId.trim()),
        listPayoutItems(batchId.trim()),
      ]);
      if (batchResult.poolIssueId !== poolIssueId) throw new Error("PAYOUT_BATCH_POOL_MISMATCH");
      setBatch(batchResult);
      setItems(itemPage.items);
      setItemCursor(itemPage.nextCursor);
      setItemsHaveMore(itemPage.hasMore);
      setBatchIdInput(batchResult.id);
    } catch (cause) {
      setError(errorView(cause));
    }
  }, [canViewPayout, poolIssueId]);

  useEffect(() => {
    if (!canViewPayout || session.status !== "authenticated") return;
    void getSettlementExecution(poolIssueId).then((state) => {
      if (state.payoutBatchId) return loadBatch(state.payoutBatchId);
    }).catch((cause: unknown) => setError(errorView(cause)));
  }, [canViewPayout, session.status, poolIssueId, loadBatch]);

  async function loadMoreItems() {
    if (batch === null || itemCursor === null || itemsLoadingMore) return;
    setItemsLoadingMore(true);
    setError(null);
    try {
      const page = await listPayoutItems(batch.id, itemCursor);
      setItems((current) => [...current, ...page.items]);
      setItemCursor(page.nextCursor);
      setItemsHaveMore(page.hasMore);
    } catch (cause) {
      setError(errorView(cause));
    } finally {
      setItemsLoadingMore(false);
    }
  }

  useEffect(() => {
    if (session.status === "authenticated") void loadBase();
  }, [loadBase, session.status]);

  useEffect(() => {
    if (task.status?.status === "SUCCEEDED" && batchIdInput !== "") void loadBatch(batchIdInput);
  }, [batchIdInput, loadBatch, task.status?.status]);

  const aiBudget = useMemo(() => budgets.find((item) => item.type === "AI_BUDGET") ?? null, [budgets]);
  const canPrepareNow = canPrepare && pool?.allowedActions.includes("PREPARE_PAYOUT") === true && allocation !== null && pool.pool.disclosureVersion !== null;

  async function createPreparation() {
    if (pool === null || allocation === null || pool.pool.disclosureVersion === null) return;
    const intent = prepareIntent ?? newIntent("preparePayout");
    setPrepareIntent(intent);
    setPreparing(true);
    setSubmitError(null);
    setRecoverable(null);
    try {
      const result = await preparePayout({
        poolIssueId,
        allocationVersion: allocation.version,
        disclosureVersion: pool.pool.disclosureVersion,
        expectedInputVersionSetHash: allocation.inputVersionSetHash,
        idempotencyKey: intent,
      });
      setPreparation(result);
      setPrepareIntent(null);
      setFeedback("发放准备已生成；这一步未预留预算、未创建发放批次、未写入会员账本。");
    } catch (cause) {
      const view = errorView(cause);
      setSubmitError(view);
      if (view.kind === "unknown-submit") setRecoverable({ idempotencyKey: intent, operationId: "preparePayout" });
    } finally {
      setPreparing(false);
    }
  }

  async function submitExecution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (executeIntent === null || preparation === null) return;
    setSubmitting(true);
    setSubmitError(null);
    setRecoverable(null);
    try {
      const accepted = await submitPayout({
        poolIssueId,
        preparationId: preparation.preparationId,
        confirmText: executeIntent.confirmText,
        idempotencyKey: executeIntent.idempotencyKey,
      });
      const id = resourceIdFromUrl(accepted.statusUrl);
      task.start(accepted);
      setExecuteIntent(null);
      setFeedback("发放任务已持久化受理；批次完成与实际逐笔入账仍需等待任务和对账结果。");
      if (id !== null) {
        setBatchIdInput(id);
        await loadBatch(id);
      }
    } catch (cause) {
      const view = errorView(cause);
      setSubmitError(view);
      if (view.kind === "unknown-submit") {
        setRecoverable({ idempotencyKey: executeIntent.idempotencyKey, operationId: "submitPayout" });
        setExecuteIntent(null);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRetry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (retryIntent === null || batch === null) return;
    setSubmitting(true);
    setSubmitError(null);
    setRecoverable(null);
    try {
      const accepted = await retryPayout({
        batch,
        reason: retryIntent.reason.trim(),
        idempotencyKey: retryIntent.idempotencyKey,
      });
      task.start(accepted);
      setRetryIntent(null);
      setFeedback("失败块恢复任务已受理；服务端仅处理原批次未完成义务，不会重发已入账项目。");
    } catch (cause) {
      const view = errorView(cause);
      setSubmitError(view);
      if (view.kind === "unknown-submit") {
        setRecoverable({ idempotencyKey: retryIntent.idempotencyKey, operationId: "retryPayout" });
        setRetryIntent(null);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function recoverCommand() {
    if (recoverable === null) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await getCommandResult(recoverable.idempotencyKey, recoverable.operationId);
      setCommandResult(result);
      setFeedback(`原命令查询结果：${result.status}。未创建新幂等键或重复提交。`);
      if (recoverable.operationId !== "preparePayout" && result.resourceId !== null && canViewPayout) {
        await loadBatch(result.resourceId);
      }
      if (result.taskId !== null && result.status === "PROCESSING") {
        setFeedback(`原命令仍在处理，任务号 ${result.taskId}；请继续查询原任务。`);
      }
    } catch (cause) {
      setSubmitError(errorView(cause));
    } finally {
      setSubmitting(false);
    }
  }

  if (session.status === "loading") return <PageState kind="loading" title="正在读取员工会话" description="确认发放权限与数据范围。" />;
  if (session.status === "anonymous") return <PageState kind="forbidden" title="员工会话已失效" description="请重新登录运营后台。" />;
  if (session.status === "error") return <PageState kind="error" title="员工会话不可用" description={`会话校验失败（${session.errorCode ?? "SESSION_UNAVAILABLE"}）。`} />;
  if (status === "loading") return <PageState kind="loading" title="正在读取发放中心" description="同步公示版本、预算与批次恢复信息。" />;
  if (status === "forbidden") return <PageState kind="forbidden" title="无期次查看权限" description="需要 ai-pool:view 权限与匹配的数据范围。" />;
  if (status === "error" || pool === null) return <ErrorState error={error ?? errorView(new Error("AI_PAYOUT_UNAVAILABLE"))} onRetry={() => void loadBase()} />;

  return (
    <div className={styles.stack}>
      <Breadcrumbs current="发放中心" poolIssueId={poolIssueId} />
      <PageHeader
        actions={<div className={styles.pageActions}><ChangeNotesButton module="aiManagement" /><Link className={styles.linkButton} href={`/ai-pools/${encodeURIComponent(poolIssueId)}/allocation`}>返回分配</Link>{canPrepareNow ? <ActionButton disabled={preparing} onClick={() => void createPreparation()} variant="primary">{preparing ? "准备中…" : "生成发放准备"}</ActionButton> : null}</div>}
        description="单个有权限的管理员确认后提交发放；任务受理、逐笔入账和批次对账分别呈现，不把 202 当作发放完成。"
        meta={<div className={styles.inlineActions}><PoolStatusBadge status={pool.pool.status} /><span>期次 {pool.pool.issueCode}</span><span>公示 {pool.pool.disclosureVersion ?? "未发布"}</span></div>}
        pageId="A16"
        title="AI中奖积分发放(修改)"
      />
      {feedback === null ? null : <InlineNotice tone="success" title="服务端状态">{feedback}</InlineNotice>}
      {error === null ? null : <InlineNotice tone="danger" title="批次读取失败">{error.message}</InlineNotice>}
      {submitError === null ? null : <InlineNotice tone={submitError.kind === "unknown-submit" ? "warning" : "danger"} title={submitError.kind === "unknown-submit" ? "提交结果未知" : "操作未完成"}>{submitError.message}{recoverable === null || !canRecover ? null : <span className={styles.inlineActions}><ActionButton disabled={submitting} onClick={() => void recoverCommand()} variant="quiet">查询原命令</ActionButton></span>}</InlineNotice>}
      <TaskReceipt accepted={task.accepted} error={task.error} status={task.status} />
      <MetricStrip items={[
        { label: "待发总额", value: preparation === null ? "待准备" : formatAiPoints(preparation.dueTotalPoints), detail: "准备单服务端汇总" },
        { label: "用户应发", value: preparation === null ? "待准备" : formatAiPoints(preparation.dueUserPoints), detail: "不含页面计算" },
        { label: "批次已入账", value: batch === null ? "—" : formatAiPoints(batch.postedPoints), detail: batch === null ? "尚未读取批次" : `${batch.completedItemCount}/${batch.totalItemCount} 项` },
        { label: "AI 预算可用", value: aiBudget === null ? "无权限 / 未返回" : formatAiPoints(aiBudget.availablePoints), detail: aiBudget === null ? "预算独立授权" : `已预留 ${formatAiPoints(aiBudget.reservedPoints)}` },
      ]} />

      <div className={styles.split}>
        <Panel actions={preparation?.eligible === true && canExecute ? <ActionButton onClick={() => { const key = recoverable?.operationId === "submitPayout" ? recoverable.idempotencyKey : newIntent("submitPayout"); setSubmitError(null); setExecuteIntent({ confirmText: "", idempotencyKey: key }); }} variant="primary">确认并发放</ActionButton> : undefined} description="准备单绑定已确认分配版本、公示版本、输入哈希和应发总额；无需第二人复核或 MFA。" title="发放准备">
          {preparation === null ? <div className={styles.emptyInline}>{canPrepareNow ? "点击“生成发放准备”读取权威应发汇总。" : "当前状态、已确认分配或公示版本尚不满足准备条件。"}</div> : <><DefinitionList><Definition label="准备单" value={<span className={styles.mono}>{preparation.preparationId}</span>} /><Definition label="是否可执行" value={preparation.eligible ? <StatusBadge label="可执行" status="READY" /> : <StatusBadge label="被阻塞" status="FAILED" />} /><Definition label="分配版本" value={preparation.allocationVersion} /><Definition label="公示版本" value={preparation.disclosureVersion} /><Definition label="应发总额" value={formatAiPoints(preparation.dueTotalPoints)} /><Definition label="用户应发" value={formatAiPoints(preparation.dueUserPoints)} /><Definition label="平台回流" value={formatAiPoints(subtractAiPoints(preparation.dueTotalPoints, preparation.dueUserPoints))} /><Definition label="输入版本集" value={<span className={styles.mono}>{shortHash(preparation.expectedInputVersionSetHash)}</span>} /><Definition label="失效时间" value={formatDateTime(preparation.expiresAt)} /></DefinitionList>{preparation.blockingCodes.length === 0 ? null : <InlineNotice tone="warning" title="阻塞代码">{preparation.blockingCodes.join(" / ")}</InlineNotice>}</>}
        </Panel>
        <Panel description="契约未提供按期次枚举批次接口；可粘贴已知批次 ID，任务受理后页面会自动带入。" title="批次定位">
          {canViewPayout ? <form className={styles.inlineActions} onSubmit={(event) => { event.preventDefault(); void loadBatch(batchIdInput); }}><label className={styles.field} data-grow="true"><span>批次 ID</span><input maxLength={128} onChange={(event) => setBatchIdInput(event.target.value)} placeholder="任务回执中的资源 ID" required value={batchIdInput} /></label><ActionButton type="submit">读取批次</ActionButton></form> : <PageState kind="forbidden" title="无批次查看权限" description="需要 ai-payout:view 权限。" />}
          {commandResult === null ? null : <DefinitionList><Definition label="原操作" value={commandResult.operationId} /><Definition label="命令状态" value={commandResult.status} /><Definition label="HTTP 状态" value={String(commandResult.httpStatus)} /><Definition label="失败代码" value={commandResult.failureCode ?? "—"} /></DefinitionList>}
        </Panel>
      </div>

      {canViewBudget ? <Panel description="预算账户与会员应发义务分离；可用、预留均为服务端账本事实。" flush title="预算账户">{budgets.length === 0 ? <div className={styles.emptyInline}>服务端未返回预算账户。</div> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>预算类型</th><th>可用积分</th><th>已预留</th><th>版本</th><th>账户 ID</th></tr></thead><tbody>{budgets.map((budget) => <tr key={budget.id}><td><strong>{budgetTypeLabel(budget.type)}</strong></td><td>{formatAiPoints(budget.availablePoints)}</td><td>{formatAiPoints(budget.reservedPoints)}</td><td>{budget.version}</td><td><span className={styles.mono}>{budget.id}</span></td></tr>)}</tbody></table></div>}</Panel> : null}

      <Panel actions={batch !== null && canRetry && ["PAUSED", "FAILED"].includes(batch.status) ? <ActionButton onClick={() => { const key = recoverable?.operationId === "retryPayout" ? recoverable.idempotencyKey : newIntent("retryPayout"); setSubmitError(null); setRetryIntent({ reason: "", idempotencyKey: key }); }} variant="primary">恢复失败块</ActionButton> : undefined} description="批次状态与金额均来自账本作业和对账结果；差额非零不能标记完成。" title="发放批次">
        {batch === null ? <div className={styles.emptyInline}>尚未读取发放批次。</div> : <><DefinitionList><Definition label="批次 ID" value={<span className={styles.mono}>{batch.id}</span>} /><Definition label="状态" value={<StatusBadge label={payoutStatusLabel(batch.status)} status={batch.status} />} /><Definition label="应发积分" value={formatAiPoints(batch.expectedPoints)} /><Definition label="已入账" value={formatAiPoints(batch.postedPoints)} /><Definition label="待处理" value={formatAiPoints(batch.pendingPoints)} /><Definition label="对账差额" value={formatAiPoints(batch.differencePoints)} /><Definition label="完成进度" value={`${batch.completedItemCount} / ${batch.totalItemCount}`} /><Definition label="更新时间" value={formatDateTime(batch.updatedAt)} /></DefinitionList>{batch.status === "COMPLETED" && batch.differencePoints === "0.00" ? <InlineNotice tone="success" title="批次已完成并平账">全部应发义务已处理，对账差额为零。</InlineNotice> : <InlineNotice tone="warning" title="仍在处理或需恢复">受理与部分入账不等于整批完成；仅恢复失败块，不重发成功项目。</InlineNotice>}</>}
      </Panel>

      <Panel description="受益方已脱敏；交易号为空表示该项目尚未完成账本入账。" flush title="逐笔发放明细">
        {items.length === 0 ? <div className={styles.emptyInline}>暂无可展示的批次项目。</div> : <><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>受益方</th><th>应发积分</th><th>已入账</th><th>状态</th><th>账本交易</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.maskedBeneficiary}</strong><small className={styles.cellMeta}>{item.id}</small></td><td>{formatAiPoints(item.duePoints)}</td><td>{formatAiPoints(item.postedPoints)}</td><td><StatusBadge label={payoutItemStatusLabel(item.status)} status={item.status} /></td><td>{item.transactionId === null ? "—" : <span className={styles.mono}>{item.transactionId}</span>}</td></tr>)}</tbody></table></div>{itemsHaveMore ? <div className={styles.summaryBar}><span>已加载 {items.length} / {batch?.totalItemCount ?? "—"} 条。</span><ActionButton disabled={itemsLoadingMore} onClick={() => void loadMoreItems()}>{itemsLoadingMore ? "加载中…" : "加载更多"}</ActionButton></div> : null}</>}
      </Panel>

      <Dialog footer={<div className={styles.dialogActions}><ActionButton disabled={submitting} onClick={() => setExecuteIntent(null)}>取消</ActionButton><ActionButton disabled={submitting || executeIntent === null || executeIntent.confirmText !== "确认发放"} form="execute-payout-form" type="submit" variant="danger">{submitting ? "受理中…" : "确认并提交"}</ActionButton></div>} onClose={() => setExecuteIntent(null)} open={executeIntent !== null} title="确认预留预算并发放" description={`单个有权限的管理员输入“确认发放”即可提交。应发总额 ${formatAiPoints(preparation?.dueTotalPoints ?? null)}，其中会员到账 ${formatAiPoints(preparation?.dueUserPoints ?? null)}、平台回流 ${formatAiPoints(subtractAiPoints(preparation?.dueTotalPoints ?? null, preparation?.dueUserPoints ?? null))}。`}>{executeIntent === null ? null : <form className={styles.formGrid} id="execute-payout-form" onSubmit={submitExecution}><label className={`${styles.field} ${styles.span2}`}><span>确认文字</span><input autoComplete="off" onChange={(event) => setExecuteIntent({ ...executeIntent, confirmText: event.target.value })} placeholder="确认发放" required value={executeIntent.confirmText} /></label><div className={styles.span2}><InlineNotice tone="warning" title="确认边界">服务端仍会绑定本期次、输入版本集、应发总额和幂等键；无需第二人复核或 MFA。</InlineNotice></div>{submitError === null ? null : <div className={styles.span2}><InlineNotice tone="danger">{submitError.message}</InlineNotice></div>}</form>}</Dialog>
      <Dialog footer={<div className={styles.dialogActions}><ActionButton disabled={submitting} onClick={() => setRetryIntent(null)}>取消</ActionButton><ActionButton disabled={submitting || retryIntent === null || retryIntent.reason.trim().length < 2} form="retry-payout-form" type="submit" variant="primary">{submitting ? "受理中…" : "确认恢复"}</ActionButton></div>} onClose={() => setRetryIntent(null)} open={retryIntent !== null} title="恢复原批次失败块" description={`仅恢复待处理 ${formatAiPoints(batch?.pendingPoints ?? null)}，不会创建全额重发；无需第二人复核或 MFA。`}>{retryIntent === null ? null : <form className={styles.formGrid} id="retry-payout-form" onSubmit={submitRetry}><label className={`${styles.field} ${styles.span2}`}><span>恢复原因</span><textarea maxLength={500} minLength={2} onChange={(event) => setRetryIntent({ ...retryIntent, reason: event.target.value })} required value={retryIntent.reason} /></label>{submitError === null ? null : <div className={styles.span2}><InlineNotice tone="danger">{submitError.message}</InlineNotice></div>}</form>}</Dialog>
    </div>
  );
}

function resourceIdFromUrl(value: string): string | null {
  const [path = ""] = value.split("?", 1);
  const parts = path.split("/").filter(Boolean);
  const id = parts.at(-1);
  return id === undefined || id === "payout-batches" ? null : decodeURIComponent(id);
}

function payoutStatusLabel(status: PayoutBatch["status"]): string {
  return { PENDING: "待执行", RUNNING: "发放中", PAUSED: "已暂停", FAILED: "失败", RECONCILING: "对账中", COMPLETED: "已完成" }[status];
}

function payoutItemStatusLabel(status: PayoutItem["status"]): string {
  return { PENDING: "待入账", POSTED: "已入账", FAILED: "失败" }[status];
}

function budgetTypeLabel(type: BudgetAccount["type"]): string {
  return { DISTRIBUTION_BUDGET: "平台分配预算", ORDINARY_AWARD_BUDGET: "普通返奖预算", AI_BUDGET: "AI 合买预算", REFERRAL_BUDGET: "推广奖励预算" }[type];
}
