"use client";

import { foregroundPollDelayMs } from "@piao777/api-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionButton,
  InlineNotice,
  PageHeader,
  Panel,
  Tabs,
} from "@/components/admin-workspace/admin-workspace";
import { PageState } from "@/components/page-state/page-state";
import { TaskStatus } from "@/components/task-status/task-status";
import { useAdminSession } from "@/session/admin-session";
import {
  createReportExport,
  getMemberReport,
  getReportExport,
  newIntentKey,
  presentApiError,
  shanghaiDayStart,
  shanghaiNextDayStart,
} from "./member-api";
import {
  formatCount,
  formatDateTime,
  formatPoints,
  formatRate,
  metricText,
  nameRef,
} from "./member-format";
import { MemberNavigation } from "./member-navigation";
import type {
  ExportStatus,
  MemberReportType,
  ReportResult,
  ReportRow,
  TaskAccepted,
} from "./member-models";
import styles from "./member-management.module.css";

interface ReportFilters {
  from: string;
  to: string;
  stationId: string;
  stationMasterId: string;
  vipLevelId: string;
  referralLevelId: string;
}

interface PageCursor {
  cursor?: string | undefined;
  snapshotId?: string | undefined;
}

type MetricKind = "points" | "count" | "rate";

interface ReportColumn {
  key: string;
  label: string;
  source: "dimension" | "metric";
  kind?: MetricKind;
}

interface ReportDefinition {
  title: string;
  description: string;
  columns: readonly ReportColumn[];
  summaries: readonly { key: string; label: string; kind?: MetricKind }[];
}

const reportDefinitions: Readonly<Record<MemberReportType, ReportDefinition>> = {
  MEMBER_OVERVIEW: {
    title: "会员综合",
    description: "站点与站长粒度；期间流量和截至期末存量分列。",
    summaries: [
      { key: "newMemberCount", label: "期间新增会员", kind: "count" },
      { key: "periodGrantedPoints", label: "期间站长加分" },
      { key: "periodDeductedPoints", label: "期间站长扣减" },
      { key: "availablePoints", label: "截至期末可用积分" },
      { key: "settledStakePoints", label: "已结算参与积分" },
      { key: "netProfitPoints", label: "已结算净收益" },
    ],
    columns: [
      { key: "station", label: "站点", source: "dimension" },
      { key: "stationMaster", label: "站长", source: "dimension" },
      { key: "newMemberCount", label: "新增会员", source: "metric", kind: "count" },
      { key: "memberCount", label: "期末会员数", source: "metric", kind: "count" },
      { key: "periodGrantedPoints", label: "期间加分", source: "metric" },
      { key: "periodDeductedPoints", label: "期间扣减", source: "metric" },
      { key: "availablePoints", label: "期末可用", source: "metric" },
      { key: "reservedPoints", label: "期末冻结", source: "metric" },
      { key: "settledStakePoints", label: "已结算参与", source: "metric" },
      { key: "totalWinningPoints", label: "已结算返奖", source: "metric" },
      { key: "netProfitPoints", label: "已结算净收益", source: "metric" },
      { key: "directMemberCount", label: "直属关系数", source: "metric", kind: "count" },
      { key: "directAvailablePoints", label: "直属会员可用积分", source: "metric" },
    ],
  },
  MEMBER_POINTS: {
    title: "站长加分 / 扣减",
    description: "日期与事件归属快照粒度；人数总计由服务端跨日去重。",
    summaries: [
      { key: "rechargeMemberCount", label: "加分会员数", kind: "count" },
      { key: "rechargeCount", label: "加分次数", kind: "count" },
      { key: "periodGrantedPoints", label: "期间加分" },
      { key: "deductMemberCount", label: "扣减会员数", kind: "count" },
      { key: "periodDeductedPoints", label: "期间扣减" },
      { key: "netGrantedPoints", label: "加减净额" },
    ],
    columns: [
      { key: "date", label: "日期", source: "dimension" },
      { key: "station", label: "事件站点", source: "dimension" },
      { key: "stationMaster", label: "事件站长", source: "dimension" },
      { key: "rechargeMemberCount", label: "加分会员数", source: "metric", kind: "count" },
      { key: "rechargeCount", label: "加分次数", source: "metric", kind: "count" },
      { key: "periodGrantedPoints", label: "加分积分", source: "metric" },
      { key: "deductMemberCount", label: "扣减会员数", source: "metric", kind: "count" },
      { key: "deductCount", label: "扣减次数", source: "metric", kind: "count" },
      { key: "periodDeductedPoints", label: "扣减积分", source: "metric" },
      { key: "netGrantedPoints", label: "加减净额", source: "metric" },
      { key: "reversalNetPoints", label: "正式冲正净额", source: "metric" },
    ],
  },
  VIP_LEVELS: {
    title: "VIP 等级",
    description: "指定时点会员分布；额度占用使用该 VIP 会员的 AI 总额度口径。",
    summaries: [
      { key: "memberCount", label: "会员数", kind: "count" },
      { key: "qualifiedRechargePoints", label: "累计充值积分" },
      { key: "vipBaseLimit", label: "VIP 基础额度合计" },
      { key: "totalQuotaLimit", label: "会员 AI 总额度" },
      { key: "quotaUsedPoints", label: "AI 总占用" },
      { key: "upgradeMemberCount", label: "期间升级人数", kind: "count" },
    ],
    columns: [
      { key: "vipLevel", label: "VIP 等级", source: "dimension" },
      { key: "memberCount", label: "会员数", source: "metric", kind: "count" },
      { key: "memberShare", label: "会员占比", source: "metric", kind: "rate" },
      { key: "requiredRechargePoints", label: "有效门槛", source: "metric" },
      { key: "qualifiedRechargePoints", label: "累计充值合计", source: "metric" },
      { key: "vipBaseLimitPerMember", label: "每人基础日额度", source: "metric" },
      { key: "vipBaseLimit", label: "基础额度合计", source: "metric" },
      { key: "totalQuotaLimit", label: "该组 AI 总额度", source: "metric" },
      { key: "quotaUsedPoints", label: "该组 AI 总占用", source: "metric" },
      { key: "quotaUsageRate", label: "AI 总额度使用率", source: "metric", kind: "rate" },
      { key: "upgradeMemberCount", label: "升级人数", source: "metric", kind: "count" },
      { key: "upgradeCount", label: "升级次数", source: "metric", kind: "count" },
    ],
  },
  REFERRAL_LEVELS: {
    title: "推广等级",
    description: "资格、固定奖励义务与 AI 分红分别统计；政策未确认项保持空值。",
    summaries: [
      { key: "memberCount", label: "推荐人数", kind: "count" },
      { key: "directMemberCount", label: "直属关系数", kind: "count" },
      { key: "validMemberCount", label: "有效直属会员", kind: "count" },
      { key: "fixedRewardPostedPoints", label: "固定奖励已发" },
      { key: "aiSharePostedPoints", label: "AI 分红已发" },
      { key: "aiSharePendingPoints", label: "AI 分红待发" },
    ],
    columns: [
      { key: "referralLevel", label: "推广等级", source: "dimension" },
      { key: "fixedRewardPolicyVersion", label: "D06 政策版本", source: "dimension" },
      { key: "aiSharePolicyVersion", label: "D07 政策版本", source: "dimension" },
      { key: "memberCount", label: "推荐人数", source: "metric", kind: "count" },
      { key: "directMemberCount", label: "直属关系", source: "metric", kind: "count" },
      { key: "validMemberCount", label: "有效直属会员", source: "metric", kind: "count" },
      { key: "validRate", label: "有效率", source: "metric", kind: "rate" },
      { key: "fixedRewardCount", label: "固定奖励义务", source: "metric", kind: "count" },
      { key: "fixedRewardPostedCount", label: "已发次数", source: "metric", kind: "count" },
      { key: "fixedRewardDuePoints", label: "固定奖励应发", source: "metric" },
      { key: "fixedRewardPostedPoints", label: "固定奖励已发", source: "metric" },
      { key: "aiShareBasisPoints", label: "AI 分红政策基数", source: "metric" },
      { key: "lockedAiShareRate", label: "锁定分红率", source: "metric", kind: "rate" },
      { key: "aiSharePostedPoints", label: "AI 分红已发", source: "metric" },
      { key: "aiSharePendingPoints", label: "AI 分红待发", source: "metric" },
      { key: "referralExtraLimit", label: "推广附加额度", source: "metric" },
    ],
  },
  AI_QUOTA: {
    title: "AI 合买额度",
    description: "用户日唯一额度；总额度、净占用与逐人剩余均由服务端同一快照汇总。",
    summaries: [
      { key: "memberCount", label: "会员数", kind: "count" },
      { key: "vipBaseLimit", label: "VIP 基础额度" },
      { key: "referralExtraLimit", label: "推广附加额度" },
      { key: "totalQuotaLimit", label: "当日总额度" },
      { key: "quotaUsedPoints", label: "净占用" },
      { key: "quotaRemainingPoints", label: "逐人剩余汇总" },
    ],
    columns: [
      { key: "date", label: "额度日", source: "dimension" },
      { key: "vipLevel", label: "VIP 等级", source: "dimension" },
      { key: "referralLevel", label: "推广等级", source: "dimension" },
      { key: "memberCount", label: "会员数", source: "metric", kind: "count" },
      { key: "vipBaseLimit", label: "VIP 基础额度", source: "metric" },
      { key: "referralExtraLimit", label: "推广附加额度", source: "metric" },
      { key: "totalQuotaLimit", label: "总额度", source: "metric" },
      { key: "quotaOccupiedPoints", label: "成功占用", source: "metric" },
      { key: "quotaReleasedPoints", label: "原日退款释放", source: "metric" },
      { key: "quotaUsedPoints", label: "净占用", source: "metric" },
      { key: "quotaRemainingPoints", label: "逐人剩余汇总", source: "metric" },
      { key: "quotaUsageRate", label: "使用率", source: "metric", kind: "rate" },
      { key: "interceptCount", label: "超限拦截", source: "metric", kind: "count" },
      { key: "rebuildingMemberCount", label: "资格重算中", source: "metric", kind: "count" },
    ],
  },
};

const reportTabs = (Object.keys(reportDefinitions) as MemberReportType[]).map((id) => ({
  id,
  label: reportDefinitions[id].title,
}));

export function MemberReportsPage() {
  const session = useAdminSession();
  const canView = session.identity?.permissions.includes("report:view") ?? false;
  const canExport = session.identity?.permissions.includes("report:export") ?? false;
  const [tab, setTab] = useState<MemberReportType>("MEMBER_OVERVIEW");
  const [draft, setDraft] = useState<ReportFilters>(() => defaultFilters());
  const [applied, setApplied] = useState<ReportFilters>(() => defaultFilters());
  const [cursorStack, setCursorStack] = useState<readonly PageCursor[]>([{}]);
  const [report, setReport] = useState<ReportResult | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "forbidden" | "not-ready">("loading");
  const [error, setError] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<"CSV" | "XLSX">("XLSX");
  const [exportIntentKey, setExportIntentKey] = useState<string | null>(null);
  const [exportSubmitting, setExportSubmitting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null);
  const [exportAccepted, setExportAccepted] = useState<TaskAccepted | null>(null);
  const loadSequence = useRef(0);
  const cursorState = useMemo(
    () => cursorStack[cursorStack.length - 1] ?? {},
    [cursorStack],
  );

  const load = useCallback(async (
    type: MemberReportType,
    filters: ReportFilters,
    pageCursor: PageCursor,
  ) => {
    const sequence = ++loadSequence.current;
    if (!canView) {
      setStatus("forbidden");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const result = await getMemberReport(type, {
        from: shanghaiDayStart(filters.from),
        to: shanghaiNextDayStart(filters.to),
        stationId: clean(filters.stationId),
        stationMasterId: clean(filters.stationMasterId),
        vipLevelId: supportsVip(type) ? clean(filters.vipLevelId) : undefined,
        referralLevelId: supportsReferral(type) ? clean(filters.referralLevelId) : undefined,
        snapshotId: pageCursor.snapshotId,
        cursor: pageCursor.cursor,
        limit: 40,
      });
      if (sequence !== loadSequence.current) return;
      setReport(result);
      setStatus("ready");
    } catch (cause) {
      if (sequence !== loadSequence.current) return;
      const presented = presentApiError(cause);
      if (presented.kind === "forbidden") setStatus("forbidden");
      else if (presented.kind === "not-ready") setStatus("not-ready");
      else if (presented.kind === "conflict" && pageCursor.snapshotId !== undefined) {
        setCursorStack([{}]);
        setStatus("loading");
      }
      else setStatus("error");
      setError(presented.message);
    }
  }, [canView]);

  useEffect(() => {
    if (session.status === "authenticated") void load(tab, applied, cursorState);
  }, [applied, cursorState, load, session.status, tab]);

  useEffect(() => {
    if (exportAccepted === null) return undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      try {
        const result = await getReportExport(exportAccepted.statusUrl);
        if (cancelled) return;
        setExportStatus(result);
        setExportError(null);
        if (result.status === "PENDING" || result.status === "RUNNING") {
          timer = setTimeout(poll, foregroundPollDelayMs(exportAccepted.pollAfterSeconds));
        }
      } catch (cause) {
        if (!cancelled) setExportError(presentApiError(cause).message);
      }
    };
    timer = setTimeout(poll, foregroundPollDelayMs(exportAccepted.pollAfterSeconds));
    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
    };
  }, [exportAccepted]);

  const definition = reportDefinitions[tab];
  const ruleUnready = useMemo(() => report !== null && reportSignalsUnready(report), [report]);

  function resetPaginationAndExport() {
    setCursorStack([{}]);
    setExportIntentKey(null);
    setExportError(null);
    setExportStatus(null);
    setExportAccepted(null);
  }

  async function startExport() {
    if (report === null) return;
    const key = exportIntentKey ?? newIntentKey("createReportExport");
    setExportIntentKey(key);
    setExportSubmitting(true);
    setExportError(null);
    setExportStatus(null);
    try {
      const accepted = await createReportExport({
        reportType: report.reportType,
        filters: report.filters,
        snapshotId: report.snapshotId,
        format: exportFormat,
        idempotencyKey: key,
      });
      setExportAccepted(accepted);
    } catch (cause) {
      const presented = presentApiError(cause);
      setExportError(presented.message);
      if (!presented.submissionUnknown) setExportIntentKey(null);
    } finally {
      setExportSubmitting(false);
    }
  }

  return (
    <>
      <MemberNavigation />
      <PageHeader
        actions={<ActionButton onClick={() => void load(tab, applied, cursorState)}>刷新当前报表</ActionButton>}
        description="五类会员报表使用同一筛选快照返回明细与全量总计；导出复用相同数据水位与指标版本。"
        pageId="A21"
        title="会员数据报表"
      />

      <Panel description="日期结束日包含全天，前端按上海时区转换为服务端半开区间。" title="报表筛选">
        <form className={styles.filterBar} onSubmit={(event) => {
          event.preventDefault();
          resetPaginationAndExport();
          setApplied({ ...draft });
        }}>
          <label className={styles.field}><span>开始日期</span><input max={shanghaiPreviousDay()} onChange={(event) => setDraft((value) => ({ ...value, from: event.target.value }))} required type="date" value={draft.from} /></label>
          <label className={styles.field}><span>结束日期</span><input max={shanghaiPreviousDay()} min={draft.from} onChange={(event) => setDraft((value) => ({ ...value, to: event.target.value }))} required type="date" value={draft.to} /></label>
          <label className={styles.field}><span>站点 ID</span><input onChange={(event) => setDraft((value) => ({ ...value, stationId: event.target.value }))} placeholder="留空表示授权范围" value={draft.stationId} /></label>
          <label className={styles.field}><span>站长 ID</span><input onChange={(event) => setDraft((value) => ({ ...value, stationMasterId: event.target.value }))} placeholder="留空表示全部" value={draft.stationMasterId} /></label>
          <label className={styles.field}><span>VIP 等级 ID</span><input disabled={!supportsVip(tab)} onChange={(event) => setDraft((value) => ({ ...value, vipLevelId: event.target.value }))} placeholder={supportsVip(tab) ? "留空表示全部" : "当前报表不适用"} value={draft.vipLevelId} /></label>
          <label className={styles.field}><span>推广等级 ID</span><input disabled={!supportsReferral(tab)} onChange={(event) => setDraft((value) => ({ ...value, referralLevelId: event.target.value }))} placeholder={supportsReferral(tab) ? "留空表示全部" : "当前报表不适用"} value={draft.referralLevelId} /></label>
          <div className={styles.filterActions}><ActionButton type="submit" variant="primary">应用筛选</ActionButton><ActionButton onClick={() => {
            const next = defaultFilters();
            setDraft(next); setApplied(next); resetPaginationAndExport();
          }} type="button">重置</ActionButton></div>
        </form>
      </Panel>

      <Panel description={definition.description} flush title="报表结果">
        <div className={styles.reportTabs}>
          <Tabs items={reportTabs} label="会员报表类型" onChange={(next) => {
            setTab(next); resetPaginationAndExport();
          }} value={tab} />
        </div>
        {status === "loading" ? <PageState kind="loading" title={`正在生成${definition.title}快照`} /> : null}
        {status === "forbidden" ? <PageState description={error ?? undefined} kind="forbidden" /> : null}
        {status === "not-ready" ? <PageState description={error ?? undefined} kind="not-ready" /> : null}
        {status === "error" ? <PageState action={<ActionButton onClick={() => void load(tab, applied, cursorState)}>重试</ActionButton>} description={error ?? undefined} kind="error" /> : null}
        {status === "ready" && report !== null ? (
          <>
            <div className={styles.reportMeta}>
              <span>数据截至 {formatDateTime(report.asOf)}</span>
              <span>指标版本 <code>{report.metricDictionaryVersion}</code></span>
              <span>投影版本 <code>{report.projectionVersion}</code></span>
              <span>水位 <code>{report.sourceWatermark}</code></span>
              <span>快照 <code>{report.snapshotId}</code></span>
            </div>
            {!report.complete ? <InlineNotice title="投影尚未完成" tone="warning">当前快照明确标记为不完整，不会把缺失指标填成 0。</InlineNotice> : null}
            {ruleUnready ? <InlineNotice title="规则或政策未就绪" tone="warning">D06—D08 相关指标由服务端返回空值；页面不会用原型奖励、比例或额度补齐。</InlineNotice> : null}
            <SummaryStrip definition={definition} totals={report.totals} />
            {report.items.length === 0 ? <PageState kind="empty" title="当前筛选没有报表数据" /> : <ReportTable definition={definition} report={report} />}
            <div className={styles.pagination}>
              <span>第 {cursorStack.length} 页 · 总计范围 FULL_FILTER</span>
              <ActionButton disabled={cursorStack.length === 1} onClick={() => setCursorStack((value) => value.slice(0, -1))}>上一页</ActionButton>
              <ActionButton disabled={!report.hasMore || report.nextCursor === null} onClick={() => {
                const nextCursor = report.nextCursor;
                if (nextCursor !== null) setCursorStack((value) => [...value, { cursor: nextCursor, snapshotId: report.snapshotId }]);
              }}>下一页</ActionButton>
            </div>
          </>
        ) : null}
      </Panel>

      <Panel description="导出当前筛选的全量结果，不是当前页；任务完成后再次校验下载权限。" title="导出当前报表">
        <div className={styles.exportActions}>
          <label className={styles.field}><span>文件格式</span><select onChange={(event) => setExportFormat(event.target.value as "CSV" | "XLSX")} value={exportFormat}><option value="XLSX">XLSX</option><option value="CSV">CSV</option></select></label>
          <ActionButton disabled={!canExport || report === null || status !== "ready" || exportSubmitting || exportAccepted !== null} onClick={() => void startExport()} variant="primary">{exportSubmitting ? "提交中" : exportIntentKey === null ? "创建导出任务" : "按原幂等意图重试"}</ActionButton>
          {!canExport ? <span className={styles.muted}>当前员工没有报表导出权限。</span> : null}
        </div>
        {exportAccepted === null ? null : <TaskStatus progress={exportProgress(exportStatus)} status={exportTaskStatus(exportStatus?.status ?? exportAccepted.status)} />}
        {exportError === null ? null : <p className={styles.inlineMessage} data-tone="danger">{exportError}</p>}
        {exportStatus !== null && exportTerminal(exportStatus.status) ? (
          <ActionButton onClick={() => {
            setExportAccepted(null);
            setExportIntentKey(null);
            setExportError(null);
            setExportStatus(null);
          }}>清除任务状态</ActionButton>
        ) : null}
        {exportStatus === null ? null : (
          <div className={styles.exportResult}>
            <div className={styles.entity}><strong>导出 {exportStatus.status}</strong><small>{formatCount(exportStatus.rowCount)} 行 · 过期 {formatDateTime(exportStatus.expiresAt)}</small></div>
            {exportStatus.status === "COMPLETED" && exportStatus.downloadUrl !== null ? <a className={styles.downloadLink} download={exportStatus.downloadUrl.split("#")[1]} href={exportStatus.downloadUrl}>下载文件</a> : null}
          </div>
        )}
      </Panel>
    </>
  );
}

function SummaryStrip({ definition, totals }: Readonly<{ definition: ReportDefinition; totals: Readonly<Record<string, unknown>> }>) {
  return (
    <div className={styles.summaryStrip}>
      {definition.summaries.map((item) => <div className={styles.summaryItem} key={item.key}><span>{item.label}</span><strong>{metricText(totals, item.key, item.kind)}</strong></div>)}
    </div>
  );
}

function ReportTable({ definition, report }: Readonly<{ definition: ReportDefinition; report: ReportResult }>) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table} data-width="report">
        <thead><tr>{definition.columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
        <tbody>{report.items.map((row, index) => <tr key={`${report.snapshotId}:${index}`}>{definition.columns.map((column) => <td key={column.key}>{column.source === "dimension" ? dimensionCell(row, column.key) : metricCell(row, column.key, column.kind)}</td>)}</tr>)}</tbody>
        <tfoot><tr>{definition.columns.map((column, index) => <td key={column.key}>{index === 0 ? "全部筛选总计" : column.source === "metric" ? metricCell({ dimensions: {}, metrics: report.totals }, column.key, column.kind) : "—"}</td>)}</tr></tfoot>
      </table>
    </div>
  );
}

function dimensionCell(row: ReportRow, key: string) {
  const value = row.dimensions[key];
  const reference = nameRef(value);
  if (reference !== null) return <div className={styles.reportDimension}><strong>{reference.name}</strong><small>{reference.code}</small></div>;
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "—";
  return JSON.stringify(value);
}

function metricCell(row: ReportRow, key: string, kind: MetricKind = "points"): string {
  const value = row.metrics[key];
  if (value === null || value === undefined) return "—";
  if (kind === "count") return formatCount(value);
  if (kind === "rate") return formatRate(value);
  return typeof value === "string" ? formatPoints(value) : "—";
}

function reportSignalsUnready(report: ReportResult): boolean {
  if (report.reportType === "REFERRAL_LEVELS") {
    return report.items.some((row) => row.metrics.fixedRewardDuePoints === null || row.metrics.aiShareBasisPoints === null);
  }
  if (report.reportType === "AI_QUOTA") {
    return report.items.some((row) => row.metrics.totalQuotaLimit === null);
  }
  return false;
}

function supportsVip(type: MemberReportType): boolean {
  return type === "VIP_LEVELS" || type === "AI_QUOTA";
}

function supportsReferral(type: MemberReportType): boolean {
  return type === "REFERRAL_LEVELS" || type === "AI_QUOTA";
}

function clean(value: string): string | undefined {
  return value.trim() === "" ? undefined : value.trim();
}

function exportTerminal(status: ExportStatus["status"]): boolean {
  return status === "COMPLETED" || status === "FAILED" || status === "EXPIRED";
}

function exportTaskStatus(status: ExportStatus["status"] | TaskAccepted["status"]): string {
  if (status === "COMPLETED" || status === "EXPIRED") return "SUCCEEDED";
  return status;
}

function exportProgress(status: ExportStatus | null): number {
  if (status === null || status.status === "PENDING") return 0;
  if (status.status === "RUNNING") return 0.5;
  return 1;
}

function defaultFilters(): ReportFilters {
  const endDay = shanghaiPreviousDay();
  return {
    from: `${endDay.slice(0, 7)}-01`,
    to: endDay,
    stationId: "",
    stationMasterId: "",
    vipLevelId: "",
    referralLevelId: "",
  };
}

function shanghaiToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function shanghaiPreviousDay(): string {
  const [year, month, day] = shanghaiToday().split("-").map(Number);
  const previous = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) - 1));
  return [
    previous.getUTCFullYear().toString().padStart(4, "0"),
    (previous.getUTCMonth() + 1).toString().padStart(2, "0"),
    previous.getUTCDate().toString().padStart(2, "0"),
  ].join("-");
}
