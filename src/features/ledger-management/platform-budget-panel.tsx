"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@piao777/api-client";
import { ActionButton, Dialog, InlineNotice, Panel, formatDateTime } from "@/components/admin-workspace/admin-workspace";
import { PageState } from "@/components/page-state/page-state";
import { adminApi } from "@/lib/api";
import { apiErrorMessage, authorizeAction, canonicalDigest, newIntentKey } from "../operations/operations-api";
import styles from "../operations/operations-pages.module.css";

const categories = { DISTRIBUTION_BUDGET: "站长拨付预算", ORDINARY_AWARD_BUDGET: "普通返奖预算", AI_BUDGET: "AI 跟投及返奖预算", REFERRAL_BUDGET: "推广奖励及分红预算" } as const;
type Category = keyof typeof categories;
type Period = "REALTIME" | "DAY" | "MONTH" | "CUSTOM";
interface Batch { id: string; category: Category; kind: "INITIAL" | "TOPUP"; points: string; sourceReference: string; reason: string;
  authorId: string; status: string; reviewedBy: string | null; reviewReason: string | null; transactionId: string | null; createdAt: string }
interface Draft { category: Category; kind: "INITIAL" | "TOPUP"; points: string; sourceReference: string; reason: string; key: string }
interface Review { batch: Batch; decision: "APPROVE" | "REJECT"; reason: string; proof: string; key: string }
interface FlowReport { from: string; to: string; asOf: string; rows: { category: Category; inflowPoints: string; outflowPoints: string; netFlowPoints: string }[] }

export function PlatformBudgetPanel({ permissions, employeeId, onPosted }: Readonly<{ permissions: readonly string[]; employeeId: string; onPosted(): Promise<void> }>) {
  const canView = permissions.includes("budget:view");
  const canWrite = permissions.includes("budget:write");
  const canReview = permissions.includes("budget:approve") && permissions.includes("action:authorize");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [report, setReport] = useState<FlowReport | null>(null);
  const [period, setPeriod] = useState<Period>("REALTIME");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false); const [busy, setBusy] = useState(false); const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null); const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null); const [review, setReview] = useState<Review | null>(null);
  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true); setError(null);
    try {
      const result = await adminApi.request<{ items: Batch[] }>("/api/admin/v1/platform-budget-batches"); setBatches(result.data.items);
      if (period === "CUSTOM" && (!from || !to)) { setReport(null); return; }
      const resultReport = await adminApi.request<FlowReport>("/api/admin/v1/platform-budget-flows", { query: { period,
        from: period === "CUSTOM" ? `${from}T00:00:00+08:00` : undefined,
        to: period === "CUSTOM" ? new Date(new Date(`${to}T00:00:00+08:00`).getTime() + 86_400_000).toISOString() : undefined } });
      setReport(resultReport.data);
    } catch (cause) { setError(apiErrorMessage(cause)); setReport(null); }
    finally { setLoading(false); }
  }, [canView, period, from, to]);
  useEffect(() => { void load(); }, [load]);
  async function create() {
    if (!draft) return;
    setBusy(true); setLocked(true); setError(null);
    try {
      await adminApi.request<Batch>("/api/admin/v1/platform-budget-batches", { method: "POST", idempotencyKey: draft.key,
        body: { category: draft.category, kind: draft.kind, points: draft.points, sourceReference: draft.sourceReference, reason: draft.reason } });
      setDraft(null); setLocked(false); setMessage("预算批次已提交，等待独立复核，尚未入账。"); await load();
    } catch (cause) { setError(apiErrorMessage(cause)); if (cause instanceof ApiError && cause.submissionOutcome !== "UNKNOWN") setLocked(false); }
    finally { setBusy(false); }
  }
  async function approve() {
    if (!review) return;
    setBusy(true); setLocked(true); setError(null);
    try {
      const b = review.batch;
      const hash = await canonicalDigest(["PLATFORM_BUDGET_APPROVE", b.id, b.category, b.kind, b.points, review.decision, review.reason]);
      const action = await authorizeAction({ purpose: "PLATFORM_BUDGET_APPROVE", resourceId: b.id, expectedHash: hash,
        expectedAmount: b.points, finalIdempotencyKey: review.key, proofCode: review.proof });
      const response = await adminApi.request<Batch>(`/api/admin/v1/platform-budget-batches/${b.id}/reviews`, {
        method: "POST", idempotencyKey: review.key, actionToken: action.actionToken, body: { decision: review.decision, reason: review.reason } });
      setMessage(response.data.status === "APPROVED" ? `预算已入账，账本交易 ${response.data.transactionId}` : "预算批次已驳回。");
      setReview(null); setLocked(false); await load(); await onPosted();
    } catch (cause) { setError(apiErrorMessage(cause)); if (cause instanceof ApiError && cause.submissionOutcome !== "UNKNOWN") setLocked(false); }
    finally { setBusy(false); }
  }
  if (!canView) return <PageState kind="forbidden" description="预算批次与分类统计需要全平台员工及相应查看权限。" />;
  return <div className={styles.stack}>
    <InlineNotice title="预算按批次入账">每类初始预算为 999,999,999 积分。追加批次须由另一名员工复核；余额、站长额度和会员积分分别核算。</InlineNotice>
    {message ? <p role="status">{message}</p> : null}{error ? <p role="alert">{error}</p> : null}
    <div className={styles.filterBar}>
      {canWrite ? <ActionButton onClick={() => { setLocked(false); setError(null); setDraft({ category: "DISTRIBUTION_BUDGET", kind: "INITIAL", points: "999999999.00", sourceReference: "", reason: "", key: newIntentKey("createPlatformBudgetBatch") }); }}>新建预算批次</ActionButton> : null}
      <label className={styles.field}><span>统计期间</span><select value={period} onChange={(e) => setPeriod(e.target.value as Period)}><option value="REALTIME">实时累计</option><option value="DAY">本日</option><option value="MONTH">本月</option><option value="CUSTOM">自定义</option></select></label>
      {period === "CUSTOM" ? <><label className={styles.field}><span>开始日期（北京时间）</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className={styles.field}><span>结束日期（含当天）</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label></> : null}
      <ActionButton disabled={loading} onClick={() => void load()}>刷新批次与统计</ActionButton>
    </div>
    {loading ? <PageState kind="loading" title="正在读取预算批次与分类流量" /> : null}
    {report ? <Panel title="分类收入、支出与净流量" description={`截至 ${formatDateTime(report.asOf)}；净流量＝收入－支出。`}><div className={styles.tableWrap}><table className={styles.table}>
      <thead><tr><th>预算类别</th><th>收入积分</th><th>支出积分</th><th>净流量积分</th></tr></thead><tbody>{report.rows.map((r) => <tr key={r.category}><td>{categories[r.category]}</td><td>{r.inflowPoints}</td><td>{r.outflowPoints}</td><td>{r.netFlowPoints}</td></tr>)}</tbody>
    </table></div></Panel> : null}
    <Panel title="最近 100 个预算批次"><div className={styles.tableWrap}><table className={styles.table}>
      <thead><tr><th>类别 / 类型</th><th>金额</th><th>来源 / 原因</th><th>作者 / 复核人</th><th>状态 / 时间</th><th>操作</th></tr></thead><tbody>
        {batches.length === 0 ? <tr><td colSpan={6}>暂无预算批次</td></tr> : batches.map((b) => <tr key={b.id}><td>{categories[b.category]}<br />{b.kind === "INITIAL" ? "初始化" : "追加"}</td><td>{b.points}</td><td>{b.sourceReference}<br />{b.reason}</td><td>{b.authorId}<br />{b.reviewedBy ?? "待复核"}</td><td>{b.status}<br />{formatDateTime(b.createdAt)}</td><td>
          <ActionButton disabled={!canReview || b.status !== "PENDING_REVIEW" || b.authorId === employeeId} onClick={() => { setLocked(false); setError(null); setReview({ batch: b, decision: "APPROVE", reason: "", proof: "", key: newIntentKey("reviewPlatformBudgetBatch") }); }}>{b.authorId === employeeId ? "作者不可复核" : "复核"}</ActionButton>
        </td></tr>)}
      </tbody></table></div></Panel>
    <Dialog open={draft !== null} title="新建平台预算批次" onClose={() => { if (!busy && !locked) setDraft(null); }} footer={<><ActionButton disabled={busy || locked} onClick={() => setDraft(null)}>取消</ActionButton><ActionButton variant="primary" disabled={busy || !draft?.points || !draft.sourceReference.trim() || draft.reason.trim().length < 2} onClick={() => void create()}>{locked ? "原请求重试" : "提交待复核批次"}</ActionButton></>}>
      {draft ? <div className={styles.formGrid}>
        <label className={styles.field}><span>预算类别</span><select disabled={locked} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })}>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className={styles.field}><span>类型</span><select disabled={locked} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value === "INITIAL" ? "INITIAL" : "TOPUP", points: e.target.value === "INITIAL" ? "999999999.00" : "" })}><option value="INITIAL">初始化</option><option value="TOPUP">追加</option></select></label>
        <label className={styles.field}><span>积分金额</span><input disabled={locked || draft.kind === "INITIAL"} inputMode="decimal" value={draft.points} onChange={(e) => setDraft({ ...draft, points: e.target.value })} /></label>
        <label className={styles.field}><span>来源依据编号</span><input disabled={locked} maxLength={100} value={draft.sourceReference} onChange={(e) => setDraft({ ...draft, sourceReference: e.target.value })} /></label>
        <label className={styles.field}><span>原因</span><textarea disabled={locked} maxLength={500} value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} /></label>
        {error ? <p role="alert">{error}</p> : null}</div> : null}
    </Dialog>
    <Dialog open={review !== null} title="复核平台预算批次" onClose={() => { if (!busy && !locked) setReview(null); }} footer={<><ActionButton disabled={busy || locked} onClick={() => setReview(null)}>取消</ActionButton><ActionButton variant="primary" disabled={busy || !review?.proof || review.reason.trim().length < 2} onClick={() => void approve()}>{locked ? "原请求重试" : "提交复核"}</ActionButton></>}>
      {review ? <div className={styles.stack}><p>{categories[review.batch.category]} · {review.batch.kind === "INITIAL" ? "初始化" : "追加"} · {review.batch.points} 积分</p><p>依据：{review.batch.sourceReference}；原因：{review.batch.reason}</p>
        <label className={styles.field}><span>复核结果</span><select disabled={locked} value={review.decision} onChange={(e) => setReview({ ...review, decision: e.target.value === "APPROVE" ? "APPROVE" : "REJECT" })}><option value="APPROVE">批准并入账</option><option value="REJECT">驳回</option></select></label>
        <label className={styles.field}><span>复核说明</span><textarea disabled={locked} maxLength={500} value={review.reason} onChange={(e) => setReview({ ...review, reason: e.target.value })} /></label>
        <label className={styles.field}><span>MFA 验证码</span><input autoComplete="one-time-code" value={review.proof} onChange={(e) => setReview({ ...review, proof: e.target.value })} /></label>
        {error ? <p role="alert">{error}</p> : null}</div> : null}
    </Dialog>
  </div>;
}
