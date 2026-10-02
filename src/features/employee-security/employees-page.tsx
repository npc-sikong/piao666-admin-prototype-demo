"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActionButton,
  Dialog,
  InlineNotice,
  PageHeader,
  Panel,
  StatusBadge,
  Tabs,
} from "@/components/admin-workspace/admin-workspace";
import { PageState } from "@/components/page-state/page-state";
import { useAdminSession } from "@/session/admin-session";
import {
  changeEmployeeStatus,
  createEmployee,
  employeeFailure,
  listAudits,
  listEmployees,
  listRoles,
  newClientIntentId,
  newEmployeeIntent,
  recoverEmployeeAccount,
  uploadEmployeeRecoveryEvidence,
  updateEmployeePermissions,
  type EmployeeFailureKind,
} from "./employee-api";
import type { AuditView, CursorPage, Employee, Role } from "./employee-models";
import styles from "./employee-security.module.css";

type SecurityTab = "employees" | "roles" | "audits";

interface CreateDraft {
  clientIntentId: string;
  idempotencyKey: string;
  account: string;
  password: string;
  name: string;
  roleIds: readonly string[];
  stationIds: string;
  reason: string;
  proofCode: string;
}

interface PermissionDraft {
  employee: Employee;
  idempotencyKey: string;
  roleIds: readonly string[];
  stationIds: string;
  reason: string;
  proofCode: string;
}

interface StatusDraft {
  employee: Employee;
  idempotencyKey: string;
  targetStatus: "ENABLED" | "DISABLED";
  reason: string;
}

interface RecoveryDraft {
  employee: Employee;
  idempotencyKey: string;
  uploadKeys: Readonly<{ prepare: string; commit: string }>;
  file: File | null;
  evidenceId: string | null;
  newPassword: string;
  confirmPassword: string;
  reason: string;
  proofCode: string;
}

interface AuditFilters {
  actorId: string;
  resourceId: string;
  from: string;
  to: string;
}

export function EmployeesPage() {
  const session = useAdminSession();
  const permissions = session.identity?.permissions ?? [];
  const canViewEmployees = permissions.includes("employee:view");
  const canCreate = permissions.includes("employee:create") && permissions.includes("action:authorize");
  const canEdit = permissions.includes("employee:permission:write") && permissions.includes("action:authorize");
  const canChangeStatus = permissions.includes("employee:status");
  const canRecover = permissions.includes("employee:recover")
    && permissions.includes("action:authorize")
    && permissions.includes("evidence:write");
  const canViewAudits = permissions.includes("audit:view");
  const [tab, setTab] = useState<SecurityTab>("employees");
  const [employees, setEmployees] = useState<CursorPage<Employee> | null>(null);
  const [roles, setRoles] = useState<CursorPage<Role> | null>(null);
  const [employeeState, setEmployeeState] = useState<"idle" | "loading" | "ready" | EmployeeFailureKind>("idle");
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const auditDefaults = useMemo(() => defaultAuditFilters(), []);
  const [auditDraft, setAuditDraft] = useState<AuditFilters>(auditDefaults);
  const [auditFilters, setAuditFilters] = useState<AuditFilters>(auditDefaults);
  const [audits, setAudits] = useState<CursorPage<AuditView> | null>(null);
  const [auditState, setAuditState] = useState<"idle" | "loading" | "ready" | EmployeeFailureKind>("idle");
  const [auditError, setAuditError] = useState<string | null>(null);
  const [createDraft, setCreateDraft] = useState<CreateDraft | null>(null);
  const [permissionDraft, setPermissionDraft] = useState<PermissionDraft | null>(null);
  const [statusDraft, setStatusDraft] = useState<StatusDraft | null>(null);
  const [recoveryDraft, setRecoveryDraft] = useState<RecoveryDraft | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutationNotice, setMutationNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadEmployees = useCallback(async (cursor?: string) => {
    if (!canViewEmployees) {
      setEmployeeState("forbidden");
      return;
    }
    setEmployeeState("loading");
    setEmployeeError(null);
    try {
      const [employeePage, rolePage] = await Promise.all([
        listEmployees(cursor),
        cursor === undefined ? listRoles() : Promise.resolve(null),
      ]);
      setEmployees(employeePage);
      if (rolePage !== null) {
        setRoles(rolePage);
      }
      setEmployeeState("ready");
    } catch (cause) {
      const failure = employeeFailure(cause);
      setEmployeeError(failure.message);
      setEmployeeState(failure.kind);
    }
  }, [canViewEmployees]);

  const loadAudits = useCallback(async (cursor?: string) => {
    if (!canViewAudits) {
      setAuditState("forbidden");
      return;
    }
    setAuditState("loading");
    setAuditError(null);
    try {
      setAudits(await listAudits({
        actorId: auditFilters.actorId || undefined,
        resourceId: auditFilters.resourceId || undefined,
        from: auditFilters.from ? `${auditFilters.from}T00:00:00+08:00` : undefined,
        to: auditFilters.to ? nextShanghaiDay(auditFilters.to) : undefined,
        cursor,
      }));
      setAuditState("ready");
    } catch (cause) {
      const failure = employeeFailure(cause);
      setAuditError(failure.message);
      setAuditState(failure.kind);
    }
  }, [auditFilters, canViewAudits]);

  useEffect(() => {
    if (session.status === "authenticated") {
      void loadEmployees();
      void loadAudits();
    }
  }, [loadAudits, loadEmployees, session.status]);

  function openCreate() {
    setMutationError(null);
    setCreateDraft({
      clientIntentId: newClientIntentId(),
      idempotencyKey: newEmployeeIntent("createEmployee"),
      account: "",
      password: "",
      name: "",
      roleIds: [],
      stationIds: "",
      reason: "",
      proofCode: "",
    });
  }

  function openPermissions(employee: Employee) {
    setMutationError(null);
    setPermissionDraft({
      employee,
      idempotencyKey: newEmployeeIntent("updateEmployeePermissions"),
      roleIds: employee.roleIds,
      stationIds: employee.scopeStationIds.join("\n"),
      reason: "",
      proofCode: "",
    });
  }

  function openStatus(employee: Employee) {
    setMutationError(null);
    setStatusDraft({
      employee,
      idempotencyKey: newEmployeeIntent("changeEmployeeStatus"),
      targetStatus: employee.status === "ENABLED" ? "DISABLED" : "ENABLED",
      reason: "",
    });
  }

  function openRecovery(employee: Employee) {
    setMutationError(null);
    setRecoveryDraft({
      employee,
      idempotencyKey: newEmployeeIntent("recoverEmployeeAccount"),
      uploadKeys: {
        prepare: newEmployeeIntent("prepareAdminUpload"),
        commit: newEmployeeIntent("commitAdminUpload"),
      },
      file: null,
      evidenceId: null,
      newPassword: "",
      confirmPassword: "",
      reason: "",
      proofCode: "",
    });
  }

  async function submitCreate() {
    if (createDraft === null) return;
    const stations = identifiers(createDraft.stationIds);
    if (!/^[A-Za-z0-9_-]{4,32}$/.test(createDraft.account) || !/^(?=.*[A-Za-z])(?=.*[0-9]).{8,20}$/.test(createDraft.password) || createDraft.name.trim() === "" || createDraft.reason.trim().length < 2 || !/^\d{6}$/.test(createDraft.proofCode)) {
      setMutationError("请完整填写账号、8—20 位字母数字密码、姓名、原因和 6 位 MFA 动态码。");
      return;
    }
    setSubmitting(true);
    setMutationError(null);
    try {
      const created = await createEmployee({
        clientIntentId: createDraft.clientIntentId,
        account: createDraft.account,
        initialPassword: createDraft.password,
        name: createDraft.name.trim(),
        roleIds: createDraft.roleIds,
        scopeStationIds: stations,
        reason: createDraft.reason.trim(),
        proofCode: createDraft.proofCode,
        idempotencyKey: createDraft.idempotencyKey,
      });
      setCreateDraft(null);
      setMutationNotice(`员工 ${created.account} 已由服务端创建；权限范围以返回版本 ${created.version} 为准。`);
      await loadEmployees();
    } catch (cause) {
      setMutationError(employeeFailure(cause).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitPermissions() {
    if (permissionDraft === null) return;
    if (permissionDraft.reason.trim().length < 2 || !/^\d{6}$/.test(permissionDraft.proofCode)) {
      setMutationError("请填写变更原因并输入 6 位 MFA 动态码。");
      return;
    }
    setSubmitting(true);
    setMutationError(null);
    try {
      const updated = await updateEmployeePermissions({
        employee: permissionDraft.employee,
        roleIds: permissionDraft.roleIds,
        scopeStationIds: identifiers(permissionDraft.stationIds),
        reason: permissionDraft.reason.trim(),
        proofCode: permissionDraft.proofCode,
        idempotencyKey: permissionDraft.idempotencyKey,
      });
      setPermissionDraft(null);
      setMutationNotice(`员工 ${updated.account} 的权限已更新，旧会话由服务端失效。`);
      await loadEmployees();
    } catch (cause) {
      setMutationError(employeeFailure(cause).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitStatus() {
    if (statusDraft === null) return;
    if (statusDraft.reason.trim().length < 2) {
      setMutationError("请填写至少 2 个字符的状态变更原因。");
      return;
    }
    setSubmitting(true);
    setMutationError(null);
    try {
      const updated = await changeEmployeeStatus({
        employee: statusDraft.employee,
        status: statusDraft.targetStatus,
        reason: statusDraft.reason.trim(),
        idempotencyKey: statusDraft.idempotencyKey,
      });
      setStatusDraft(null);
      setMutationNotice(`员工 ${updated.account} 已${updated.status === "ENABLED" ? "启用" : "停用"}，旧会话由服务端失效。`);
      await loadEmployees();
    } catch (cause) {
      setMutationError(employeeFailure(cause).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRecovery() {
    if (recoveryDraft === null) return;
    if (!/^(?=.*[A-Za-z])(?=.*[0-9]).{8,20}$/.test(recoveryDraft.newPassword)) {
      setMutationError("新密码须为 8—20 位，并同时包含字母和数字。");
      return;
    }
    if (recoveryDraft.newPassword !== recoveryDraft.confirmPassword) {
      setMutationError("两次输入的新密码不一致。");
      return;
    }
    if (recoveryDraft.evidenceId === null && recoveryDraft.file === null) {
      setMutationError("请选择 PNG、JPEG、WebP 或 PDF 恢复证据。");
      return;
    }
    if (recoveryDraft.reason.trim().length < 2 || !/^\d{6}$/.test(recoveryDraft.proofCode)) {
      setMutationError("请填写恢复原因并输入 6 位 MFA 动态码。");
      return;
    }
    setSubmitting(true);
    setMutationError(null);
    try {
      let evidenceId = recoveryDraft.evidenceId;
      if (evidenceId === null) {
        const evidence = await uploadEmployeeRecoveryEvidence(
          recoveryDraft.file as File,
          recoveryDraft.uploadKeys,
        );
        evidenceId = evidence.id;
        setRecoveryDraft((current) => current === null ? null : ({ ...current, evidenceId }));
      }
      const updated = await recoverEmployeeAccount({
        employee: recoveryDraft.employee,
        newPassword: recoveryDraft.newPassword,
        evidenceId,
        reason: recoveryDraft.reason.trim(),
        proofCode: recoveryDraft.proofCode,
        idempotencyKey: recoveryDraft.idempotencyKey,
      });
      setRecoveryDraft(null);
      setMutationNotice(`员工 ${updated.account} 的登录凭据已恢复；旧 MFA 与会话已失效，下次登录需重新绑定 MFA。账号启停状态未改变。`);
      await loadEmployees();
    } catch (cause) {
      setMutationError(
        cause instanceof Error && cause.message.startsWith("EVIDENCE_UPLOAD_FAILED_")
          ? "恢复证据上传失败，账号恢复尚未提交。"
          : employeeFailure(cause).message,
      );
    } finally {
      setSubmitting(false);
    }
  }

  const availableTabs = useMemo(() => [
    ...(canViewEmployees ? [{ id: "employees" as const, label: "员工账号", count: employees?.items.length }] : []),
    ...(canViewEmployees ? [{ id: "roles" as const, label: "角色与权限", count: roles?.items.length }] : []),
    ...(canViewAudits ? [{ id: "audits" as const, label: "审计记录", count: audits?.items.length }] : []),
  ], [audits?.items.length, canViewAudits, canViewEmployees, employees?.items.length, roles?.items.length]);

  useEffect(() => {
    if (!availableTabs.some((item) => item.id === tab) && availableTabs[0] !== undefined) {
      setTab(availableTabs[0].id);
    }
  }, [availableTabs, tab]);

  if (session.status === "authenticated" && availableTabs.length === 0) {
    return <PageState description="当前员工没有员工管理或审计查看权限。" kind="forbidden" />;
  }

  return (
    <>
      <PageHeader
        actions={<ActionButton disabled={!canCreate} onClick={openCreate} variant="primary">创建员工</ActionButton>}
        description="管理员工角色、站点范围和受控账号恢复，并只读查询敏感操作审计。权限结论始终由服务端重新裁决。"
        pageId="A24"
        title="员工权限、审计与账号恢复"
      />

      <InlineNotice title="受控账号恢复">
        账号恢复需要专门权限、本人 MFA、私有证据和目标员工最新版本。成功后重设登录密码、清除旧 MFA 并撤销旧会话，不会自动启用已停用账号或修改其角色范围。
      </InlineNotice>
      {mutationNotice === null ? null : <InlineNotice title="服务端已确认" tone="success">{mutationNotice}</InlineNotice>}

      <Panel flush title="员工安全工作区">
        {availableTabs.length === 0 ? null : <Tabs<SecurityTab> items={availableTabs} label="员工安全视图" onChange={setTab} value={tab} />}
        <div className={styles.workspaceBody}>
          {tab === "employees" ? (
            <EmployeeTab
              canChangeStatus={canChangeStatus}
              canEdit={canEdit}
              canRecover={canRecover}
              error={employeeError}
              onLoad={loadEmployees}
              onPermissions={openPermissions}
              onRecovery={openRecovery}
              onStatus={openStatus}
              page={employees}
              roles={roles?.items ?? []}
              state={employeeState}
            />
          ) : null}
          {tab === "roles" ? <RolesTab error={employeeError} page={roles} state={employeeState} /> : null}
          {tab === "audits" ? (
            <AuditsTab
              draft={auditDraft}
              error={auditError}
              filters={auditFilters}
              onApply={() => setAuditFilters({ ...auditDraft, actorId: auditDraft.actorId.trim(), resourceId: auditDraft.resourceId.trim() })}
              onChange={setAuditDraft}
              onLoad={loadAudits}
              page={audits}
              state={auditState}
            />
          ) : null}
        </div>
      </Panel>

      <CreateEmployeeDialog draft={createDraft} error={mutationError} onChange={setCreateDraft} onClose={() => { if (!submitting) setCreateDraft(null); }} onSubmit={() => void submitCreate()} roles={roles?.items ?? []} submitting={submitting} />
      <PermissionDialog draft={permissionDraft} error={mutationError} onChange={setPermissionDraft} onClose={() => { if (!submitting) setPermissionDraft(null); }} onSubmit={() => void submitPermissions()} roles={roles?.items ?? []} submitting={submitting} />
      <StatusDialog draft={statusDraft} error={mutationError} onChange={setStatusDraft} onClose={() => { if (!submitting) setStatusDraft(null); }} onSubmit={() => void submitStatus()} submitting={submitting} />
      <RecoveryDialog draft={recoveryDraft} error={mutationError} onChange={setRecoveryDraft} onClose={() => { if (!submitting) setRecoveryDraft(null); }} onSubmit={() => void submitRecovery()} submitting={submitting} />
    </>
  );
}

function EmployeeTab({ state, error, page, roles, canEdit, canChangeStatus, canRecover, onLoad, onPermissions, onStatus, onRecovery }: Readonly<{ state: "idle" | "loading" | "ready" | EmployeeFailureKind; error: string | null; page: CursorPage<Employee> | null; roles: readonly Role[]; canEdit: boolean; canChangeStatus: boolean; canRecover: boolean; onLoad(cursor?: string): Promise<void>; onPermissions(employee: Employee): void; onStatus(employee: Employee): void; onRecovery(employee: Employee): void }>) {
  if (state === "loading" || state === "idle") return <PageState kind="loading" title="正在读取员工账号" />;
  if (state === "forbidden") return <PageState description={error ?? "当前员工没有员工管理查看权限。"} kind="forbidden" />;
  if (state === "not-ready") return <PageState description={error ?? undefined} kind="not-ready" />;
  if (state === "version" || state === "error") return <PageState action={<ActionButton onClick={() => void onLoad()}>重新加载</ActionButton>} description={error ?? undefined} kind="error" title={state === "version" ? "员工版本已失效" : undefined} />;
  if (page === null || page.items.length === 0) return <PageState kind="empty" title="没有员工账号" />;
  const roleNames = new Map(roles.map((role) => [role.id, role.name]));
  return <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>员工</th><th>状态</th><th>角色</th><th>站点范围</th><th>版本</th><th>操作</th></tr></thead><tbody>{page.items.map((employee) => <tr key={employee.id}><td><div className={styles.entity}><strong>{employee.name}</strong><small>{employee.account} · {employee.id}</small></div></td><td><StatusBadge label={employee.status === "ENABLED" ? "已启用" : "已停用"} status={employee.status} /></td><td>{employee.roleIds.length === 0 ? "未分配" : employee.roleIds.map((id) => roleNames.get(id) ?? id).join("、")}</td><td>{employee.scopeStationIds.length === 0 ? "全局或无站点范围" : `${employee.scopeStationIds.length} 个站点`}</td><td>{employee.version}</td><td><div className={styles.rowActions}><button className={styles.textButton} disabled={!canEdit} onClick={() => onPermissions(employee)} type="button">权限范围</button><button className={styles.textButton} disabled={!canRecover} onClick={() => onRecovery(employee)} type="button">账号恢复</button><button className={styles.textButton} disabled={!canChangeStatus} onClick={() => onStatus(employee)} type="button">{employee.status === "ENABLED" ? "停用" : "启用"}</button></div></td></tr>)}</tbody></table><div className={styles.pagination}><span>{page.hasMore ? "还有下一页" : "已到员工列表末页"}</span><ActionButton disabled={!page.hasMore || page.nextCursor === null} onClick={() => void onLoad(page.nextCursor ?? undefined)}>下一页</ActionButton></div></div>;
}

function RolesTab({ state, error, page }: Readonly<{ state: "idle" | "loading" | "ready" | EmployeeFailureKind; error: string | null; page: CursorPage<Role> | null }>) {
  if (state === "loading" || state === "idle") return <PageState kind="loading" title="正在读取角色" />;
  if (state === "forbidden") return <PageState description={error ?? undefined} kind="forbidden" />;
  if (state !== "ready") return <PageState description={error ?? undefined} kind={state === "not-ready" ? "not-ready" : "error"} />;
  if (page === null || page.items.length === 0) return <PageState kind="empty" title="没有预定义角色" />;
  return <div className={styles.roleList}>{page.items.map((role) => <section key={role.id}><header><strong>{role.name}</strong><code>{role.id}</code></header><div>{role.permissions.map((permission) => <span key={permission}>{permission}</span>)}</div></section>)}</div>;
}

function AuditsTab({ state, error, page, draft, filters, onChange, onApply, onLoad }: Readonly<{ state: "idle" | "loading" | "ready" | EmployeeFailureKind; error: string | null; page: CursorPage<AuditView> | null; draft: AuditFilters; filters: AuditFilters; onChange(value: AuditFilters): void; onApply(): void; onLoad(cursor?: string): Promise<void> }>) {
  return <><form className={styles.filterBar} onSubmit={(event) => { event.preventDefault(); onApply(); }}><Field label="员工 ID"><input onChange={(event) => onChange({ ...draft, actorId: event.target.value })} value={draft.actorId} /></Field><Field label="资源 ID"><input onChange={(event) => onChange({ ...draft, resourceId: event.target.value })} value={draft.resourceId} /></Field><Field label="开始日期"><input onChange={(event) => onChange({ ...draft, from: event.target.value })} type="date" value={draft.from} /></Field><Field label="结束日期（含）"><input onChange={(event) => onChange({ ...draft, to: event.target.value })} type="date" value={draft.to} /></Field><ActionButton type="submit" variant="primary">查询审计</ActionButton><ActionButton onClick={() => void onLoad()}>刷新</ActionButton></form>{state === "loading" || state === "idle" ? <PageState kind="loading" title="正在读取审计记录" /> : null}{state === "forbidden" ? <PageState description={error ?? "当前员工没有审计查看权限。"} kind="forbidden" /> : null}{state === "not-ready" ? <PageState description={error ?? undefined} kind="not-ready" /> : null}{state === "version" || state === "error" ? <PageState action={<ActionButton onClick={() => void onLoad()}>重试</ActionButton>} description={error ?? undefined} kind="error" /> : null}{state === "ready" && page !== null ? page.items.length === 0 ? <PageState kind="empty" title="当前筛选没有审计记录" /> : <div className={styles.tableWrap}><table className={styles.table} data-wide="true"><thead><tr><th>时间 / 员工</th><th>操作</th><th>目标资源</th><th>版本</th><th>结果</th><th>原因</th><th>请求追踪</th></tr></thead><tbody>{page.items.map((audit) => <tr key={audit.id}><td><div className={styles.entity}><strong>{formatDateTime(audit.createdAt)}</strong><small>{audit.actorId}</small></div></td><td>{audit.operationId}</td><td><code>{audit.resourceId}</code></td><td>{audit.beforeVersion ?? "—"} → {audit.afterVersion ?? "—"}</td><td><StatusBadge label={audit.resultCode} status={audit.resultCode} /></td><td>{audit.reason || "—"}</td><td><code>{audit.traceId}</code></td></tr>)}</tbody></table><div className={styles.pagination}><span>当前筛选：{filters.from} 至 {filters.to}</span><ActionButton disabled={!page.hasMore || page.nextCursor === null} onClick={() => void onLoad(page.nextCursor ?? undefined)}>下一页</ActionButton></div></div> : null}</>;
}

function CreateEmployeeDialog({ draft, roles, submitting, error, onChange, onClose, onSubmit }: Readonly<{ draft: CreateDraft | null; roles: readonly Role[]; submitting: boolean; error: string | null; onChange(value: CreateDraft | null): void; onClose(): void; onSubmit(): void }>) {
  if (draft === null) return null;
  return <Dialog description="创建意图、请求幂等键和 MFA 动作凭据将绑定同一份规范化输入；修改关键字段后需重新授权。" footer={<><ActionButton disabled={submitting} onClick={onClose}>取消</ActionButton><ActionButton disabled={submitting} onClick={onSubmit} variant="primary">{submitting ? "创建中" : "授权并创建"}</ActionButton></>} onClose={onClose} open title="创建员工账号" width="wide"><div className={styles.formGrid}><Field label="员工账号"><input autoComplete="off" onChange={(event) => onChange({ ...draft, account: event.target.value })} value={draft.account} /></Field><Field label="员工姓名"><input onChange={(event) => onChange({ ...draft, name: event.target.value })} value={draft.name} /></Field><Field label="初始密码"><input autoComplete="new-password" onChange={(event) => onChange({ ...draft, password: event.target.value })} type="password" value={draft.password} /></Field><Field label="MFA 动态码"><input autoComplete="one-time-code" inputMode="numeric" maxLength={6} onChange={(event) => onChange({ ...draft, proofCode: event.target.value.replace(/\D/g, "") })} value={draft.proofCode} /></Field><RolePicker onChange={(roleIds) => onChange({ ...draft, roleIds })} roles={roles} selected={draft.roleIds} /><Field label="站点范围 ID（每行或逗号分隔；留空由服务端解释为全局或无范围）" wide><textarea onChange={(event) => onChange({ ...draft, stationIds: event.target.value })} value={draft.stationIds} /></Field><Field label="创建原因" wide><textarea maxLength={500} onChange={(event) => onChange({ ...draft, reason: event.target.value })} value={draft.reason} /></Field>{error === null ? null : <p className={styles.feedback} role="alert">{error}</p>}</div></Dialog>;
}

function PermissionDialog({ draft, roles, submitting, error, onChange, onClose, onSubmit }: Readonly<{ draft: PermissionDraft | null; roles: readonly Role[]; submitting: boolean; error: string | null; onChange(value: PermissionDraft | null): void; onClose(): void; onSubmit(): void }>) {
  if (draft === null) return null;
  return <Dialog description={`员工 ${draft.employee.account} · 当前版本 ${draft.employee.version}。保存时使用强 ETag，冲突不会覆盖他人修改。`} footer={<><ActionButton disabled={submitting} onClick={onClose}>取消</ActionButton><ActionButton disabled={submitting} onClick={onSubmit} variant="primary">{submitting ? "保存中" : "授权并保存"}</ActionButton></>} onClose={onClose} open title="更新员工权限与范围" width="wide"><div className={styles.formGrid}><RolePicker onChange={(roleIds) => onChange({ ...draft, roleIds })} roles={roles} selected={draft.roleIds} /><Field label="站点范围 ID（每行或逗号分隔）" wide><textarea onChange={(event) => onChange({ ...draft, stationIds: event.target.value })} value={draft.stationIds} /></Field><Field label="变更原因" wide><textarea maxLength={500} onChange={(event) => onChange({ ...draft, reason: event.target.value })} value={draft.reason} /></Field><Field label="MFA 动态码"><input autoComplete="one-time-code" inputMode="numeric" maxLength={6} onChange={(event) => onChange({ ...draft, proofCode: event.target.value.replace(/\D/g, "") })} value={draft.proofCode} /></Field>{error === null ? null : <p className={styles.feedback} role="alert">{error}</p>}</div></Dialog>;
}

function StatusDialog({ draft, submitting, error, onChange, onClose, onSubmit }: Readonly<{ draft: StatusDraft | null; submitting: boolean; error: string | null; onChange(value: StatusDraft | null): void; onClose(): void; onSubmit(): void }>) {
  if (draft === null) return null;
  return <Dialog description={`${draft.targetStatus === "DISABLED" ? "停用" : "启用"} ${draft.employee.account} 后，服务端会撤销该员工现有会话。`} footer={<><ActionButton disabled={submitting} onClick={onClose}>取消</ActionButton><ActionButton disabled={submitting} onClick={onSubmit} variant={draft.targetStatus === "DISABLED" ? "danger" : "primary"}>{submitting ? "提交中" : `确认${draft.targetStatus === "DISABLED" ? "停用" : "启用"}`}</ActionButton></>} onClose={onClose} open title="变更员工状态"><Field label="状态变更原因"><textarea maxLength={500} onChange={(event) => onChange({ ...draft, reason: event.target.value })} value={draft.reason} /></Field>{error === null ? null : <p className={styles.feedback} role="alert">{error}</p>}</Dialog>;
}

function RecoveryDialog({ draft, submitting, error, onChange, onClose, onSubmit }: Readonly<{ draft: RecoveryDraft | null; submitting: boolean; error: string | null; onChange(value: RecoveryDraft | null): void; onClose(): void; onSubmit(): void }>) {
  if (draft === null) return null;
  return <Dialog description={`恢复员工 ${draft.employee.account} · 当前版本 ${draft.employee.version}。服务端成功后会撤销全部旧会话并要求重新绑定 MFA，但不会改变账号状态或权限。`} footer={<><ActionButton disabled={submitting} onClick={onClose}>取消</ActionButton><ActionButton disabled={submitting} onClick={onSubmit} variant="danger">{submitting ? "恢复中" : "授权并恢复"}</ActionButton></>} onClose={onClose} open title="受控员工账号恢复" width="wide"><div className={styles.formGrid}><Field label="新登录密码"><input autoComplete="new-password" onChange={(event) => onChange({ ...draft, newPassword: event.target.value })} type="password" value={draft.newPassword} /></Field><Field label="确认新登录密码"><input autoComplete="new-password" onChange={(event) => onChange({ ...draft, confirmPassword: event.target.value })} type="password" value={draft.confirmPassword} /></Field><Field label="恢复证据（PNG、JPEG、WebP 或 PDF）" wide><input accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(event) => onChange({ ...draft, file: event.target.files?.[0] ?? null, evidenceId: null, uploadKeys: { prepare: newEmployeeIntent("prepareAdminUpload"), commit: newEmployeeIntent("commitAdminUpload") } })} type="file" />{draft.evidenceId === null ? null : <small>证据已提交：{draft.evidenceId}</small>}</Field><Field label="恢复原因" wide><textarea maxLength={500} onChange={(event) => onChange({ ...draft, reason: event.target.value })} value={draft.reason} /></Field><Field label="审批员工 MFA 动态码"><input autoComplete="one-time-code" inputMode="numeric" maxLength={6} onChange={(event) => onChange({ ...draft, proofCode: event.target.value.replace(/\D/g, "") })} value={draft.proofCode} /></Field><div className={styles.recoveryBoundary}><InlineNotice tone="warning" title="恢复边界">新密码只写入当前 HTTPS 请求，不进入动作摘要、审批记录或审计正文；恢复证据、审批员工、目标版本和原因将持久化留痕。</InlineNotice></div>{error === null ? null : <p className={styles.feedback} role="alert">{error}</p>}</div></Dialog>;
}

function RolePicker({ roles, selected, onChange }: Readonly<{ roles: readonly Role[]; selected: readonly string[]; onChange(value: readonly string[]): void }>) {
  return <fieldset className={styles.rolePicker}><legend>预定义角色</legend>{roles.length === 0 ? <p>没有可分配角色；不会自行补造权限。</p> : roles.map((role) => <label key={role.id}><input checked={selected.includes(role.id)} onChange={(event) => onChange(event.target.checked ? [...selected, role.id] : selected.filter((id) => id !== role.id))} type="checkbox" /><span><strong>{role.name}</strong><small>{role.permissions.join("、") || "无权限项"}</small></span></label>)}</fieldset>;
}

function Field({ label, wide = false, children }: Readonly<{ label: string; wide?: boolean; children: ReactNode }>) {
  return <label className={styles.field} data-wide={wide || undefined}><span>{label}</span>{children}</label>;
}

function identifiers(value: string): readonly string[] {
  return [...new Set(value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))];
}

function defaultAuditFilters(): AuditFilters {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" });
  const now = new Date();
  return { actorId: "", resourceId: "", from: formatter.format(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)), to: formatter.format(now) };
}

function nextShanghaiDay(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  const next = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) + 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}T00:00:00+08:00`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}
