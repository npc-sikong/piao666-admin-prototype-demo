"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@piao777/api-client";
import { ActionButton, Dialog, InlineNotice, Panel, formatDateTime } from "@/components/admin-workspace/admin-workspace";
import { PageState } from "@/components/page-state/page-state";
import { adminApi } from "@/lib/api";
import { apiErrorMessage, authorizeAction, canonicalDigest, newIntentKey, uploadEvidence } from "./operations-api";
import type { EvidenceUpload } from "./operations-models";
import styles from "./operations-pages.module.css";

interface Proposal {
  id: string; decisionId: string; baseRecordVersion: number; selectedOption: string; applicableScope: string;
  policyVersion: string; artifactId: string; artifactHash: string; authorId: string; reason: string;
  status: string; reviewedBy: string | null; reviewReason: string | null; reviewedAt: string | null; createdAt: string;
}
interface Workspace {
  decisions: { decisionId: string; topic: string; status: string; selectedOption: string | null; policyVersion: string | null }[];
  proposals: Proposal[];
}
interface Registration {
  file: File; decisionId: string; policyVersion: string; selectedOption: string; applicableScope: string;
  reason: string; key: string; keys: { prepare: string; commit: string }; evidence: EvidenceUpload | null;
}
interface Review { proposal: Proposal; decision: "APPROVE" | "REJECT"; reason: string; proof: string; key: string; artifact: unknown; loaded: boolean }

export function BusinessDecisionsPanel({ permissions, employeeId }: Readonly<{ permissions: readonly string[]; employeeId: string }>) {
  const canView = permissions.includes("business-decision:view");
  const canWrite = permissions.includes("business-decision:write") && permissions.includes("evidence:write");
  const canReview = permissions.includes("business-decision:approve") && permissions.includes("action:authorize");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true); setError(null);
    try { setWorkspace((await adminApi.request<Workspace>("/api/admin/v1/business-decision-proposals")).data); }
    catch (cause) { setError(apiErrorMessage(cause)); }
    finally { setLoading(false); }
  }, [canView]);
  useEffect(() => { void load(); }, [load]);

  async function importFile(file: File | undefined) {
    if (!file) return;
    setError(null); setMessage(null);
    try {
      const value: unknown = JSON.parse(await file.text());
      if (typeof value !== "object" || value === null || !("decisionId" in value) || typeof value.decisionId !== "string"
        || !/^D0[1-8]$/.test(value.decisionId) || !("policyVersion" in value) || typeof value.policyVersion !== "string"
        || !("applicableScope" in value) || !("selection" in value)) throw new Error("DECISION_FILE_INVALID");
      setRegistration({ file: new File([await file.text()], file.name, { type: "application/json" }), decisionId: value.decisionId,
        policyVersion: value.policyVersion, selectedOption: "", applicableScope: JSON.stringify(value.applicableScope), reason: "",
        key: newIntentKey("createBusinessDecisionProposal"), keys: { prepare: newIntentKey("prepareAdminUpload"), commit: newIntentKey("commitAdminUpload") }, evidence: null });
      setLocked(false);
    } catch { setError("请选择包含决定编号、政策版本、已选内容和适用范围的选择制品 JSON。"); }
  }
  async function register() {
    if (!registration) return;
    setBusy(true); setLocked(true); setError(null);
    try {
      const evidence = registration.evidence ?? await uploadEvidence(registration.file, "POLICY_ARTIFACT", registration.keys);
      setRegistration({ ...registration, evidence });
      await adminApi.request<Proposal>("/api/admin/v1/business-decision-proposals", { method: "POST", idempotencyKey: registration.key,
        body: { decisionId: registration.decisionId, policyVersion: registration.policyVersion, selectedOption: registration.selectedOption,
          applicableScope: registration.applicableScope, reason: registration.reason, artifactId: evidence.id, artifactHash: evidence.sha256 } });
      setRegistration(null); setLocked(false); setMessage("已登记，等待另一名员工独立复核。"); await load();
    } catch (cause) {
      setError(apiErrorMessage(cause));
      if (cause instanceof ApiError && cause.submissionOutcome !== "UNKNOWN") setLocked(false);
    } finally { setBusy(false); }
  }
  async function openReview(proposal: Proposal) {
    setError(null); setLocked(false);
    const next: Review = { proposal, decision: "APPROVE", reason: "", proof: "", key: newIntentKey("reviewBusinessDecisionProposal"), artifact: null, loaded: false };
    setReview(next); setBusy(true);
    try {
      const result = await adminApi.request<unknown>(`/api/admin/v1/business-decision-proposals/${proposal.id}/artifact`);
      setReview({ ...next, artifact: result.data, loaded: true });
    } catch (cause) { setError(apiErrorMessage(cause)); }
    finally { setBusy(false); }
  }
  async function submitReview() {
    if (!review) return;
    setBusy(true); setLocked(true); setError(null);
    try {
      const expectedHash = await canonicalDigest(["BUSINESS_DECISION_APPROVE", review.proposal.id,
        String(review.proposal.baseRecordVersion), review.proposal.artifactHash, review.decision, review.reason]);
      const action = await authorizeAction({ purpose: "BUSINESS_DECISION_APPROVE", resourceId: review.proposal.id,
        expectedHash, finalIdempotencyKey: review.key, proofCode: review.proof });
      await adminApi.request<Proposal>(`/api/admin/v1/business-decision-proposals/${review.proposal.id}/reviews`, {
        method: "POST", idempotencyKey: review.key, actionToken: action.actionToken, body: { decision: review.decision, reason: review.reason } });
      setReview(null); setLocked(false); setMessage("复核结果已保存；正式规则、奖表及来源仍按各自准入状态执行。"); await load();
    } catch (cause) {
      setError(apiErrorMessage(cause));
      if (cause instanceof ApiError && cause.submissionOutcome !== "UNKNOWN") setLocked(false);
    } finally { setBusy(false); }
  }
  if (!canView) return <PageState kind="forbidden" description="业务决定登记需要全平台员工及相应查看权限。" />;
  return <div className={styles.stack}>
    <InlineNotice title="业务选择登记">登记绑定当前员工和私有制品；另一名员工复核。业务选择通过不代表正式奖表、来源或生产发布已经批准。</InlineNotice>
    {message ? <p role="status">{message}</p> : null}
    {error ? <p role="alert">{error}</p> : null}
    <div className={styles.filterBar}><ActionButton disabled={loading} onClick={() => void load()}>刷新登记</ActionButton>
      {canWrite ? <label className={styles.field}><span>导入选择制品并登记</span><input accept="application/json" type="file" onChange={(event) => { void importFile(event.target.files?.[0]); event.target.value = ""; }} /></label> : null}</div>
    {loading ? <PageState kind="loading" title="正在读取业务决定" /> : null}
    {workspace ? <>
      <Panel title="D01—D08 当前登记"><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>决定</th><th>主题</th><th>状态</th><th>已选说明</th><th>政策编号</th></tr></thead><tbody>
        {workspace.decisions.map((row) => <tr key={row.decisionId}><td>{row.decisionId}</td><td>{row.topic}</td><td>{row.status}</td><td>{row.selectedOption ?? "尚未登记"}</td><td>{row.policyVersion ?? "—"}</td></tr>)}
      </tbody></table></div></Panel>
      <Panel title="最近 100 条登记与复核"><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>决定 / 版本</th><th>选择</th><th>登记人</th><th>复核人</th><th>状态 / 时间</th><th>操作</th></tr></thead><tbody>
        {workspace.proposals.length === 0 ? <tr><td colSpan={6}>暂无登记</td></tr> : workspace.proposals.map((p) => <tr key={p.id}>
          <td>{p.decisionId}<br />{p.policyVersion}</td><td>{p.selectedOption}</td><td>{p.authorId}</td><td>{p.reviewedBy ?? "待复核"}</td><td>{p.status}<br />{formatDateTime(p.createdAt)}</td>
          <td><ActionButton disabled={busy} onClick={() => void openReview(p)}>{p.status === "PENDING_REVIEW" && canReview && p.authorId !== employeeId ? "查看并复核" : "查看制品"}</ActionButton></td>
        </tr>)}
      </tbody></table></div></Panel>
    </> : null}
    <Dialog open={registration !== null} title="登记业务选择" onClose={() => { if (!busy && !locked) setRegistration(null); }} footer={<>
      <ActionButton disabled={busy || locked} onClick={() => setRegistration(null)}>取消</ActionButton><ActionButton disabled={busy || !registration?.selectedOption.trim() || (registration?.reason.trim().length ?? 0) < 2} onClick={() => void register()} variant="primary">{locked ? "原请求重试" : "提交登记"}</ActionButton></>}>
      {registration ? <div className={styles.stack}><p>{registration.decisionId} · {registration.policyVersion}</p>
        <label className={styles.field}><span>已选说明</span><textarea disabled={locked} maxLength={500} value={registration.selectedOption} onChange={(e) => setRegistration({ ...registration, selectedOption: e.target.value })} /></label>
        <label className={styles.field}><span>生效范围</span><textarea readOnly value={registration.applicableScope} /></label>
        <label className={styles.field}><span>登记原因</span><input disabled={locked} maxLength={500} value={registration.reason} onChange={(e) => setRegistration({ ...registration, reason: e.target.value })} /></label>
        {error ? <p role="alert">{error}</p> : null}</div> : null}
    </Dialog>
    <Dialog open={review !== null} title="业务选择制品与复核" width="wide" onClose={() => { if (!busy && !locked) setReview(null); }} footer={<>
      <ActionButton disabled={busy || locked} onClick={() => setReview(null)}>返回</ActionButton>
      {review?.proposal.status === "PENDING_REVIEW" && canReview && review.proposal.authorId !== employeeId ? <ActionButton variant="primary" disabled={busy || !review.loaded || review.reason.trim().length < 2 || !review.proof} onClick={() => void submitReview()}>{locked ? "原请求重试" : "提交复核"}</ActionButton> : null}</>}>
      {review ? <div className={styles.stack}><p>{review.proposal.selectedOption}</p><p>生效范围：{review.proposal.applicableScope}</p>
        {review.loaded ? <pre style={{ maxHeight: 280, overflow: "auto", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(review.artifact, null, 2)}</pre> : <p>制品尚未读取成功</p>}
        {review.proposal.status === "PENDING_REVIEW" && canReview && review.proposal.authorId !== employeeId ? <div className={styles.formGrid}>
          <label className={styles.field}><span>决定</span><select disabled={locked} value={review.decision} onChange={(e) => setReview({ ...review, decision: e.target.value === "APPROVE" ? "APPROVE" : "REJECT" })}><option value="APPROVE">批准业务选择</option><option value="REJECT">驳回</option></select></label>
          <label className={styles.field}><span>MFA 验证码</span><input autoComplete="one-time-code" value={review.proof} onChange={(e) => setReview({ ...review, proof: e.target.value })} /></label>
          <label className={styles.field}><span>复核说明</span><textarea disabled={locked} maxLength={500} value={review.reason} onChange={(e) => setReview({ ...review, reason: e.target.value })} /></label>
        </div> : <p>仅非登记人且具有复核权限的员工可以复核待处理记录。</p>}
        {error ? <p role="alert">{error}</p> : null}</div> : null}
    </Dialog>
  </div>;
}
