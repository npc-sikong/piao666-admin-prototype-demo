"use client";

import { foregroundPollDelayMs, isTaskTerminal } from "@piao777/api-client";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActionButton,
  Dialog,
  InlineNotice,
  MetricStrip,
  PageHeader,
  Panel,
  StatusBadge,
  Tabs,
} from "@/components/admin-workspace/admin-workspace";
import { PageState } from "@/components/page-state/page-state";
import { TaskStatus as TaskStatusView } from "@/components/task-status/task-status";
import { useAdminSession } from "@/session/admin-session";
import {
  createLedgerReversal,
  createReconciliation,
  createReportExport,
  getAdminReport,
  getAdminTask,
  getReconciliation,
  getReportExport,
  ledgerFailure,
  listBudgets,
  newLedgerIntent,
  shanghaiRangeEndInclusive,
  shanghaiRangeStart,
  type LedgerFailureKind,
} from "./ledger-api";
import {
  metric,
  type BudgetAccountPage,
  type CommandReceipt,
  type ExportStatus,
  type LedgerReport,
  type Reconciliation,
  type TaskAccepted,
  type TaskStatus,
} from "./ledger-models";
import styles from "./ledger-management.module.css";
import { TransactionLedgerTab } from "./transaction-ledger-tab";

import { PlatformBudgetPanel } from "./platform-budget-panel";

type LedgerTab = "transactions" | "report" | "budgets" | "operations";

interface DateFilters {
  from: string;
  to: string;
  status: string;
}

interface ReversalDraft {
  originalTransactionId: string;
  points: string;
  reason: string;
  evidenceIds: string;
  proofCode: string;
  idempotencyKey: string;
}

interface ReconciliationDraft {
  reason: string;
  idempotencyKey: string;
}

export function LedgerPage() {
  const session = useAdminSession();
  const permissions = session.identity?.permissions ?? [];
  const canViewLedger = permissions.includes("ledger:view");
  const canReport = permissions.includes("report:view");
  const canExport = permissions.includes("report:export");
  const canBudget = permissions.includes("budget:view");
  const canReverse = permissions.includes("ledger:reverse") && permissions.includes("action:authorize");
  const canReconcile = permissions.includes("ledger:reconcile");
  const canTask = permissions.includes("task:view");
  const canSeePage = canViewLedger || canReport || canBudget || canReverse || canReconcile;
  const defaults = useMemo(() => defaultDateFilters(), []);
  const [tab, setTab] = useState<LedgerTab>("transactions");
  const [ledgerRefreshToken, setLedgerRefreshToken] = useState(0);
  const [draftFilters, setDraftFilters] = useState<DateFilters>(defaults);
  const [filters, setFilters] = useState<DateFilters>(defaults);
  const [report, setReport] = useState<LedgerReport | null>(null);
  const [reportState, setReportState] = useState<"idle" | "loading" | "ready" | LedgerFailureKind>("idle");
  const [reportError, setReportError] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<BudgetAccountPage | null>(null);
  const [budgetState, setBudgetState] = useState<"idle" | "loading" | "ready" | LedgerFailureKind>("idle");
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<"CSV" | "XLSX">("CSV");
  const [exportAccepted, setExportAccepted] = useState<TaskAccepted | null>(null);
  const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [reversalOpen, setReversalOpen] = useState(false);
  const [reversalDraft, setReversalDraft] = useState<ReversalDraft>(emptyReversal);
  const [reversalReceipt, setReversalReceipt] = useState<CommandReceipt | null>(null);
  const [reversalError, setReversalError] = useState<string | null>(null);
  const [reversing, setReversing] = useState(false);
  const [reconciliationOpen, setReconciliationOpen] = useState(false);
  const [reconciliationDraft, setReconciliationDraft] = useState<ReconciliationDraft>(emptyReconciliation);
  const [reconciliationAccepted, setReconciliationAccepted] = useState<TaskAccepted | null>(null);
  const [reconciliationTask, setReconciliationTask] = useState<TaskStatus | null>(null);
  const [reconciliation, setReconciliation] = useState<Reconciliation | null>(null);
  const [reconciliationId, setReconciliationId] = useState("");
  const [reconciliationError, setReconciliationError] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);

  // 同 transaction-ledger-tab：结束日期选到"今天"时上界会被夹到当前时刻，
  // 而后端游标 scope 含 from/to。若每页都重新取一次 now，翻页会因 scope 变化被拒。
  // 对同一组筛选只解析一次时间窗，翻页复用。
  const reportRange = useMemo(() => ({
    from: shanghaiRangeStart(filters.from),
    to: shanghaiRangeEndInclusive(filters.to),
  }), [filters.from, filters.to]);

  const loadReport = useCallback(async (cursor?: string, snapshotId?: string) => {
    if (!canReport) {
      setReportState("forbidden");
      return;
    }
    setReportState("loading");
    setReportError(null);
    try {
      const next = await getAdminReport({
        from: reportRange.from,
        to: reportRange.to,
        status: filters.status || undefined,
        cursor,
        snapshotId,
      });
      setReport(next);
      setReportState("ready");
    } catch (cause) {
      const failure = ledgerFailure(cause);
      setReportError(failure.message);
      setReportState(failure.kind);
    }
  }, [canReport, filters.status, reportRange]);

  const loadBudgets = useCallback(async () => {
    if (!canBudget) {
      setBudgetState("forbidden");
      return;
    }
    setBudgetState("loading");
    setBudgetError(null);
    try {
      setBudgets(await listBudgets());
      setBudgetState("ready");
    } catch (cause) {
      const failure = ledgerFailure(cause);
      setBudgetError(failure.message);
      setBudgetState(failure.kind);
    }
  }, [canBudget]);

  useEffect(() => {
    if (session.status === "authenticated") {
      void loadReport();
      void loadBudgets();
    }
  }, [loadBudgets, loadReport, session.status]);

  useEffect(() => {
    if (exportAccepted === null) {
      return undefined;
    }
    const exportId = lastPathSegment(exportAccepted.statusUrl);
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      try {
        const next = await getReportExport(exportId);
        if (stopped) return;
        setExportStatus(next);
        setExportError(null);
        if (["PENDING", "RUNNING"].includes(next.status)) {
          timer = setTimeout(poll, foregroundPollDelayMs(exportAccepted.pollAfterSeconds));
        }
      } catch (cause) {
        if (!stopped) setExportError(ledgerFailure(cause).message);
      }
    };
    timer = setTimeout(poll, foregroundPollDelayMs(exportAccepted.pollAfterSeconds));
    return () => {
      stopped = true;
      if (timer !== null) clearTimeout(timer);
    };
  }, [exportAccepted]);

  useEffect(() => {
    if (reconciliationAccepted === null || !canTask) {
      return undefined;
    }
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      try {
        const next = await getAdminTask(reconciliationAccepted.taskId);
        if (stopped) return;
        setReconciliationTask(next);
        setReconciliationError(null);
        if (next.status === "SUCCEEDED") {
          const id = lastPathSegment(next.resultUrl ?? reconciliationAccepted.statusUrl);
          setReconciliationId(id);
          setReconciliation(await getReconciliation(id));
        } else if (!isTaskTerminal(next.status)) {
          timer = setTimeout(poll, foregroundPollDelayMs(reconciliationAccepted.pollAfterSeconds));
        }
      } catch (cause) {
        if (!stopped) setReconciliationError(ledgerFailure(cause).message);
      }
    };
    timer = setTimeout(poll, foregroundPollDelayMs(reconciliationAccepted.pollAfterSeconds));
    return () => {
      stopped = true;
      if (timer !== null) clearTimeout(timer);
    };
  }, [canTask, reconciliationAccepted]);

  async function startExport() {
    if (report === null) return;
    setExporting(true);
    setExportError(null);
    setExportStatus(null);
    try {
      setExportAccepted(await createReportExport({
        filters: report.filters,
        snapshotId: report.snapshotId,
        format: exportFormat,
        idempotencyKey: newLedgerIntent("createReportExport"),
      }));
    } catch (cause) {
      setExportError(ledgerFailure(cause).message);
    } finally {
      setExporting(false);
    }
  }

  async function submitReversal() {
    const evidenceIds = reversalDraft.evidenceIds.split(/[,\n]/).map((value) => value.trim()).filter(Boolean);
    if (!reversalDraft.originalTransactionId.trim() || !/^(?!0+\.00$)\d+\.\d{2}$/.test(reversalDraft.points) || reversalDraft.reason.trim().length < 2 || evidenceIds.length === 0 || !/^\d{6}$/.test(reversalDraft.proofCode)) {
      setReversalError("请完整填写原交易、两位小数积分、原因、证据 ID 和 MFA 动态码。");
      return;
    }
    setReversing(true);
    setReversalError(null);
    try {
      const receipt = await createLedgerReversal({
        originalTransactionId: reversalDraft.originalTransactionId.trim(),
        points: reversalDraft.points,
        reason: reversalDraft.reason.trim(),
        evidenceIds,
        proofCode: reversalDraft.proofCode.trim(),
        idempotencyKey: reversalDraft.idempotencyKey,
      });
      setReversalReceipt(receipt);
      setReversalOpen(false);
      setReversalDraft(emptyReversal());
      setLedgerRefreshToken((value) => value + 1);
      void loadReport();
      void loadBudgets();
    } catch (cause) {
      setReversalError(ledgerFailure(cause).message);
    } finally {
      setReversing(false);
    }
  }

  async function submitReconciliation() {
    if (reconciliationDraft.reason.trim().length < 2) {
      setReconciliationError("请填写至少 2 个字符的对账原因。");
      return;
    }
    setReconciling(true);
    setReconciliationError(null);
    setReconciliation(null);
    setReconciliationTask(null);
    try {
      const accepted = await createReconciliation({
        reason: reconciliationDraft.reason.trim(),
        idempotencyKey: reconciliationDraft.idempotencyKey,
      });
      setReconciliationAccepted(accepted);
      setReconciliationId(lastPathSegment(accepted.statusUrl));
      setReconciliationOpen(false);
      setReconciliationDraft(emptyReconciliation());
    } catch (cause) {
      setReconciliationError(ledgerFailure(cause).message);
    } finally {
      setReconciling(false);
    }
  }

  async function queryReconciliation() {
    if (!reconciliationId.trim()) return;
    setReconciliationError(null);
    try {
      setReconciliation(await getReconciliation(reconciliationId.trim()));
    } catch (cause) {
      setReconciliationError(ledgerFailure(cause).message);
    }
  }

  if (session.status === "authenticated" && !canSeePage) {
    return <PageState description="当前员工没有报表、预算、对账或受控冲正权限。" kind="forbidden" />;
  }

  const totals = report?.totals ?? {};
  return (
    <>
      <PageHeader
        actions={(
          <>
            <ActionButton disabled={!canReconcile} onClick={() => setReconciliationOpen(true)}>发起对账</ActionButton>
            <ActionButton disabled={!canReverse} onClick={() => setReversalOpen(true)} variant="danger">受控冲正</ActionButton>
          </>
        )}
        description="按交易查看全局双边分录、对账投影、平台预算和任务状态；差错只能引用原交易追加冲正。"
        pageId="A23"
        title="积分账本与对账"
      />

      <InlineNotice title="账本不可编辑">
        余额、冻结和预算均以不可变双边分录为真值；本页面没有直接改余额、删除流水或覆盖历史交易的入口。
      </InlineNotice>

      <Panel flush title="财务工作区">
        <Tabs<LedgerTab>
          items={[
            { id: "transactions", label: "双边账本" },
            { id: "report", label: "对账报表" },
            { id: "budgets", label: "预算账户", count: budgets?.items.length },
            { id: "operations", label: "任务与操作" },
          ]}
          label="积分账本视图"
          onChange={setTab}
          value={tab}
        />
        <div className={styles.tabBody}>
          {tab === "transactions" ? <TransactionLedgerTab canView={canViewLedger} refreshToken={ledgerRefreshToken} /> : null}

          {tab === "report" ? (
            <>
              <form className={styles.filterBar} onSubmit={(event) => { event.preventDefault(); setFilters({ ...draftFilters }); }}>
                <label className={styles.field}><span>开始日期</span><input onChange={(event) => setDraftFilters((current) => ({ ...current, from: event.target.value }))} type="date" value={draftFilters.from} /></label>
                <label className={styles.field}><span>结束日期（含）</span><input onChange={(event) => setDraftFilters((current) => ({ ...current, to: event.target.value }))} type="date" value={draftFilters.to} /></label>
                <label className={styles.field}><span>对账状态</span><select onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value }))} value={draftFilters.status}><option value="">全部状态</option><option value="MATCHED">一致</option><option value="MISMATCH">存在差异</option><option value="PENDING">等待处理</option><option value="RUNNING">处理中</option></select></label>
                <ActionButton type="submit" variant="primary">查询</ActionButton>
                <ActionButton onClick={() => void loadReport()}>刷新</ActionButton>
              </form>

              {reportState === "loading" ? <PageState kind="loading" title="正在读取对账报表" /> : null}
              {reportState === "forbidden" ? <PageState description={reportError ?? "账本全局对账仅对有全局报表权限的员工开放。"} kind="forbidden" /> : null}
              {reportState === "not-ready" ? <PageState description={reportError ?? undefined} kind="not-ready" /> : null}
              {reportState === "version" ? <PageState action={<ActionButton onClick={() => void loadReport()}>重新加载</ActionButton>} description={reportError ?? undefined} kind="error" title="报表版本已失效" /> : null}
              {reportState === "error" ? <PageState action={<ActionButton onClick={() => void loadReport()}>重试</ActionButton>} description={reportError ?? undefined} kind="error" /> : null}
              {reportState === "ready" && report !== null ? (
                <>
                  <MetricStrip items={[
                    { label: "应有积分", value: points(metric(totals, "expectedPoints")), detail: "完整筛选总计" },
                    { label: "实际积分", value: points(metric(totals, "postedPoints")), detail: "同一快照" },
                    { label: "差额", value: points(metric(totals, "differencePoints")), detail: "实际 - 应有", tone: metric(totals, "differencePoints") === "0.00" ? "good" : "warning" },
                    { label: "异常账户", value: metric(totals, "mismatchAccountCount") ?? "—", detail: "不直接修改余额", tone: metric(totals, "mismatchAccountCount") === "0" ? "good" : "danger" },
                  ]} />
                  <div className={styles.reportToolbar}>
                    <div><strong>快照 {report.snapshotId}</strong><span>数据水位 {report.sourceWatermark} · 截至 {formatDateTime(report.asOf)}</span></div>
                    <div className={styles.inlineActions}><select aria-label="导出格式" onChange={(event) => setExportFormat(event.target.value as "CSV" | "XLSX")} value={exportFormat}><option value="CSV">CSV</option><option value="XLSX">XLSX</option></select><ActionButton disabled={!canExport || exporting} onClick={() => void startExport()}>{exporting ? "受理中" : "导出当前筛选全量"}</ActionButton></div>
                  </div>
                  {report.items.length === 0 ? <PageState kind="empty" title="当前筛选没有对账记录" /> : <ReportTable report={report} onNext={() => void loadReport(report.nextCursor ?? undefined, report.snapshotId)} />}
                </>
              ) : null}
            </>
          ) : null}

          {tab === "budgets" ? (
            <>
              <div className={styles.sectionToolbar}><div><strong>平台预算</strong><span>预算与会员余额、站长额度分别核算。</span></div><ActionButton onClick={() => void loadBudgets()}>刷新预算</ActionButton></div>
              {budgetState === "loading" ? <PageState kind="loading" title="正在读取预算账户" /> : null}
              {budgetState === "forbidden" ? <PageState description={budgetError ?? "当前员工没有预算查看权限。"} kind="forbidden" /> : null}
              {budgetState === "not-ready" ? <PageState description={budgetError ?? undefined} kind="not-ready" /> : null}
              {budgetState === "version" || budgetState === "error" ? <PageState action={<ActionButton onClick={() => void loadBudgets()}>重试</ActionButton>} description={budgetError ?? undefined} kind="error" title={budgetState === "version" ? "预算版本已失效" : undefined} /> : null}
              {budgetState === "ready" && budgets !== null ? budgets.items.length === 0 ? <PageState kind="empty" title="没有预算账户" /> : <BudgetTable page={budgets} /> : null}
              <PlatformBudgetPanel permissions={(session.identity?.scopeStationIds.length ?? 1) === 0 ? permissions : []} employeeId={session.identity?.employeeId ?? ""} onPosted={loadBudgets} />
            </>
          ) : null}

          {tab === "operations" ? (
            <div className={styles.operationsGrid}>
              <section className={styles.operationSection}>
                <div className={styles.sectionToolbar}><div><strong>导出任务</strong><span>创建与下载都会重新校验当前权限。</span></div></div>
                {exportAccepted === null ? <p className={styles.muted}>尚未发起导出。</p> : <ExportTask accepted={exportAccepted} error={exportError} status={exportStatus} />}
              </section>
              <section className={styles.operationSection}>
                <div className={styles.sectionToolbar}><div><strong>对账任务</strong><span>任务完成与对账结果分开显示。</span></div></div>
                {reconciliationAccepted === null ? <p className={styles.muted}>尚未发起对账。</p> : (
                  <>
                    <p className={styles.taskIdentity}>任务号 {reconciliationAccepted.taskId}</p>
                    {reconciliationTask === null ? <InlineNotice title="对账已受理">{canTask ? "等待任务状态查询；尚未形成最终对账结论。" : "当前员工缺少 task:view，无法继续读取任务进度；可在获得权限后按对账 ID 查询结果。"}</InlineNotice> : <TaskStatusView failureCode={reconciliationTask.failureCode} progress={reconciliationTask.progress} resultCode={reconciliationTask.resultCode} status={reconciliationTask.status} />}
                  </>
                )}
              </section>
              <section className={styles.operationSection}>
                <div className={styles.sectionToolbar}><div><strong>读取对账结果</strong><span>可输入既有对账 ID，或使用本页刚创建的结果。</span></div></div>
                <div className={styles.inlineQuery}><input onChange={(event) => setReconciliationId(event.target.value)} placeholder="对账 UUID" value={reconciliationId} /><ActionButton disabled={!canReconcile || !reconciliationId.trim()} onClick={() => void queryReconciliation()}>查询结果</ActionButton></div>
                {reconciliationError === null ? null : <p className={styles.feedback} role="alert">{reconciliationError}</p>}
                {reconciliation === null ? null : <ReconciliationView value={reconciliation} />}
              </section>
              <section className={styles.operationSection}>
                <div className={styles.sectionToolbar}><div><strong>最近冲正回执</strong><span>冲正新增反向交易，原交易仍保留。</span></div></div>
                {reversalReceipt === null ? <p className={styles.muted}>本页面会话尚无冲正回执。</p> : <dl className={styles.compactDetails}><Detail label="命令" value={reversalReceipt.commandId} /><Detail label="新增交易" value={reversalReceipt.resourceId} /><Detail label="状态" value={reversalReceipt.status} /><Detail label="时间" value={formatDateTime(reversalReceipt.createdAt)} /></dl>}
              </section>
            </div>
          ) : null}
        </div>
      </Panel>

      <ReversalDialog draft={reversalDraft} error={reversalError} onChange={setReversalDraft} onClose={() => { if (!reversing) setReversalOpen(false); }} onSubmit={() => void submitReversal()} open={reversalOpen} submitting={reversing} />
      <ReconciliationDialog draft={reconciliationDraft} error={reconciliationError} onChange={setReconciliationDraft} onClose={() => { if (!reconciling) setReconciliationOpen(false); }} onSubmit={() => void submitReconciliation()} open={reconciliationOpen} submitting={reconciling} />
    </>
  );
}

function ReportTable({ report, onNext }: Readonly<{ report: LedgerReport; onNext(): void }>) {
  return <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>日期</th><th>状态</th><th>应有积分</th><th>实际积分</th><th>差额</th><th>异常账户</th><th>异常原因</th></tr></thead><tbody>{report.items.map((row, index) => <tr key={`${String(row.dimensions.date ?? "row")}-${index}`}><td>{display(row.dimensions.date)}</td><td><StatusBadge label={statusLabel(display(row.dimensions.settlementStatus))} status={display(row.dimensions.settlementStatus)} /></td><td>{points(metric(row.metrics, "expectedPoints"))}</td><td>{points(metric(row.metrics, "postedPoints"))}</td><td>{points(metric(row.metrics, "differencePoints"))}</td><td>{metric(row.metrics, "mismatchAccountCount") ?? "—"}</td><td>{display(row.dimensions.exceptionReason)}</td></tr>)}</tbody></table><div className={styles.pagination}><span>{report.hasMore ? "还有下一页；总计保持完整筛选范围" : "已到当前筛选末页"}</span><ActionButton disabled={!report.hasMore || report.nextCursor === null} onClick={onNext}>下一页</ActionButton></div></div>;
}

function BudgetTable({ page }: Readonly<{ page: BudgetAccountPage }>) {
  return <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>预算类型</th><th>账户 ID</th><th>可用积分</th><th>冻结积分</th><th>版本</th></tr></thead><tbody>{page.items.map((item) => <tr key={item.id}><td><strong>{budgetLabel(item.type)}</strong></td><td><code className={styles.mono}>{item.id}</code></td><td>{points(item.availablePoints)}</td><td>{points(item.reservedPoints)}</td><td>{item.version}</td></tr>)}</tbody></table></div>;
}

function ExportTask({ accepted, status, error }: Readonly<{ accepted: TaskAccepted; status: ExportStatus | null; error: string | null }>) {
  return <div className={styles.taskBlock}><p className={styles.taskIdentity}>任务号 {accepted.taskId}</p>{status === null ? <InlineNotice title="导出已受理">等待生成；202 不表示文件已经可下载。</InlineNotice> : <><StatusBadge label={exportLabel(status.status)} status={status.status} /><p>行数 {status.rowCount} · {status.expiresAt === null ? "尚无下载有效期" : `有效至 ${formatDateTime(status.expiresAt)}`}</p>{status.downloadUrl === null ? null : <a className={styles.downloadLink} download={status.downloadUrl.split("#")[1]} href={status.downloadUrl}>下载已授权文件</a>}</>}{error === null ? null : <p className={styles.feedback}>{error}</p>}</div>;
}

function ReconciliationView({ value }: Readonly<{ value: Reconciliation }>) {
  return <dl className={styles.compactDetails}><Detail label="对账 ID" value={value.id} /><Detail label="状态" value={statusLabel(value.status)} /><Detail label="应有积分" value={points(value.expectedPoints)} /><Detail label="实际积分" value={points(value.actualPoints)} /><Detail label="差额" value={points(value.differencePoints)} /><Detail label="数据截至" value={value.asOf === null ? "尚未完成" : formatDateTime(value.asOf)} /></dl>;
}

function ReversalDialog({ open, draft, submitting, error, onClose, onChange, onSubmit }: Readonly<{ open: boolean; draft: ReversalDraft; submitting: boolean; error: string | null; onClose(): void; onChange(value: ReversalDraft): void; onSubmit(): void }>) {
  return <Dialog description="仅支持引用合法原交易追加反向分录；需要受控冲正权限、证据与员工 MFA 动作凭据。" footer={<><ActionButton disabled={submitting} onClick={onClose}>取消</ActionButton><ActionButton disabled={submitting} onClick={onSubmit} variant="danger">{submitting ? "提交中" : "授权并冲正"}</ActionButton></>} onClose={onClose} open={open} title="受控账本冲正"><div className={styles.formGrid}><Field label="原交易 ID"><input onChange={(event) => onChange({ ...draft, originalTransactionId: event.target.value })} value={draft.originalTransactionId} /></Field><Field label="冲正积分"><input inputMode="decimal" onChange={(event) => onChange({ ...draft, points: event.target.value })} placeholder="0.00" value={draft.points} /></Field><Field label="证据 ID（逗号或换行分隔）" wide><textarea onChange={(event) => onChange({ ...draft, evidenceIds: event.target.value })} value={draft.evidenceIds} /></Field><Field label="冲正原因" wide><textarea maxLength={500} onChange={(event) => onChange({ ...draft, reason: event.target.value })} value={draft.reason} /></Field><Field label="员工 MFA 动态码"><input autoComplete="one-time-code" inputMode="numeric" maxLength={6} onChange={(event) => onChange({ ...draft, proofCode: event.target.value.replace(/\D/g, "") })} value={draft.proofCode} /></Field>{error === null ? null : <p className={styles.feedback} role="alert">{error}</p>}</div></Dialog>;
}

function ReconciliationDialog({ open, draft, submitting, error, onClose, onChange, onSubmit }: Readonly<{ open: boolean; draft: ReconciliationDraft; submitting: boolean; error: string | null; onClose(): void; onChange(value: ReconciliationDraft): void; onSubmit(): void }>) {
  return <Dialog description="对账会在可信后台任务中重建余额并核对分录；受理不等于已经一致。" footer={<><ActionButton disabled={submitting} onClick={onClose}>取消</ActionButton><ActionButton disabled={submitting} onClick={onSubmit} variant="primary">{submitting ? "受理中" : "创建对账任务"}</ActionButton></>} onClose={onClose} open={open} title="发起账本对账"><Field label="对账原因"><textarea maxLength={500} onChange={(event) => onChange({ ...draft, reason: event.target.value })} value={draft.reason} /></Field>{error === null ? null : <p className={styles.feedback} role="alert">{error}</p>}</Dialog>;
}

function Field({ label, wide = false, children }: Readonly<{ label: string; wide?: boolean; children: ReactNode }>) {
  return <label className={styles.field} data-wide={wide || undefined}><span>{label}</span>{children}</label>;
}

function Detail({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function emptyReversal(): ReversalDraft {
  return { originalTransactionId: "", points: "", reason: "", evidenceIds: "", proofCode: "", idempotencyKey: newLedgerIntent("createLedgerReversal") };
}

function emptyReconciliation(): ReconciliationDraft {
  return { reason: "", idempotencyKey: newLedgerIntent("createReconciliation") };
}

function defaultDateFilters(): DateFilters {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" });
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  return { from: formatter.format(weekAgo), to: formatter.format(now), status: "" };
}

function lastPathSegment(url: string): string {
  const pathname = new URL(url, "https://same-origin.invalid").pathname;
  return decodeURIComponent(pathname.split("/").filter(Boolean).at(-1) ?? "");
}

function points(value: string | null): string {
  return value === null ? "—" : `${value} 积分`;
}

function display(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "—";
}

function statusLabel(value: string): string {
  return ({ MATCHED: "一致", MISMATCH: "存在差异", PENDING: "等待处理", RUNNING: "处理中", SUCCEEDED: "已完成", FAILED: "失败" } as Readonly<Record<string, string>>)[value] ?? value;
}

function budgetLabel(value: string): string {
  return ({ DISTRIBUTION_BUDGET: "平台分配预算", ORDINARY_AWARD_BUDGET: "普通返奖预算", AI_BUDGET: "AI 合买预算", REFERRAL_BUDGET: "推广奖励预算" } as Readonly<Record<string, string>>)[value] ?? value;
}

function exportLabel(value: string): string {
  return ({ PENDING: "已受理", RUNNING: "生成中", COMPLETED: "可下载", FAILED: "生成失败", EXPIRED: "下载已过期" } as Readonly<Record<string, string>>)[value] ?? value;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}
