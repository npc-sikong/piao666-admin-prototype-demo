"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ActionButton, Dialog, InlineNotice } from "@/components/admin-workspace/admin-workspace";
import { useAdminSession } from "@/session/admin-session";
import { AiAllocationPreviewDialog } from "./ai-allocation-preview-dialog";
import {
  calculateAllocation, closeFunding, confirmAllocation, errorView, getAllocation, getPool,
  getPayout, getSettlementExecution, listSubscriptions, newIntent, preparePayout,
  publishDisclosure, retryAutomaticSettlement, retryPayout, saveSettlementMode, settleNow, submitPayout,
} from "./ai-management-api";
import type { AiPoolAdmin, Allocation, PayoutBatch, PayoutPreparation, SettlementExecution, SettlementMode, Subscription } from "./ai-management-models";
import { Definition as DataDefinition, DefinitionList, formatAiPoints, formatDateTime, PoolStatusBadge } from "./ai-management-ui";
import styles from "./ai-management.module.css";

function Definition({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return <DataDefinition label={label} value={children} />;
}

const executionLabels: Readonly<Record<string, string>> = {
  PENDING: "等待执行", RUNNING: "执行中", COMPLETED: "已完成", RETRY_WAIT: "等待条件恢复",
  FAILED: "执行失败", CANCELLED: "已取消", PAUSED: "已暂停", PARTIAL_FAILED: "部分失败",
};
const failureLabels: Readonly<Record<string, string>> = {
  LEDGER_ACCOUNT_BLOCKED: "积分账户被对账阻断，处理差额后可恢复原批次",
  INSUFFICIENT_POINTS: "执行时积分账户余额不足，核对资金后可恢复原流程",
  LEDGER_ACCOUNT_NOT_READY: "发放所需积分账户尚未就绪",
  AI_DRAW_SOURCE_CONFLICT: "开奖来源存在冲突，等待独立复核后继续",
  WAITING_ALLOCATION: "等待本期分配计算完成",
  AI_REWARD_BUDGET_LIMIT_EXCEEDED: "本期奖励上限不足，保留当前目标等待恢复",
  AI_CALCULATION_FAILED: "分配计算失败，请核对原因后恢复原任务",
  AI_ALLOCATION_UNSATISFIABLE: "当前目标不能满足组额度与资金约束",
  AI_BUDGET_NOT_READY: "平台奖励预算余额不足，补足后继续原流程",
  INSUFFICIENT_AI_BUDGET: "平台奖励预算余额不足，补足后继续原流程",
};

export type IssueDialogKind = "settings" | "payout" | "subscriptions" | "numbers";

export function AiIssueOperationsDialog({ poolIssueId, kind, onClose, onChanged }: Readonly<{
  poolIssueId: string; kind: IssueDialogKind; onClose(): void; onChanged(): void;
}>) {
  const session = useAdminSession();
  const rights = session.identity?.permissions ?? [];
  const can = (right: string) => rights.includes(right);
  const [pool, setPool] = useState<AiPoolAdmin | null>(null);
  const [poolEtag, setPoolEtag] = useState<string | null>(null);
  const [execution, setExecution] = useState<SettlementExecution | null>(null);
  const [allocation, setAllocation] = useState<Allocation | null>(null);
  const [allocationEtag, setAllocationEtag] = useState<string | null>(null);
  const [batch, setBatch] = useState<PayoutBatch | null>(null);
  const [preparation, setPreparation] = useState<PayoutPreparation | null>(null);
  const [subscriptions, setSubscriptions] = useState<readonly Subscription[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [mode, setMode] = useState<SettlementMode>("MANUAL");
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [target, setTarget] = useState<string>("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [intent, setIntent] = useState<{ operation: string; key: string } | null>(null);
  const canViewPayout = rights.includes("ai-payout:view");

  const load = useCallback(async (initial = false) => {
    try {
      const [detail, state] = await Promise.all([getPool(poolIssueId), getSettlementExecution(poolIssueId)]);
      setPool(detail.value); setPoolEtag(detail.etag); setExecution(state);
      if (initial) { setMode(state.settlementMode); setTarget(String(detail.value.pool.defaultTargetNetReturnPercent)); }
      if (kind === "settings" || kind === "payout") {
        const value = state.currentAllocationId ? await getAllocation(state.currentAllocationId) : null;
        setAllocation(value?.value ?? null); setAllocationEtag(value?.etag ?? null);
        setBatch(state.payoutBatchId && canViewPayout ? await getPayout(state.payoutBatchId) : null);
      }
      if (kind === "subscriptions" && initial) {
        const page = await listSubscriptions(poolIssueId); setSubscriptions(page.items); setCursor(page.nextCursor);
      }
      setError(null);
    } catch (cause) { setError(errorView(cause).message); }
    finally { setLoading(false); }
  }, [poolIssueId, kind, canViewPayout]);

  useEffect(() => { void load(true); }, [load]);
  const inProgress = execution?.settlementMode === "AUTO" && !["SETTLED", "CORRECTED", "CANCELLED"].includes(pool?.pool.status ?? "")
    || batch?.status === "RUNNING" || batch?.status === "PENDING";
  useEffect(() => {
    if (!inProgress || pending || intent) return;
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [inProgress, pending, intent, load]);

  async function run(operation: string, action: (key: string) => Promise<unknown>, message: string) {
    const key = intent?.key ?? newIntent(operation);
    setIntent({ operation, key }); setPending(true); setError(null);
    try {
      await action(key); setIntent(null); setFeedback(message);
      await load(true); onChanged();
    } catch (cause) {
      const view = errorView(cause); setError(view.message);
      if (view.kind !== "unknown-submit") setIntent(null);
    } finally { setPending(false); }
  }
  const blocked = (operation: string) => pending || (intent !== null && intent.operation !== operation);
  const manual = execution?.settlementMode === "MANUAL";
  const reasonReady = reason.trim().length >= 2;
  const title = { settings: "操作设置", payout: manual ? "发放准备与执行" : "自动发放进度", subscriptions: "认购明细", numbers: "本期号码" }[kind];
  const changed = async () => { setPreparation(null); await load(true); onChanged(); };
  const targetRule = pool?.pool.ruleSetCode === "FC3D_50X20_POST_DRAW_V3";
  const targetValue = /^\d{1,3}$/.test(target.trim()) ? Number(target.trim()) : null;
  const targetValid = targetValue !== null && targetValue >= 0 && targetValue <= 100;
  const allocationReady = allocation !== null && allocation.status === "SOLVED" && allocation.confirmationStatus === "PENDING_CONFIRMATION";
  const drawn = ["ALLOCATION_PENDING", "EXCEPTION_PENDING"].includes(pool?.pool.status ?? "");
  const quickBlocker = !drawn ? "本期尚未开奖锁池，开奖确认后才能发放。如需开奖后自动发放，可在「操作设置」中改为自动发放。"
    : !allocationReady ? "开奖后系统正在计算本期分配，请稍后点「刷新」。" : null;
  const expectedReturn = pool && targetValid ? estimateReturn(pool.pool.totalPurchasePoints, targetValue!) : null;

  return <Dialog open width="wide" title={`${pool?.pool.issueCode ?? "本期"} · ${title}`} onClose={() => { if (!pending && !intent) onClose(); }}
    footer={<><ActionButton disabled={pending || intent !== null} onClick={() => void load(true)}>刷新</ActionButton><ActionButton disabled={pending || intent !== null} onClick={onClose}>关闭</ActionButton></>}>
    <div className={styles.stack}>
      {loading ? <p role="status">正在读取本期执行状态…</p> : null}
      {feedback ? <InlineNotice tone="success">{feedback}</InlineNotice> : null}
      {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}
      {pool && execution ? <>
        <div className={styles.detailLine}><PoolStatusBadge status={pool.pool.status} /><strong>{manual ? "人工发放" : "自动发放"}</strong><span>本期目标 {execution.targetNetReturnPercent}%</span></div>
        {kind === "settings" || kind === "payout" ? <>
          <DefinitionList>
            <Definition label="当前有效版本">{execution.currentAllocationVersion ? `v${execution.currentAllocationVersion}` : "等待计算"}</Definition>
            <Definition label="当前总应返">{formatAiPoints(execution.totalReturnPoints)}</Definition>
            <Definition label="会员应返">{formatAiPoints(allocation?.userWinningPoints ?? null)}</Definition>
            <Definition label="平台目标尾差">{formatAiPoints(execution.targetRoundingAdjustmentPoints)}</Definition>
            <Definition label="本期实际净已发">{formatAiPoints(execution.postedReturnPoints)}</Definition>
            <Definition label="执行状态">{executionLabels[batch?.status ?? execution.automaticTaskStatus ?? ""] ?? (manual ? "等待人工操作" : "等待正式开奖及锁池")}</Definition>
          </DefinitionList>
          <InlineNotice title="只发放当前有效版本">调整目标保存成功后，旧预览立即失效。确认并发放时只计算最新版本，历史预览金额不会累加。</InlineNotice>
          {execution.failureCode ? <InlineNotice title="当前等待或失败原因" tone="warning">{failureLabels[execution.failureCode] ?? `执行暂未完成（${execution.failureCode}），请核对本期任务与资金状态。`}</InlineNotice> : null}
          <label className={styles.field}><span>操作原因</span><textarea disabled={pending || intent !== null} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="填写本次调整、确认或恢复的原因" /></label>
        </> : null}
        {kind === "settings" ? <>
          <div className={styles.formGrid}>
            <label className={styles.field}><span>本期发放方式</span><select disabled={!execution.modeChangeAllowed || pending || intent !== null || !can("ai-project:configure")}
              value={mode} onChange={(event) => setMode(event.target.value as SettlementMode)}>
              <option value="MANUAL">人工发放</option><option value="AUTO" disabled={!can("ai-payout:execute")}>自动发放</option>
            </select><small>{execution.modeChangeAllowed ? "仅修改本期；自动模式需配置与发放权限。" : "本期已锁定或使用旧规则，不能切换。"}</small></label>
            {execution.modeChangeAllowed && can("ai-project:configure") ? <ActionButton disabled={blocked("updateAiIssueSettlementMode") || !reasonReady || !poolEtag || mode === execution.settlementMode}
              onClick={() => void run("updateAiIssueSettlementMode", (key) => saveSettlementMode({ poolIssueId, settlementMode: mode, reason, etag: poolEtag!, idempotencyKey: key }), "本期发放方式已保存。")}>保存本期方式</ActionButton> : null}
          </div>
          <div className={styles.tableActions}>
            {allocation && allocationEtag && allocation.status === "SOLVED" && (manual || execution.automaticTaskStatus !== "RUNNING") && allocation.confirmationStatus === "PENDING_CONFIRMATION" && can("ai-pool:calculate")
              ? <AiAllocationPreviewDialog key={allocation.id} allocation={allocation} etag={allocationEtag} onSaved={changed} /> : null}
            {!allocation && manual && pool.allowedActions.includes("CALCULATE_ALLOCATION") && can("ai-pool:calculate") ? <ActionButton disabled={blocked("calculateAllocation") || !reasonReady} onClick={() => void run("calculateAllocation", (key) => calculateAllocation({ pool, targetNetReturnPercent: execution.targetNetReturnPercent, reason, idempotencyKey: key }), "计算任务已受理，刷新可查看结果。")}>生成本期预览</ActionButton> : null}
            {allocation && manual && allocation.confirmationStatus === "PENDING_CONFIRMATION" && can("ai-pool:calculate") ? <ActionButton variant="primary" disabled={blocked("confirmAllocation") || !reasonReady || !allocationEtag}
              onClick={() => void run("confirmAllocation", (key) => confirmAllocation({ allocationId: allocation.id, reason, etag: allocationEtag!, idempotencyKey: key }), "已确认并锁定当前版本。")}>确认当前版本</ActionButton> : null}
            {allocation && manual && pool.allowedActions.includes("PUBLISH_DISCLOSURE") && can("ai-disclosure:publish") ? <ActionButton disabled={blocked("publishDisclosure") || !reasonReady}
              onClick={() => void run("publishDisclosure", (key) => publishDisclosure({ poolIssueId, allocation, reason, idempotencyKey: key }), "当前版本已公示。")}>发布公示</ActionButton> : null}
            {pool.allowedActions.includes("CLOSE_FUNDING") && can("ai-pool:close") ? <ActionButton disabled={blocked("closeAiPoolFunding") || !reasonReady || !poolEtag} onClick={() => void run("closeAiPoolFunding", (key) => closeFunding({ poolIssueId, reason, etag: poolEtag!, idempotencyKey: key }), "停止认购任务已受理。")}>停止本期认购</ActionButton> : null}
            <Link className={styles.quietLink} href={`/ai-pools/${encodeURIComponent(poolIssueId)}/allocation`}>查看分配与历史版本</Link>
          </div>
          {allocation ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>命中组</th><th>组额度</th><th>派生倍数</th><th>组返还</th></tr></thead><tbody>{allocation.items.filter((item) => item.sequenceNo === allocation.winningGroupSequenceNo).map((item) => <tr key={item.combinationId}><td>第 {item.sequenceNo} 组</td><td>{formatAiPoints(item.allocatedPoints)}</td><td>{item.multiplier}</td><td>{formatAiPoints(item.winningPoints)}</td></tr>)}</tbody></table></div> : null}
        </> : null}
        {kind === "payout" && manual && targetRule && !batch ? <>
          <DefinitionList>
            <Definition label="本期总投入">{formatAiPoints(pool.pool.totalPurchasePoints)}</Definition>
            <Definition label="默认目标收益率">{pool.pool.defaultTargetNetReturnPercent}%</Definition>
            <Definition label="预计总返还">{expectedReturn ?? "—"}</Definition>
          </DefinitionList>
          {quickBlocker ? <InlineNotice tone="warning">{quickBlocker}</InlineNotice> : null}
          <label className={styles.field}><span>目标收益率（%）</span>
            <input disabled={pending || intent !== null || quickBlocker !== null} inputMode="numeric" value={target}
              onChange={(event) => setTarget(event.target.value)} />
            <small>默认按项目默认收益率；可改为 0–100 之间的整数。确认后系统自动完成确认、公示与逐笔发放。</small>
          </label>
          {!targetValid ? <InlineNotice tone="warning">请输入 0–100 之间的整数。</InlineNotice> : null}
          {can("ai-pool:calculate") && can("ai-payout:execute") ? <ActionButton variant="primary"
            disabled={blocked("settleAiIssueNow") || quickBlocker !== null || !targetValid || !poolEtag}
            onClick={() => void run("settleAiIssueNow", (key) => settleNow({ poolIssueId, targetNetReturnPercent: targetValue!,
              reason: `人工确认按 ${targetValue}% 发放`, etag: poolEtag!, idempotencyKey: key }), `已确认，系统正在按 ${targetValue}% 发放，下方显示进度。`)}>确认发放</ActionButton>
            : <InlineNotice tone="warning">确认发放需要分配计算与发放执行权限。</InlineNotice>}
        </> : null}
        {kind === "payout" && !(manual && targetRule && !batch) ? <>
          {!manual ? <InlineNotice>正式开奖确认且锁池后，系统自动计算、确认、公示、预留预算并逐笔发放。此处展示服务端实际进度。</InlineNotice> : null}
          {manual && allocation && pool.pool.disclosureVersion && !batch && can("ai-payout:prepare") ? <ActionButton disabled={blocked("preparePayout")}
            onClick={() => void run("preparePayout", async (key) => { const value = await preparePayout({ poolIssueId, allocationVersion: allocation.version, disclosureVersion: pool.pool.disclosureVersion!, expectedInputVersionSetHash: allocation.inputVersionSetHash, idempotencyKey: key }); setPreparation(value); }, "已读取发放准备结果。")}>检查并准备发放</ActionButton> : null}
          {preparation ? <>
            <InlineNotice tone={preparation.eligible ? "success" : "warning"}>{preparation.eligible ? `本次应返 ${formatAiPoints(preparation.dueTotalPoints)}，准备有效至 ${formatDateTime(preparation.expiresAt)}。` : `暂不能发放：${preparation.blockingCodes.join("、")}`}</InlineNotice>
            {preparation.eligible && manual && can("ai-payout:execute") ? <><label className={styles.field}><span>输入“确认发放”</span><input disabled={pending || intent !== null} value={confirmText} onChange={(event) => setConfirmText(event.target.value)} /></label><ActionButton variant="primary" disabled={blocked("submitPayout") || confirmText !== "确认发放"}
              onClick={() => void run("submitPayout", (key) => submitPayout({ poolIssueId, preparationId: preparation.preparationId, confirmText, idempotencyKey: key }), "发放任务已受理，到账以批次结果为准。")}>确认发放当前版本</ActionButton></> : null}
          </> : null}
          {batch ? <><DefinitionList><Definition label="批次编号">{batch.id}</Definition><Definition label="待发积分">{formatAiPoints(batch.pendingPoints)}</Definition><Definition label="已完成明细">{batch.completedItemCount} / {batch.totalItemCount}</Definition></DefinitionList>
            {can("ai-payout:retry") && ["PARTIAL_FAILED", "FAILED", "PAUSED"].includes(batch.status) ? <ActionButton disabled={blocked("retryPayout") || !reasonReady} onClick={() => void run("retryPayout", (key) => retryPayout({ batch, reason, idempotencyKey: key }), "已恢复原批次，只补未成功项。")}>恢复原发放批次</ActionButton> : null}
            <Link className={styles.quietLink} href={`/ai-pools/${encodeURIComponent(poolIssueId)}/payout`}>查看逐笔发放明细</Link></> : null}
          {!batch && !manual && can("ai-project:configure") && can("ai-payout:execute") && ["FAILED", "CANCELLED"].includes(execution.automaticTaskStatus ?? "") ? <ActionButton disabled={blocked("retryAiAutomaticSettlement") || !reasonReady || !poolEtag}
            onClick={() => void run("retryAiAutomaticSettlement", (key) => retryAutomaticSettlement({ poolIssueId, reason, etag: poolEtag!, idempotencyKey: key }), "已恢复原自动结算任务。")}>恢复自动结算</ActionButton> : null}
        </> : null}
        {kind === "subscriptions" ? <>
          <p>本期 {pool.pool.participantCount} 位会员认购 {formatAiPoints(pool.pool.userPurchasePoints)}；当前展示 {subscriptions.length} 笔。</p>
          <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>认购编号</th><th>积分</th><th>状态</th><th>认购时间</th></tr></thead><tbody>{subscriptions.map((item) => <tr key={item.id}><td>{item.id}</td><td>{formatAiPoints(item.points)}</td><td>{item.status}</td><td>{formatDateTime(item.createdAt)}</td></tr>)}</tbody></table></div>
          {cursor ? <ActionButton disabled={pending} onClick={() => { setPending(true); void listSubscriptions(poolIssueId, cursor).then((page) => { setSubscriptions((items) => [...items, ...page.items]); setCursor(page.nextCursor); }).catch((cause: unknown) => setError(errorView(cause).message)).finally(() => setPending(false)); }}>加载更多认购</ActionButton> : null}
        </> : null}
        {kind === "numbers" ? <div className={styles.combinationGrid}>{pool.combinations.map((item) => <article className={styles.combination} key={item.sequenceNo}><strong>第 {item.sequenceNo} 组</strong><div className={styles.numberLine}>{item.numberCodes.join(" ")}</div></article>)}</div> : null}
      </> : null}
    </div>
  </Dialog>;
}

/** 与服务端 V3 目标分配一致：总返还 = round(总投入 × (100 + 目标) / 100)，按 0.01 积分整数运算。 */
function estimateReturn(totalPoints: string, targetPercent: number): string | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(totalPoints);
  if (match === null) return null;
  const minor = BigInt(match[1]!) * 100n + BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  const scaled = minor * BigInt(100 + targetPercent);
  const rounded = (scaled + 50n) / 100n;
  return formatAiPoints(`${rounded / 100n}.${String(rounded % 100n).padStart(2, "0")}`);
}
