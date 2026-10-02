"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionButton,
  DataTimestamp,
  InlineNotice,
  MetricStrip,
  StatusBadge,
} from "@/components/admin-workspace/admin-workspace";
import { PageState } from "@/components/page-state/page-state";
import {
  apiErrorMessage,
  createReportExport,
  formatPoints,
  getReportExport,
  getStationMasterReport,
  isForbiddenError,
  isNotReadyError,
  listAdminStationLedgers,
  listStationMasters,
  listStations,
  newIntentKey,
  shanghaiDayStart,
} from "./station-management-api";
import {
  reportDimensionName,
  reportMetric,
  type ExportStatus,
  type LedgerView,
  type ReportFilter,
  type Station,
  type StationMaster,
  type StationMasterReport,
  type TaskAccepted,
} from "./station-management-models";
import styles from "./station-management.module.css";

interface Props {
  permissions: readonly string[];
}

interface ReportFilters {
  from: string;
  to: string;
  stationId: string;
  stationMasterId: string;
  affiliationMode: "CURRENT_COHORT" | "EVENT_AFFILIATION";
}

interface LedgerSnapshot {
  items: readonly LedgerView[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function LedgerReportTab({ permissions }: Props) {
  const canReport = permissions.includes("report:view");
  const canExport = permissions.includes("report:export");
  const canLedger = permissions.includes("station-master:points:view");
  const canMasterView = permissions.includes("station-master:view");
  const canStationView = permissions.includes("station:view");
  const [draftFilters, setDraftFilters] = useState<ReportFilters>(defaultFilters);
  const [filters, setFilters] = useState<ReportFilters>(defaultFilters);
  const [masters, setMasters] = useState<readonly StationMaster[]>([]);
  const [stations, setStations] = useState<readonly Station[]>([]);
  const [report, setReport] = useState<StationMasterReport | null>(null);
  const [ledger, setLedger] = useState<LedgerSnapshot | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "forbidden" | "not-ready">("loading");
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [exportTask, setExportTask] = useState<TaskAccepted | null>(null);
  const [exportId, setExportId] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null);
  const [exporting, setExporting] = useState(false);

  const query = useMemo<ReportFilter>(() => ({
    from: shanghaiDayStart(filters.from),
    to: inclusiveShanghaiEnd(filters.to),
    ...(filters.stationId === "" ? {} : { stationId: filters.stationId }),
    ...(filters.stationMasterId === "" ? {} : { stationMasterId: filters.stationMasterId }),
    affiliationMode: filters.affiliationMode,
    groupBy: "STATION_MASTER",
  }), [filters]);

  const load = useCallback(async () => {
    if (!canReport && !canLedger) {
      setStatus("forbidden");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const ledgerScopeUnavailable = filters.stationId !== "" && filters.stationMasterId === "";
      const [reportResult, ledgerResult, masterResult, stationResult] = await Promise.all([
        canReport ? getStationMasterReport({ filters: query }) : Promise.resolve(null),
        canLedger && !ledgerScopeUnavailable ? listAdminStationLedgers({
          ...(filters.stationMasterId === "" ? {} : { stationMasterId: filters.stationMasterId }),
          from: query.from,
          to: query.to,
        }) : Promise.resolve(null),
        canMasterView ? listStationMasters() : Promise.resolve(null),
        canStationView ? listStations() : Promise.resolve(null),
      ]);
      setReport(reportResult);
      setLedger(ledgerResult === null ? null : {
        items: ledgerResult.items,
        nextCursor: ledgerResult.nextCursor,
        hasMore: ledgerResult.hasMore,
      });
      if (masterResult !== null) {
        setMasters(masterResult.items);
      }
      if (stationResult !== null) {
        setStations(stationResult.items);
      }
      setStatus("ready");
    } catch (cause) {
      setError(apiErrorMessage(cause));
      setStatus(isForbiddenError(cause) ? "forbidden" : isNotReadyError(cause) ? "not-ready" : "error");
    }
  }, [canLedger, canMasterView, canReport, canStationView, filters.stationId, filters.stationMasterId, query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadMoreReport() {
    if (report?.nextCursor === null || report === null) return;
    try {
      const next = await getStationMasterReport({ filters: report.filters, cursor: report.nextCursor });
      setReport({ ...next, items: [...report.items, ...next.items] });
    } catch (cause) {
      setFeedback(apiErrorMessage(cause));
    }
  }

  async function loadMoreLedger() {
    if (ledger?.nextCursor === null || ledger === null) return;
    try {
      const next = await listAdminStationLedgers({
        ...(filters.stationMasterId === "" ? {} : { stationMasterId: filters.stationMasterId }),
        from: query.from,
        to: query.to,
        cursor: ledger.nextCursor,
      });
      setLedger({
        items: [...ledger.items, ...next.items],
        nextCursor: next.nextCursor,
        hasMore: next.hasMore,
      });
    } catch (cause) {
      setFeedback(apiErrorMessage(cause));
    }
  }

  async function beginExport(format: "CSV" | "XLSX") {
    if (report === null) return;
    setExporting(true);
    setFeedback(null);
    setExportStatus(null);
    try {
      const task = await createReportExport({
        report,
        format,
        idempotencyKey: newIntentKey("createReportExport"),
      });
      setExportTask(task);
      setExportId(exportIdFromStatusUrl(task.statusUrl));
      setFeedback("导出任务已受理，尚未生成文件；完成后下载仍会再次校验当前权限。");
    } catch (cause) {
      setFeedback(apiErrorMessage(cause));
    } finally {
      setExporting(false);
    }
  }

  async function refreshExport() {
    if (exportId === null) return;
    setExporting(true);
    setFeedback(null);
    try {
      const current = await getReportExport(exportId);
      setExportStatus(current);
      setFeedback(current.status === "COMPLETED"
        ? "导出文件已生成，请在短期授权失效前下载。"
        : current.status === "FAILED"
          ? "导出任务失败，没有生成可下载文件。"
          : current.status === "EXPIRED"
            ? "导出文件授权已过期，请基于当前报表快照重新创建。"
            : "导出仍在处理中，受理状态不代表文件已生成。");
    } catch (cause) {
      setFeedback(apiErrorMessage(cause));
    } finally {
      setExporting(false);
    }
  }

  if (!canReport && !canLedger) {
    return <PageState description="当前员工没有站长报表或额度流水查看权限。" kind="forbidden" />;
  }

  return (
    <>
      <div className={styles.sectionLead}>
        <div>
          <strong>A12 · 站长额度及会员操作报表</strong>
          <span>明细和底部总计来自同一报表快照；历史归属口径由筛选明确选择。</span>
        </div>
        {canExport && report !== null ? <div className={styles.headerActions}>
          <ActionButton disabled={exporting || exportTask !== null} onClick={() => void beginExport("CSV")}>导出 CSV</ActionButton>
          <ActionButton disabled={exporting || exportTask !== null} onClick={() => void beginExport("XLSX")}>导出 XLSX</ActionButton>
        </div> : null}
      </div>

      <form className={styles.filterBar} onSubmit={(event) => {
        event.preventDefault();
        setFilters({ ...draftFilters });
        setExportTask(null);
        setExportId(null);
        setExportStatus(null);
      }}>
        <label className={styles.field}><span>开始日期</span><input max={shanghaiDate(new Date())} onChange={(event) => setDraftFilters((value) => ({ ...value, from: event.target.value }))} required type="date" value={draftFilters.from} /></label>
        <label className={styles.field}><span>结束日期</span><input max={shanghaiDate(new Date())} onChange={(event) => setDraftFilters((value) => ({ ...value, to: event.target.value }))} required type="date" value={draftFilters.to} /></label>
        {stations.length > 0 ? <label className={styles.field}><span>站点</span><select onChange={(event) => setDraftFilters((value) => ({ ...value, stationId: event.target.value, stationMasterId: "" }))} value={draftFilters.stationId}><option value="">全部授权站点</option>{stations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}</select></label> : null}
        {masters.length > 0 ? <label className={styles.field}><span>站长</span><select onChange={(event) => setDraftFilters((value) => ({ ...value, stationMasterId: event.target.value }))} value={draftFilters.stationMasterId}><option value="">全部授权站长</option>{masters.filter((master) => draftFilters.stationId === "" || master.station.id === draftFilters.stationId).map((master) => <option key={master.id} value={master.id}>{master.name} · {master.code}</option>)}</select></label> : null}
        <label className={styles.field}><span>归属口径</span><select onChange={(event) => setDraftFilters((value) => ({ ...value, affiliationMode: event.target.value as ReportFilters["affiliationMode"] }))} value={draftFilters.affiliationMode}><option value="CURRENT_COHORT">当前名下群体</option><option value="EVENT_AFFILIATION">业务发生时归属快照</option></select></label>
        <ActionButton type="submit" variant="primary">应用筛选</ActionButton>
      </form>

      {exportTask === null ? null : <div className={styles.commandBar}>
        <div><strong>导出任务 {exportTask.taskId}</strong><span>当前 {exportTask.status}，建议 {exportTask.pollAfterSeconds} 秒后查询；页面不会把受理显示为完成。</span></div>
        <ActionButton disabled={exporting || exportId === null} onClick={() => void refreshExport()}>查询导出状态</ActionButton>
      </div>}
      {exportStatus === null ? null : <ExportResult value={exportStatus} />}
      {feedback === null ? null : <p className={styles.feedback} role="status">{feedback}</p>}

      {status === "loading" ? <PageState kind="loading" title="正在读取报表与账本事实" /> : null}
      {status === "forbidden" ? <PageState kind="forbidden" /> : null}
      {status === "not-ready" ? <PageState kind="not-ready" description={error ?? undefined} /> : null}
      {status === "error" ? <PageState action={<ActionButton onClick={() => void load()}>重试</ActionButton>} description={error ?? undefined} kind="error" /> : null}

      {status === "ready" ? <>
        {report === null ? <PageState description="当前员工没有报表查看权限；仍可在下方查看获授权的额度流水。" kind="forbidden" title="无报表权限" /> : <ReportSection onLoadMore={() => void loadMoreReport()} report={report} />}
        {ledger === null ? (
          filters.stationId !== "" && filters.stationMasterId === ""
            ? <PageState description="额度流水契约不能按站点直接筛选；请选择该站点下的具体站长后再下钻，避免展示超出报表筛选的流水。" kind="not-ready" title="请选择站长下钻" />
            : <PageState description="当前员工没有站长额度流水查看权限。" kind="forbidden" title="无流水权限" />
        ) : <LedgerSection ledger={ledger} onLoadMore={() => void loadMoreLedger()} />}
      </> : null}
    </>
  );
}

function ReportSection({ report, onLoadMore }: { report: StationMasterReport; onLoadMore(): void }) {
  const metrics = [
    { label: "期初站长额度", value: points(report.totals, "openingBalancePoints"), detail: "全筛选事实" },
    { label: "运营拨付", value: points(report.totals, "periodGrantedPoints"), detail: "平台预算转入" },
    { label: "运营回收", value: points(report.totals, "periodDeductedPoints"), detail: "站长额度转回" },
    { label: "会员加分", value: points(report.totals, "memberGrantedPoints"), detail: "站长转出" },
    { label: "会员减分", value: points(report.totals, "memberDeductedPoints"), detail: "站长收回" },
    { label: "期末站长额度", value: points(report.totals, "endingBalancePoints"), detail: report.totalScope === "FULL_FILTER" ? "完整筛选总计" : report.totalScope },
  ];
  return <section className={styles.reportSection}>
    <div className={styles.subsectionHeader}>
      <div><strong>额度与会员操作报表</strong><span>快照 {report.snapshotId} · 水位 {report.sourceWatermark}</span></div>
      <DataTimestamp value={report.asOf} />
    </div>
    {!report.complete ? <InlineNotice title="报表快照尚未完整" tone="warning">服务端标记 complete=false；当前结果不能视作完整全量。</InlineNotice> : null}
    <MetricStrip items={metrics} />
    {report.items.length === 0 ? <PageState kind="empty" title="当前筛选没有报表明细" /> : <div className={styles.tableWrap}>
      <table className={styles.table} data-wide="true">
        <thead><tr><th>站长</th><th>站点</th><th>期初额度</th><th>运营拨付</th><th>运营回收</th><th>会员加分</th><th>会员减分</th><th>净转出</th><th>期末额度</th></tr></thead>
        <tbody>{report.items.map((row, index) => <tr key={`${reportDimensionName(row.dimensions, "stationMaster")}-${index}`}>
          <td><span className={styles.entity}><strong>{reportDimensionName(row.dimensions, "stationMaster")}</strong></span></td>
          <td>{reportDimensionName(row.dimensions, "station")}</td>
          <td>{points(row.metrics, "openingBalancePoints")}</td>
          <td className={styles.positive}>{prefixedPoints(row.metrics, "periodGrantedPoints", "+")}</td>
          <td className={styles.negative}>{prefixedPoints(row.metrics, "periodDeductedPoints", "-")}</td>
          <td>{points(row.metrics, "memberGrantedPoints")}</td>
          <td>{points(row.metrics, "memberDeductedPoints")}</td>
          <td>{netMemberFlow(row.metrics)}</td>
          <td><strong>{points(row.metrics, "endingBalancePoints")}</strong></td>
        </tr>)}</tbody>
        <tfoot><tr><th colSpan={2}>完整筛选总计</th><th>{points(report.totals, "openingBalancePoints")}</th><th>{prefixedPoints(report.totals, "periodGrantedPoints", "+")}</th><th>{prefixedPoints(report.totals, "periodDeductedPoints", "-")}</th><th>{points(report.totals, "memberGrantedPoints")}</th><th>{points(report.totals, "memberDeductedPoints")}</th><th>{netMemberFlow(report.totals)}</th><th>{points(report.totals, "endingBalancePoints")}</th></tr></tfoot>
      </table>
    </div>}
    {report.hasMore && report.nextCursor !== null ? <div className={styles.loadMore}><ActionButton onClick={onLoadMore}>加载更多报表明细</ActionButton></div> : null}
  </section>;
}

function LedgerSection({ ledger, onLoadMore }: { ledger: LedgerSnapshot; onLoadMore(): void }) {
  return <section className={styles.reportSection}>
    <div className={styles.subsectionHeader}><div><strong>A11 · 站长额度流水下钻</strong><span>流水不可直接编辑；错误操作只能引用原交易追加冲正。</span></div></div>
    {ledger.items.length === 0 ? <PageState kind="empty" title="当前筛选没有额度流水" /> : <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr><th>时间</th><th>流水号</th><th>类型</th><th>变动积分</th><th>变动前</th><th>变动后</th><th>来源</th><th>原因</th></tr></thead>
        <tbody>{ledger.items.map((item) => <tr key={item.id}>
          <td>{formatDateTime(item.createdAt)}</td>
          <td><code className={styles.mono}>{item.transactionId}</code></td>
          <td><StatusBadge label={ledgerTypeLabel(item.type)} status={item.type} /></td>
          <td className={item.changePoints.startsWith("-") ? styles.negative : styles.positive}>{formatPoints(item.changePoints)}</td>
          <td>{formatPoints(item.balanceBefore)}</td>
          <td><strong>{formatPoints(item.balanceAfter)}</strong></td>
          <td><span className={styles.entity}><strong>{item.sourceType}</strong><small>{item.sourceId}</small></span></td>
          <td>{item.remark || "—"}</td>
        </tr>)}</tbody>
      </table>
    </div>}
    {ledger.hasMore && ledger.nextCursor !== null ? <div className={styles.loadMore}><ActionButton onClick={onLoadMore}>加载更多流水</ActionButton></div> : null}
  </section>;
}

function ExportResult({ value }: { value: ExportStatus }) {
  return <InlineNotice title={`导出状态：${value.status}`} tone={value.status === "COMPLETED" ? "success" : value.status === "FAILED" || value.status === "EXPIRED" ? "danger" : "warning"}>
    已生成 {value.rowCount} 行。{value.status === "COMPLETED" && value.downloadUrl !== null
      ? <a className={styles.inlineLink} download={value.downloadUrl.split("#")[1]} href={value.downloadUrl} rel="noreferrer">下载文件（授权至 {value.expiresAt === null ? "未提供" : formatDateTime(value.expiresAt)}）</a>
      : "完成前不提供下载地址。"}
  </InlineNotice>;
}

function defaultFilters(): ReportFilters {
  const today = shanghaiDate(new Date());
  return { from: `${today.slice(0, 7)}-01`, to: today, stationId: "", stationMasterId: "", affiliationMode: "CURRENT_COHORT" };
}

function shanghaiDate(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

function inclusiveShanghaiEnd(value: string): string {
  const now = new Date();
  if (value >= shanghaiDate(now)) {
    return now.toISOString();
  }
  const next = new Date(`${value}T00:00:00+08:00`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

function points(metrics: Readonly<Record<string, unknown>>, key: string): string {
  const value = reportMetric(metrics, key);
  return value === "—" ? value : formatPoints(value);
}

function prefixedPoints(
  metrics: Readonly<Record<string, unknown>>,
  key: string,
  prefix: "+" | "-",
): string {
  const value = points(metrics, key);
  return value === "—" ? value : `${prefix}${value}`;
}

function netMemberFlow(metrics: Readonly<Record<string, unknown>>): string {
  const granted = reportMetric(metrics, "memberGrantedPoints");
  const deducted = reportMetric(metrics, "memberDeductedPoints");
  if (granted === "—" || deducted === "—") return "—";
  const result = subtractDecimalPoints(granted, deducted);
  return result === null ? "—" : formatPoints(result);
}

function exportIdFromStatusUrl(statusUrl: string): string {
  const parts = statusUrl.split("/").filter(Boolean);
  const value = parts.at(-1);
  if (value === undefined || value === "") {
    throw new TypeError("EXPORT_STATUS_URL_MISMATCH");
  }
  return value;
}

function ledgerTypeLabel(type: string): string {
  if (type === "ADMIN_GRANT") return "运营拨付";
  if (type === "ADMIN_DEDUCT") return "运营回收";
  if (type === "STATION_VIP_CREDIT") return "会员加分支出";
  if (type === "STATION_DEBIT") return "会员减分返还";
  return type;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date);
}

function subtractDecimalPoints(left: string, right: string): string | null {
  const toMinor = (value: string) => {
    const match = /^(0|[1-9][0-9]{0,35})\.([0-9]{2})$/.exec(value);
    const integer = match?.[1];
    const decimal = match?.[2];
    return integer === undefined || decimal === undefined
      ? null
      : BigInt(integer) * 100n + BigInt(decimal);
  };
  const leftMinor = toMinor(left);
  const rightMinor = toMinor(right);
  if (leftMinor === null || rightMinor === null) return null;
  const result = leftMinor - rightMinor;
  const absolute = result < 0n ? -result : result;
  return `${result < 0n ? "-" : ""}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}
