"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ActionButton,
  DataTimestamp,
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
  createReportExport,
  errorView,
  getAiReport,
  getReportExport,
  listPools,
  newIntent,
} from "./ai-management-api";
import {
  metric,
  nameRef,
  type ExportStatus,
  type ReportFilter,
  type ReportResult,
  type ReportRow,
} from "./ai-management-models";
import {
  Breadcrumbs,
  ErrorState,
  TaskReceipt,
  formatAiPoints,
  formatRate,
  shortHash,
} from "./ai-management-ui";
import { useAiTask } from "./use-ai-task";
import styles from "./ai-management.module.css";

interface FilterForm {
  from: string;
  to: string;
  projectId: string;
  lotteryId: string;
  issueCode: string;
  status: string;
}

interface ExportIntent {
  format: "CSV" | "XLSX";
  idempotencyKey: string;
}

const pointMetrics = new Set([
  "totalPurchasePoints",
  "netEffectivePurchasePoints",
  "userPurchasePoints",
  "platformPoints",
  "totalWinningPoints",
  "userWinningPoints",
  "postedUserWinningPoints",
  "platformWinningPoints",
  "rewardRequiredPoints",
]);
const rateMetrics = new Set([
  "actualUserShare",
  "requestedTargetNetReturnRate",
  "actualNetReturnRate",
]);

export function AiReportPage() {
  const session = useAdminSession();
  const permissions = session.identity?.permissions ?? [];
  const canView = permissions.includes("report:view");
  const canExport = permissions.includes("report:export");
  const canViewPools = permissions.includes("ai-pool:view");
  const [form, setForm] = useState<FilterForm>(() => defaultFilters());
  const [applied, setApplied] = useState<FilterForm>(() => defaultFilters());
  const [report, setReport] = useState<ReportResult | null>(null);
  const [poolByIssue, setPoolByIssue] = useState<ReadonlyMap<string, string>>(new Map<string, string>());
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const [error, setError] = useState<ReturnType<typeof errorView> | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exportIntent, setExportIntent] = useState<ExportIntent | null>(null);
  const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const exportTask = useAiTask();

  const filters = useMemo(() => reportFilters(applied), [applied]);

  const load = useCallback(async (
    cursor?: string,
    snapshotId?: string,
    pageFilters: ReportFilter = filters,
  ) => {
    if (!canView) {
      setStatus("forbidden");
      return;
    }
    if (cursor === undefined) setStatus("loading");
    else setLoadingMore(true);
    setError(null);
    try {
      const [result, poolPage] = await Promise.all([
        getAiReport(pageFilters, cursor, snapshotId),
        cursor === undefined && canViewPools && pageFilters.projectId !== undefined
          ? listPools(pageFilters.projectId)
          : Promise.resolve(null),
      ]);
      setReport((current) => cursor === undefined || current === null
        ? result
        : { ...result, items: [...current.items, ...result.items] });
      if (cursor === undefined) {
        setPoolByIssue(new Map<string, string>(poolPage?.items.map((item) => [item.issueCode, item.id] as const) ?? []));
      }
      setStatus("ready");
    } catch (cause) {
      const view = errorView(cause);
      setError(view);
      if (cursor === undefined) setStatus(view.kind === "forbidden" ? "forbidden" : "error");
    } finally {
      setLoadingMore(false);
    }
  }, [canView, canViewPools, filters]);

  useEffect(() => {
    if (session.status === "authenticated") void load();
  }, [load, session.status]);

  useEffect(() => {
    if (exportTask.status?.status !== "SUCCEEDED" || exportTask.accepted === null) return;
    let cancelled = false;
    void getReportExport(exportTask.accepted.statusUrl).then((result) => {
      if (!cancelled) setExportStatus(result);
    }).catch((cause) => {
      if (!cancelled) setSubmitError(errorView(cause).message);
    });
    return () => { cancelled = true; };
  }, [exportTask.accepted, exportTask.status?.status]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReport(null);
    setExportStatus(null);
    exportTask.clear();
    setApplied({ ...form });
  }

  async function submitExport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (exportIntent === null || report === null) return;
    setSubmitting(true);
    setSubmitError(null);
    setExportStatus(null);
    try {
      const accepted = await createReportExport({
        report,
        format: exportIntent.format,
        idempotencyKey: exportIntent.idempotencyKey,
      });
      exportTask.start(accepted);
      setExportIntent(null);
    } catch (cause) {
      setSubmitError(errorView(cause).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (session.status === "loading") return <PageState kind="loading" title="正在读取员工会话" description="确认报表权限与数据范围。" />;
  if (session.status === "anonymous") return <PageState kind="forbidden" title="员工会话已失效" description="请重新登录运营后台。" />;
  if (session.status === "error") return <PageState kind="error" title="员工会话不可用" description={`会话校验失败（${session.errorCode ?? "SESSION_UNAVAILABLE"}）。`} />;
  if (status === "loading") return <PageState kind="loading" title="正在生成 AI 每期报表" description="明细与底部总计由同一筛选快照返回。" />;
  if (status === "forbidden") return <PageState kind="forbidden" title="无报表查看权限" description="需要 report:view 权限与服务端数据范围。" />;
  if (status === "error" || error !== null && report === null) return <ErrorState error={error ?? errorView(new Error("AI_REPORT_UNAVAILABLE"))} onRetry={() => void load()} />;

  return (
    <div className={styles.stack}>
      <Breadcrumbs current="每期数据报表" />
      <PageHeader
        actions={<div className={styles.pageActions}><Link className={styles.linkButton} href="/ai-pools">返回项目</Link>{canExport && report !== null ? <ActionButton onClick={() => { setSubmitError(null); setExportIntent({ format: "XLSX", idempotencyKey: newIntent("createAiPoolReportExport") }); }} variant="primary">导出快照</ActionButton> : null}</div>}
        description="每行对应一个期次实例，底部总计覆盖完整筛选范围，不从当前可见行二次相加。"
        meta={report === null ? undefined : <div className={styles.inlineActions}><DataTimestamp value={report.asOf} /><span>快照 {shortHash(report.snapshotId)}</span><span>指标字典 {report.metricDictionaryVersion}</span></div>}
        pageId="A17"
        title="AI 项目每期数据报表"
      />

      <Panel description="日期按期次计划开奖时间筛选；期号和状态与日期条件同时生效。" title="筛选条件">
        <form className={styles.filterBar} onSubmit={applyFilters}>
          <label className={styles.field}><span>项目 ID</span><input maxLength={128} onChange={(event) => setForm({ ...form, projectId: event.target.value })} placeholder="全部项目" value={form.projectId} /></label>
          <label className={styles.field}><span>彩票 ID</span><input maxLength={128} onChange={(event) => setForm({ ...form, lotteryId: event.target.value })} placeholder="全部彩票" value={form.lotteryId} /></label>
          <label className={styles.field}><span>期号</span><input maxLength={64} onChange={(event) => setForm({ ...form, issueCode: event.target.value })} placeholder="全部期号" value={form.issueCode} /></label>
          <label className={styles.field}><span>状态</span><select onChange={(event) => setForm({ ...form, status: event.target.value })} value={form.status}><option value="">全部状态</option><option value="OPEN">认购中</option><option value="CUTOFF_PENDING">截止处理中</option><option value="LOCKED">已锁定</option><option value="DRAW_PENDING">待开奖</option><option value="ALLOCATION_PENDING">待分配</option><option value="DISCLOSED">已公示</option><option value="DISTRIBUTING">发放中</option><option value="SETTLED">已结算</option><option value="CANCELLING">取消处理中</option><option value="CANCELLED">已取消</option><option value="CORRECTING">更正中</option><option value="CORRECTED">已更正</option><option value="EXCEPTION_PENDING">异常待处理</option><option value="NO_PARTICIPATION">无人参与</option></select></label>
          <label className={styles.field}><span>开奖日期从</span><input onChange={(event) => setForm({ ...form, from: event.target.value })} required type="date" value={form.from} /></label>
          <label className={styles.field}><span>开奖日期至</span><input min={form.from} onChange={(event) => setForm({ ...form, to: event.target.value })} required type="date" value={form.to} /></label>
          <ActionButton type="submit" variant="primary">查询</ActionButton>
        </form>
      </Panel>

      {error === null ? null : <InlineNotice tone="danger" title="部分结果加载失败">{error.message}</InlineNotice>}

      {report === null ? <PageState kind="empty" title="没有报表结果" description="请调整筛选条件后查询。" /> : <>
        {!report.complete ? <InlineNotice tone="warning" title="投影尚未完整">服务端标记本快照未完整，请等待投影水位推进后重新查询；当前数据不可作为完整结论。</InlineNotice> : null}
        <MetricStrip items={[
          { label: "筛选期数", value: reportMetric(report.totals, "issueCount"), detail: "服务端完整筛选总计" },
          { label: "总购买 T", value: reportMetric(report.totals, "totalPurchasePoints"), detail: `净有效 ${reportMetric(report.totals, "netEffectivePurchasePoints")}` },
          { label: "用户中奖应返", value: reportMetric(report.totals, "userWinningPoints"), detail: `已入账 ${reportMetric(report.totals, "postedUserWinningPoints")}` },
          { label: "整体实际用户净收益率", value: reportMetric(report.totals, "actualNetReturnRate"), detail: `超出±3个百分点 ${reportMetric(report.totals, "outsideToleranceCount")} 期` },
        ]} />
        <Panel description="待开奖的返还值显示“待开奖”，真实零值保留为 0；目标与实际收益率总计按本期总池加权。" flush title="每期明细">
          {report.items.length === 0 ? <div className={styles.emptyInline}>当前筛选范围没有期次记录。</div> : <div className={styles.tableWrap}><table className={styles.table} data-wide="true"><thead><tr><th>项目 / 期号</th><th>彩票 / 玩法</th><th>参与人数</th><th>组合数</th><th>T 总池</th><th>U 用户</th><th>F 平台</th><th>用户占比</th><th>管理员目标</th><th>开奖号码 / 版本</th><th>R 当前应返</th><th>用户应返</th><th>用户已发</th><th>平台返还</th><th>奖励需求</th><th>平台目标尾差</th><th>发放方式</th><th>实际净收益率</th><th>差值 / 容差</th><th>公示</th><th>结算</th><th>异常</th></tr></thead><tbody>{report.items.map((row, index) => <ReportTableRow key={rowKey(row, index)} poolIssueId={poolByIssue.get(textDimension(row, "issueCode"))} row={row} />)}</tbody><tfoot><tr><td colSpan={2}>全筛选总计</td><td>{reportMetric(report.totals, "participantCount")}</td><td>{reportMetric(report.totals, "combinationCount")}</td><td>{reportMetric(report.totals, "totalPurchasePoints")}</td><td>{reportMetric(report.totals, "userPurchasePoints")}</td><td>{reportMetric(report.totals, "platformPoints")}</td><td>{reportMetric(report.totals, "actualUserShare")}</td><td>{reportMetric(report.totals, "requestedTargetNetReturnRate")}</td><td>—</td><td>{reportMetric(report.totals, "totalWinningPoints")}</td><td>{reportMetric(report.totals, "userWinningPoints")}</td><td>{reportMetric(report.totals, "postedUserWinningPoints")}</td><td>{reportMetric(report.totals, "platformWinningPoints")}</td><td>{reportMetric(report.totals, "rewardRequiredPoints")}</td><td>{reportMetric(report.totals, "targetRoundingAdjustmentPoints")}</td><td>—</td><td>{reportMetric(report.totals, "actualNetReturnRate")}</td><td>超差 {reportMetric(report.totals, "outsideToleranceCount")} 期</td><td colSpan={3}>{reportMetric(report.totals, "issueCount")} 期 · {reportMetric(report.totals, "participationPersonTimes")} 参与人次</td></tr></tfoot></table></div>}
          {report.hasMore && report.nextCursor !== null ? <div className={styles.summaryBar}><span>当前已显示 {report.items.length} 行；总计始终覆盖完整筛选范围。</span><ActionButton disabled={loadingMore} onClick={() => void load(report.nextCursor ?? undefined, report.snapshotId, report.filters)}>{loadingMore ? "加载中…" : "加载更多"}</ActionButton></div> : null}
        </Panel>
      </>}

      <TaskReceipt accepted={exportTask.accepted} error={exportTask.error} status={exportTask.status} />
      {submitError === null ? null : <InlineNotice tone="danger">{submitError}</InlineNotice>}
      {exportStatus === null ? null : <Panel description="下载授权是短期链接，过期后需基于新快照重新导出。" title="导出结果"><div className={styles.resultBanner}><div><strong>导出 {exportStatus.status}</strong><p>{exportStatus.rowCount} 行 · {exportStatus.expiresAt === null ? "未返回失效时间" : `有效至 ${exportStatus.expiresAt}`}</p></div>{exportStatus.downloadUrl === null ? null : <a className={styles.downloadLink} download={exportStatus.downloadUrl.split("#")[1]} href={exportStatus.downloadUrl} rel="noreferrer">下载文件</a>}</div></Panel>}

      <Dialog footer={<div className={styles.dialogActions}><ActionButton disabled={submitting} onClick={() => setExportIntent(null)}>取消</ActionButton><ActionButton disabled={submitting} form="ai-report-export-form" type="submit" variant="primary">{submitting ? "受理中…" : "创建导出任务"}</ActionButton></div>} onClose={() => setExportIntent(null)} open={exportIntent !== null} title="导出当前报表快照" description={`导出绑定快照 ${report === null ? "—" : shortHash(report.snapshotId)} 与相同权限范围；202 不代表文件已生成。`}>{exportIntent === null ? null : <form className={styles.formGrid} id="ai-report-export-form" onSubmit={submitExport}><label className={`${styles.field} ${styles.span2}`}><span>文件格式</span><select onChange={(event) => setExportIntent({ ...exportIntent, format: event.target.value as "CSV" | "XLSX" })} value={exportIntent.format}><option value="XLSX">XLSX</option><option value="CSV">CSV</option></select></label><div className={styles.span2}><InlineNotice tone="info">明细与总计来自同一服务端快照，不会按浏览器当前已加载行重新统计。</InlineNotice></div>{submitError === null ? null : <div className={styles.span2}><InlineNotice tone="danger">{submitError}</InlineNotice></div>}</form>}</Dialog>
    </div>
  );
}

function ReportTableRow({ poolIssueId, row }: Readonly<{ poolIssueId?: string | undefined; row: ReportRow }>) {
  const project = safeNameRef(row.dimensions.project);
  const lottery = safeNameRef(row.dimensions.lottery);
  const play = safeNameRef(row.dimensions.play);
  const settlementStatus = textDimension(row, "settlementStatus");
  const disclosureStatus = textDimension(row, "disclosureStatus");
  const issueCode = textDimension(row, "issueCode");
  const outsideTolerance = metric(row.metrics, "outsideToleranceCount");
  const toleranceLabel = outsideTolerance === null
    ? "待计算"
    : outsideTolerance === "1" ? "超出±3" : "±3内";
  return <tr><td><span className={styles.cellTitle}>{project?.name ?? "未知项目"}</span>{poolIssueId === undefined ? <span className={styles.cellMeta}>{issueCode}</span> : <Link className={styles.quietLink} href={`/ai-pools/${encodeURIComponent(poolIssueId)}`}>{issueCode}</Link>}</td><td><span className={styles.cellTitle}>{lottery?.name ?? "未知彩票"}</span><span className={styles.cellMeta}>{play?.name ?? "未知玩法"}</span></td><td>{reportRowMetric(row, "participantCount")}</td><td>{reportRowMetric(row, "combinationCount")}</td><td>{reportRowMetric(row, "totalPurchasePoints")}</td><td>{reportRowMetric(row, "userPurchasePoints")}</td><td>{reportRowMetric(row, "platformPoints")}</td><td>{reportRowMetric(row, "actualUserShare")}</td><td>{reportRowMetric(row, "requestedTargetNetReturnRate", true)}</td><td><span className={styles.numberLine}>{drawText(row.dimensions.drawNumbers)}</span><span className={styles.cellMeta}>版本 {textDimension(row, "drawVersion")}</span></td><td>{reportRowMetric(row, "totalWinningPoints", true)}</td><td>{reportRowMetric(row, "userWinningPoints", true)}</td><td>{reportRowMetric(row, "postedUserWinningPoints")}</td><td>{reportRowMetric(row, "platformWinningPoints", true)}</td><td>{reportRowMetric(row, "rewardRequiredPoints", true)}</td><td>{reportRowMetric(row, "targetRoundingAdjustmentPoints", true)}</td><td>{textDimension(row, "settlementMode") === "AUTO" ? "自动发放" : "人工发放"}</td><td>{reportRowMetric(row, "actualNetReturnRate", true)}</td><td><span>{reportRowMetric(row, "differencePercentagePoints", true)} 个百分点</span><span className={styles.cellMeta}>{toleranceLabel}</span></td><td>{disclosureStatus === "—" ? "—" : <StatusBadge label={disclosureLabel(disclosureStatus)} status={disclosureStatus} />}</td><td><StatusBadge label={settlementLabel(settlementStatus)} status={settlementStatus} /></td><td>{textDimension(row, "exceptionReason")}</td></tr>;
}

function defaultFilters(): FilterForm {
  const now = new Date();
  const to = dateInput(now);
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - 30);
  return { from: dateInput(fromDate), to, projectId: "", lotteryId: "", issueCode: "", status: "" };
}

function reportFilters(value: FilterForm): ReportFilter {
  return {
    from: `${value.from}T00:00:00+08:00`,
    to: rangeEndInclusive(value.to),
    projectId: value.projectId.trim() || undefined,
    lotteryId: value.lotteryId.trim() || undefined,
    issueCode: value.issueCode.trim() || undefined,
    status: value.status || undefined,
    groupBy: "POOL_ISSUE",
  };
}

function dateInput(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const part = (type: "year" | "month" | "day") => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function nextDay(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

// 结束日期是"含当天"，所以上界取次日 00:00。但选到"今天"时，这个字面上界在今天结束前
// 一直晚于服务端的 asOf（未显式传时默认取当前时刻），会被后端 "to不能晚于asOf" 拒掉，
// 导致整页固定报 REPORT_FILTER_INVALID。此时把上界夹到"现在"。
// 与 ledger-api.ts 的 shanghaiRangeEndInclusive 保持同一处理方式。
function rangeEndInclusive(value: string): string {
  const endOfDay = `${nextDay(value)}T00:00:00+08:00`;
  const now = new Date().toISOString();
  return new Date(endOfDay).getTime() > new Date(now).getTime() ? now : endOfDay;
}

function safeNameRef(value: unknown) {
  try {
    return nameRef(value);
  } catch {
    return null;
  }
}

function textDimension(row: ReportRow, key: string): string {
  const value = row.dimensions[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "—";
}

function drawText(value: unknown): string {
  if (value === null || value === undefined) return "待开奖";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(drawText).join(" ");
  if (typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    if (Array.isArray(candidate.areas)) return candidate.areas.map((area) => {
      if (typeof area !== "object" || area === null) return "";
      const item = area as Record<string, unknown>;
      return `${typeof item.key === "string" ? item.key : ""} ${drawText(item.chosen)}`.trim();
    }).filter(Boolean).join(" · ");
  }
  return "—";
}

function reportRowMetric(row: ReportRow, key: string, nullable = false): string {
  const value = metric(row.metrics, key);
  if (value === null) return nullable ? "待开奖" : "—";
  return formatMetric(key, value);
}

function reportMetric(values: Readonly<Record<string, unknown>>, key: string): string {
  const value = metric(values, key);
  return value === null ? "—" : formatMetric(key, value);
}

function formatMetric(key: string, value: string): string {
  if (pointMetrics.has(key)) return formatAiPoints(value);
  if (rateMetrics.has(key)) return formatRate(value);
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat("zh-CN").format(number) : value;
}

function rowKey(row: ReportRow, index: number): string {
  const project = safeNameRef(row.dimensions.project);
  return `${project?.id ?? "project"}-${textDimension(row, "issueCode")}-${index}`;
}

function disclosureLabel(status: string): string {
  return { PUBLISHED: "已公示", SUPERSEDED: "已替代" }[status] ?? status;
}

function settlementLabel(status: string): string {
  const labels: Readonly<Record<string, string>> = {
    OPEN: "认购中",
    CUTOFF_PENDING: "截止处理中",
    LOCKED: "已锁定",
    DRAW_PENDING: "待开奖",
    ALLOCATION_PENDING: "待分配",
    DISCLOSED: "已公示",
    DISTRIBUTING: "发放中",
    SETTLED: "已结算",
    CANCELLING: "取消处理中",
    CANCELLED: "已取消",
    CORRECTING: "更正中",
    CORRECTED: "已更正",
    EXCEPTION_PENDING: "异常待处理",
    NO_PARTICIPATION: "无人参与",
  };
  return labels[status] ?? status;
}
