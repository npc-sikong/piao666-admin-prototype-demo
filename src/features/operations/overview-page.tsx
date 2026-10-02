"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionButton,
  DataTimestamp,
  MetricStrip,
  PageHeader,
  Panel,
} from "@/components/admin-workspace/admin-workspace";
import { PageState } from "@/components/page-state/page-state";
import { useAdminSession } from "@/session/admin-session";
import {
  apiErrorMessage,
  getAdminReport,
  getDataHealth,
  isForbiddenError,
  shanghaiDayEnd,
  shanghaiDayStart,
} from "./operations-api";
import {
  metricText,
  type DataHealthPage,
  type ReportResult,
} from "./operations-models";
import styles from "./operations-pages.module.css";

interface OverviewSnapshot {
  member: ReportResult | null;
  referral: ReportResult | null;
  pools: ReportResult | null;
  reconciliation: ReportResult | null;
  reconciliationIncluded: boolean;
  health: DataHealthPage | null;
}

interface OverviewFilters {
  from: string;
  to: string;
  stationId: string;
}

interface ExceptionItem {
  key: string;
  title: string;
  description: string;
  href: string;
  tone: "warning" | "danger";
}

export function OverviewPage() {
  const session = useAdminSession();
  const [filters, setFilters] = useState<OverviewFilters>(() => defaultFilters());
  const [applied, setApplied] = useState<OverviewFilters>(() => defaultFilters());
  const [snapshot, setSnapshot] = useState<OverviewSnapshot | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const [error, setError] = useState<string | null>(null);
  const permissions = session.identity?.permissions ?? [];
  const canReport = permissions.includes("report:view");
  const canHealth = permissions.includes("lottery:data:view");
  const hasGlobalReportScope = (session.identity?.scopeStationIds.length ?? 0) === 0;

  const load = useCallback(async (current: OverviewFilters) => {
    if (!canReport && !canHealth) {
      setStatus("forbidden");
      return;
    }
    setStatus("loading");
    setError(null);
    const query = current.stationId.trim() === ""
      ? {
          from: shanghaiDayStart(current.from),
          to: reportRangeEnd(current.to),
        }
      : {
          from: shanghaiDayStart(current.from),
          to: reportRangeEnd(current.to),
          stationId: current.stationId.trim(),
        };
    try {
      const reconciliationIncluded = canReport
        && hasGlobalReportScope
        && current.stationId.trim() === "";
      const reports = canReport
        ? Promise.all([
            getAdminReport("MEMBER_OVERVIEW", query),
            getAdminReport("REFERRAL_LEVELS", query),
            getAdminReport("AI_POOLS", query),
            reconciliationIncluded
              ? getAdminReport("LEDGER_RECONCILIATION", query)
              : Promise.resolve(null),
          ])
        : Promise.resolve([null, null, null, null] as const);
      const health = canHealth ? getDataHealth() : Promise.resolve(null);
      const [[member, referral, pools, reconciliation], healthPage] = await Promise.all([
        reports,
        health,
      ]);
      setSnapshot({
        member,
        referral,
        pools,
        reconciliation,
        reconciliationIncluded,
        health: healthPage,
      });
      setStatus("ready");
    } catch (cause) {
      setStatus(isForbiddenError(cause) ? "forbidden" : "error");
      setError(apiErrorMessage(cause));
    }
  }, [canHealth, canReport, hasGlobalReportScope]);

  useEffect(() => {
    if (session.status === "authenticated") {
      void load(applied);
    }
  }, [applied, load, session.status]);

  const exceptions = useMemo(
    () => snapshot === null ? [] : collectExceptions(snapshot),
    [snapshot],
  );

  return (
    <>
      <PageHeader
        actions={<ActionButton onClick={() => void load(applied)}>刷新数据</ActionButton>}
        description="统一查看期间业务流量、截至时点余额和需要处理的运营异常；所有金额均为积分。"
        meta={snapshot?.member === null || snapshot?.member === undefined
          ? undefined
          : <DataTimestamp value={snapshot.member.asOf} />}
        pageId="A01"
        title="运营总览"
      />

      <Panel description="日期按上海时区闭区间查询；站点为空时由服务端按员工授权范围汇总。" title="统计范围">
        <form className={styles.filterBar} onSubmit={(event) => {
          event.preventDefault();
          setApplied({ ...filters });
        }}>
          <label className={styles.field}>
            <span>开始日期</span>
            <input
              onChange={(event) => setFilters((value) => ({ ...value, from: event.target.value }))}
              required
              type="date"
              value={filters.from}
            />
          </label>
          <label className={styles.field}>
            <span>结束日期</span>
            <input
              onChange={(event) => setFilters((value) => ({ ...value, to: event.target.value }))}
              required
              type="date"
              value={filters.to}
            />
          </label>
          <label className={styles.field} data-grow="true">
            <span>站点 ID</span>
            <input
              onChange={(event) => setFilters((value) => ({ ...value, stationId: event.target.value }))}
              placeholder="留空表示当前授权范围"
              value={filters.stationId}
            />
          </label>
          <ActionButton type="submit" variant="primary">应用筛选</ActionButton>
        </form>
      </Panel>

      {status === "loading" ? <PageState kind="loading" title="正在汇总运营事实" /> : null}
      {status === "forbidden" ? (
        <PageState
          description={error ?? "当前员工没有报表或彩票数据健康查看权限。"}
          kind="forbidden"
        />
      ) : null}
      {status === "error" ? (
        <PageState
          action={<ActionButton onClick={() => void load(applied)}>重试</ActionButton>}
          description={error ?? undefined}
          kind="error"
        />
      ) : null}

      {status === "ready" && snapshot !== null ? (
        <>
          <MetricStrip items={overviewMetrics(snapshot)} />
          {!snapshot.reconciliationIncluded ? (
            <p className={styles.muted}>
              账本全局对账未纳入当前员工范围或站点筛选；其余指标仍按当前授权范围展示。
            </p>
          ) : null}
          <div className={styles.split}>
            <Panel
              description="异常入口只展示当前接口能够确认的事实，不把任务受理误报为完成。"
              title="待处理异常"
            >
              {exceptions.length === 0 ? (
                <PageState
                  description={snapshot.reconciliationIncluded
                    ? "当前查询快照没有发现开奖、遗漏、资格或对账异常。"
                    : "当前查询快照没有发现开奖、遗漏或资格异常；账本全局对账未纳入当前范围。"}
                  kind="empty"
                  title="暂无待处理异常"
                />
              ) : (
                <div className={styles.exceptionList}>
                  {exceptions.map((item) => (
                    <article className={styles.exceptionItem} key={item.key}>
                      <span className={styles.exceptionMarker} data-tone={item.tone} aria-hidden="true" />
                      <div className={styles.exceptionCopy}>
                        <strong>{item.title}</strong>
                        <span>{item.description}</span>
                      </div>
                      <Link className={styles.inlineLink} href={item.href}>进入处理</Link>
                    </article>
                  ))}
                </div>
              )}
            </Panel>
            <Panel
              description="余额是截至时点事实，不计入期间收入或流量。"
              flush
              title="会员积分存量"
            >
              <div className={styles.balanceSummary}>
                <div className={styles.balanceItem}>
                  <span>可用积分</span>
                  <strong>{points(snapshot.member, "availablePoints")}</strong>
                  <small>当前报表范围内会员可用余额</small>
                </div>
                <div className={styles.balanceItem}>
                  <span>冻结积分</span>
                  <strong>{points(snapshot.member, "reservedPoints")}</strong>
                  <small>已被业务义务占用的会员积分</small>
                </div>
              </div>
            </Panel>
          </div>
        </>
      ) : null}
    </>
  );
}

function overviewMetrics(snapshot: OverviewSnapshot) {
  return [
    { label: "新增会员", value: count(snapshot.member, "newMemberCount"), detail: "期间新增" },
    { label: "站长加分", value: points(snapshot.member, "periodGrantedPoints"), detail: "期间会员加分" },
    { label: "站长扣分", value: points(snapshot.member, "periodDeductedPoints"), detail: "期间会员扣分" },
    { label: "有效参与积分", value: points(snapshot.member, "settledStakePoints"), detail: "已结算参与事实" },
    { label: "中奖已发", value: points(snapshot.member, "totalWinningPoints"), detail: "服务端已确认中奖积分" },
    { label: "固定奖励已发", value: points(snapshot.referral, "fixedRewardPostedPoints"), detail: "D06 政策下已入账" },
    { label: "AI 分红已发", value: points(snapshot.referral, "aiSharePostedPoints"), detail: "D07 政策下已入账" },
  ];
}

function collectExceptions(snapshot: OverviewSnapshot): readonly ExceptionItem[] {
  const items: ExceptionItem[] = [];
  snapshot.health?.items.forEach((health) => {
    if (health.status !== "READY") {
      items.push({
        key: `health-${health.lotteryId}`,
        title: "彩票数据或遗漏水位异常",
        // 全部缺口都已确认接受的彩种，服务端已经判为 READY，不会走到这里；
        // 这里只在仍然异常时把"缺口里有多少是已确认的"说清楚，避免看着像没处理。
        description: `${health.lotteryId}：状态 ${health.status}，缺口 ${health.gapCount}${health.acknowledgedGapCount > 0 ? `（已确认 ${health.acknowledgedGapCount}）` : ""}，投影落后 ${health.projectionLag} 期，待处理任务 ${health.pendingTaskCount}。`,
        href: `/lottery/omissions?lotteryId=${encodeURIComponent(health.lotteryId)}`,
        tone: health.status === "UNAVAILABLE" ? "danger" : "warning",
      });
    }
    if (health.qualificationLag > 0) {
      items.push({
        key: `qualification-${health.lotteryId}`,
        title: "会员资格重算滞后",
        description: `${health.lotteryId} 关联范围有 ${health.qualificationLag} 个会员资格待追平。`,
        href: "/members?view=qualification-health",
        tone: "warning",
      });
    }
  });
  // 这里要的是"现在还有没有差异"，所以只看最近一次对账，不把窗口内历次快照加总。
  // 总账口径是按快照沉淀的：一次已经处理掉的差异会留在历史快照里，
  // 加总的话它会一直顶着红色告警，直到自己滚出筛选窗口为止。
  // 后端按 created_at 倒序返回，items[0] 即最近一次。
  const latestReconciliation = snapshot.reconciliation?.items[0];
  const mismatch = latestReconciliation === undefined
    ? null
    : metricText(latestReconciliation.metrics, "mismatchAccountCount");
  if (mismatch !== null && mismatch !== "0") {
    items.push({
      key: "ledger-reconciliation",
      title: "积分账本对账异常",
      description: `最近一次对账有 ${mismatch} 个账户存在差异。`,
      href: "/ledger?view=reconciliation",
      tone: "danger",
    });
  }
  const winningNotReady = metricText(snapshot.pools?.totals ?? {}, "winningNotReadyCount");
  if (winningNotReady !== null && winningNotReady !== "0") {
    items.push({
      key: "ai-winning-not-ready",
      title: "AI 合买中奖结果未就绪",
      description: `${winningNotReady} 个期次仍缺少可结算中奖事实。`,
      href: "/ai-pools?view=exceptions",
      tone: "warning",
    });
  }
  return items;
}

function points(report: ReportResult | null, key: string): string {
  const raw = metricText(report?.totals ?? {}, key);
  return raw === null ? "—" : `${formatDecimal(raw)} 积分`;
}

function count(report: ReportResult | null, key: string): string {
  const raw = metricText(report?.totals ?? {}, key);
  return raw === null ? "—" : formatInteger(raw);
}

function formatDecimal(value: string): string {
  const match = /^(-?)(\d+)(\.\d+)?$/.exec(value);
  if (match === null) {
    return value;
  }
  const sign = match[1] ?? "";
  const integer = match[2] ?? "0";
  const decimal = match[3] ?? "";
  return `${sign}${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${decimal}`;
}

function formatInteger(value: string): string {
  return /^\d+$/.test(value)
    ? value.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    : value;
}

function defaultFilters(): OverviewFilters {
  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - 6);
  return {
    from: dateInput(from),
    to: dateInput(now),
    stationId: "",
  };
}

function dateInput(value: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(value);
}

function reportRangeEnd(value: string): string {
  const endOfDay = shanghaiDayEnd(value);
  const now = new Date();
  return new Date(endOfDay).getTime() > now.getTime() ? now.toISOString() : endOfDay;
}
