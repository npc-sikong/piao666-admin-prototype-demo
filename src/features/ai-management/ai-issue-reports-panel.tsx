"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionButton, InlineNotice } from "@/components/admin-workspace/admin-workspace";
import { useAdminSession } from "@/session/admin-session";
import { errorView, getSettlementExecution, listPools } from "./ai-management-api";
import type { AiPool, SettlementExecution } from "./ai-management-models";
import { formatAiPoints, formatDateTime, PoolStatusBadge, shortHash } from "./ai-management-ui";
import { AiIssueOperationsDialog, type IssueDialogKind } from "./ai-issue-operations-dialog";
import styles from "./ai-management.module.css";

type Filter = "ALL" | "FUNDING" | "ALLOCATION" | "PAYOUT" | "SETTLED";
const tabs: readonly { id: Filter; label: string; statuses: readonly string[] }[] = [
  { id: "ALL", label: "全部期次", statuses: [] },
  { id: "FUNDING", label: "认购中", statuses: ["OPEN", "CUTOFF_PENDING"] },
  { id: "ALLOCATION", label: "待测算分配", statuses: ["LOCKED", "DRAW_PENDING", "ALLOCATION_PENDING", "EXCEPTION_PENDING", "CORRECTING"] },
  { id: "PAYOUT", label: "待发放 / 发放中", statuses: ["DISCLOSED", "DISTRIBUTING"] },
  { id: "SETTLED", label: "已结算", statuses: ["SETTLED", "CORRECTED"] },
];
function total(values: readonly (string | null)[]): string {
  const minor = values.reduce<bigint>((sum, value) => {
    if (value === null) return sum;
    const [whole, fraction = ""] = value.split(".");
    return sum + BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, "0"));
  }, 0n);
  return `${minor / 100n}.${String(minor % 100n).padStart(2, "0")}`;
}

export function AiIssueReportsPanel({ projectId, projectName, projectCode, onLatestPool }: Readonly<{
  projectId: string; projectName: string; projectCode: string;
  onLatestPool(projectId: string, pool: AiPool | null): void;
}>) {
  const session = useAdminSession();
  const rights = session.identity?.permissions ?? [];
  const [pools, setPools] = useState<readonly AiPool[]>([]);
  const [executions, setExecutions] = useState<ReadonlyMap<string, SettlementExecution>>(new Map());
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [dialog, setDialog] = useState<{ poolId: string; kind: IssueDialogKind } | null>(null);
  const load = useCallback(async (next?: string) => {
    setLoading(true); setError(null);
    try {
      const page = await listPools(projectId, next);
      const results = await Promise.all(page.items.map((pool) => getSettlementExecution(pool.id)));
      setPools((current) => next ? [...current, ...page.items] : page.items);
      setExecutions((current) => {
        const values = next ? new Map(current) : new Map<string, SettlementExecution>();
        for (const item of results) values.set(item.poolIssueId, item);
        return values;
      });
      setCursor(page.nextCursor);
      if (!next) onLatestPool(projectId, page.items[0] ?? null);
    } catch (cause) { setError(errorView(cause).message); }
    finally { setLoading(false); }
  }, [projectId, onLatestPool]);
  useEffect(() => { void load(); }, [load]);
  const visible = pools.filter((pool) => filter === "ALL" || tabs.find((tab) => tab.id === filter)!.statuses.includes(pool.status));
  const sums = useMemo(() => ({
    users: total(pools.map((pool) => pool.userPurchasePoints)),
    platform: total(pools.map((pool) => pool.platformPoints)),
    due: total(pools.map((pool) => executions.get(pool.id)?.totalReturnPoints ?? null)),
    posted: total(pools.map((pool) => executions.get(pool.id)?.postedReturnPoints ?? null)),
  }), [pools, executions]);
  return <section className={styles.issueReport} aria-label={`${projectName}每期报表`}>
    <header className={styles.issueReportHeader}><div><strong>▥ 【{projectName}】每期报表与期次操作</strong><span className={styles.issueProjectCode}>{projectCode}</span></div>
      <ActionButton variant="quiet" disabled={loading} onClick={() => void load()}>刷新期次数据</ActionButton></header>
    <div className={styles.issueSummary}>
      <span>{cursor ? "已加载期次" : "总生成期次"}：<strong>{pools.length} 期</strong></span>
      <span>会员认购：<strong>{formatAiPoints(sums.users)}</strong></span><span>平台垫资：<strong>{formatAiPoints(sums.platform)}</strong></span>
      <span>当前应返合计：<strong>{formatAiPoints(sums.due)}</strong></span>
      <span>实际净已发：<strong>{formatAiPoints(sums.posted)}</strong></span>
      <span>待处理 / 待发放：<strong>{pools.filter((pool) => ["ALLOCATION_PENDING", "EXCEPTION_PENDING", "DISCLOSED", "DISTRIBUTING", "CORRECTING"].includes(pool.status)).length} 期</strong></span>
      {cursor ? <small>汇总仅含已加载期次</small> : null}
    </div>
    <nav className={styles.issueTabs} aria-label="期次状态筛选">{tabs.map((tab) => <button key={tab.id} type="button" aria-pressed={filter === tab.id} onClick={() => setFilter(tab.id)}>
      {tab.label} ({pools.filter((pool) => tab.id === "ALL" || tab.statuses.includes(pool.status)).length})</button>)}</nav>
    {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}
    {loading && pools.length === 0 ? <p className={styles.emptyInline} role="status">正在读取期次报表…</p> : null}
    {!loading && visible.length === 0 ? <p className={styles.emptyInline}>当前筛选没有期次。</p> : null}
    {visible.length > 0 ? <div className={styles.tableWrap}><table className={`${styles.table} ${styles.issueTable}`}><thead><tr><th>期号</th><th>期次状态</th><th>生成 / 截止时间</th><th>会员参与</th><th>平台垫资 / 总池</th><th>当前应返 / 实际净已发</th><th>目标 / 发放方式</th><th>操作设置与发放</th></tr></thead><tbody>
      {visible.map((pool, index) => { const state = executions.get(pool.id); return <tr key={pool.id}>
        <td><span className={styles.cellTitle}>{pool.issueCode} {index === 0 && pools[0]?.id === pool.id ? <small className={styles.latestIssue}>最新</small> : null}</span><span className={styles.cellMeta}>编号 {shortHash(pool.id)}</span></td>
        <td><PoolStatusBadge status={pool.status} /></td>
        <td><span className={styles.cellTitle}>截止：{formatDateTime(pool.cutoffAt)}</span><span className={styles.cellMeta}>生成：{formatDateTime(pool.generatedAt)}</span></td>
        <td><strong>{formatAiPoints(pool.userPurchasePoints)}</strong><span className={styles.cellMeta}>{pool.participantCount} 人认购</span></td>
        <td><strong>{formatAiPoints(pool.platformPoints)}</strong><span className={styles.cellMeta}>总池 {formatAiPoints(pool.totalPurchasePoints)}</span></td>
        <td><strong>{state?.totalReturnPoints ? formatAiPoints(state.totalReturnPoints) : "待计算"}</strong><span className={styles.cellMeta}>已发 {state ? formatAiPoints(state.postedReturnPoints) : "—"} · {state?.currentAllocationVersion ? `v${state.currentAllocationVersion}` : "待开奖"}</span></td>
        <td><strong className={styles.issueTarget}>{state?.targetNetReturnPercent ?? pool.defaultTargetNetReturnPercent}%</strong><span className={styles.cellMeta}>{pool.settlementMode === "AUTO" ? "自动发放" : "人工发放"}</span></td>
        <td><div className={styles.tableActions}>
          <ActionButton variant="quiet" onClick={() => setDialog({ poolId: pool.id, kind: "settings" })}>操作设置</ActionButton>
          {(rights.includes("ai-payout:view") || rights.includes("ai-payout:prepare")) ? <ActionButton onClick={() => setDialog({ poolId: pool.id, kind: "payout" })}>{pool.settlementMode === "AUTO" ? "发放进度" : "发放准备"}</ActionButton> : null}
          {rights.includes("ai-pool:subscriptions:view") ? <ActionButton variant="quiet" onClick={() => setDialog({ poolId: pool.id, kind: "subscriptions" })}>认购明细</ActionButton> : null}
          <ActionButton variant="quiet" onClick={() => setDialog({ poolId: pool.id, kind: "numbers" })}>号码</ActionButton>
        </div></td>
      </tr>; })}
    </tbody></table></div> : null}
    {cursor ? <div className={styles.issueTabs}><ActionButton disabled={loading} onClick={() => void load(cursor)}>加载更多期次</ActionButton></div> : null}
    {dialog ? <AiIssueOperationsDialog key={`${dialog.poolId}-${dialog.kind}`} poolIssueId={dialog.poolId} kind={dialog.kind} onClose={() => { setDialog(null); void load(); }} onChanged={() => void load()} /> : null}
  </section>;
}
