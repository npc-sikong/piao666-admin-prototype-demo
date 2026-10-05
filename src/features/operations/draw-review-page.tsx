"use client";

import { numberAreaPresentations, type LotteryCode } from "@piao777/ui-tokens";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionButton,
  Dialog,
  InlineNotice,
  PageHeader,
  Panel,
  StatusBadge,
  Tabs,
  formatDateTime,
} from "@/components/admin-workspace/admin-workspace";
import { NumberBalls } from "@/components/number-balls/number-balls";
import { PageState } from "@/components/page-state/page-state";
import { useAdminSession } from "@/session/admin-session";
import {
  apiErrorMessage,
  createDrawCandidate,
  createPolicyVersion,
  createRuleDraft,
  getAdminCatalog,
  listDrawCandidates,
  listDrawVersions,
  listIssues,
  listPolicies,
  listRuleDrafts,
  newIntentKey,
  reviewDrawCandidate,
  reviewPolicyVersion,
  reviewRuleDraft,
  uploadEvidence,
  type ReviewDecision,
} from "./operations-api";
import type {
  AdminCatalog,
  AdminIssuePage,
  AdminPlay,
  DrawArea,
  DrawCandidate,
  DrawCandidatePage,
  DrawVersionPage,
  EvidenceUpload,
  PolicyCode,
  PolicyView,
  PolicyViewPage,
  RuleDraft,
  RuleDraftPage,
} from "./operations-models";
import styles from "./operations-pages.module.css";
import { ChangeNotesButton } from '@/features/change-notes/change-notes';
import { DrawReportTable } from './draw-report-table';
import { BusinessDecisionsPanel } from "./business-decisions-panel";
import { FixedAwardDialog } from "./fixed-award-dialog";

type ReviewTab = "draw" | "rules" | "policies" | "decisions";

interface CandidateIntent {
  areaValues: Readonly<Record<string, string>>;
  evidence: EvidenceUpload | null;
  file: File | null;
  uploadKeys: UploadIntentKeys;
  key: string;
  reason: string;
  replacesDrawVersion: string;
}

interface RuleIntent {
  playId: string;
  effectiveFromIssue: string;
  evidence: EvidenceUpload | null;
  file: File | null;
  uploadKeys: UploadIntentKeys;
  key: string;
  reason: string;
}

interface PolicyIntent {
  code: PolicyCode;
  evidence: EvidenceUpload | null;
  file: File | null;
  uploadKeys: UploadIntentKeys;
  key: string;
  reason: string;
}

interface UploadIntentKeys {
  prepare: string;
  commit: string;
}

type ReviewTarget =
  | { kind: "candidate"; value: DrawCandidate }
  | { kind: "rule"; value: RuleDraft }
  | { kind: "policy"; value: PolicyView };

interface ReviewIntent {
  target: ReviewTarget;
  decision: ReviewDecision;
  reason: string;
  proofCode: string;
  key: string;
}

export function DrawReviewPage() {
  const session = useAdminSession();
  const identity = session.identity;
  const permissions = identity?.permissions ?? [];
  const canDecisionView = permissions.includes("business-decision:view");
  const canDrawView = permissions.includes("draw:review:view");
  const canCandidateCreate = permissions.includes("draw:candidate:create") && permissions.includes("evidence:write");
  const canDrawReview = permissions.includes("draw:confirm") && permissions.includes("action:authorize");
  const canRuleView = permissions.includes("rule:view");
  const canRuleWrite = permissions.includes("rule:write") && permissions.includes("evidence:write");
  const canRuleReview = permissions.includes("rule:approve") && permissions.includes("action:authorize");
  const canPolicyView = permissions.includes("policy:view");
  const canPolicyWrite = permissions.includes("policy:write") && permissions.includes("evidence:write");
  const canPolicyReview = permissions.includes("policy:approve") && permissions.includes("action:authorize");
  const [tab, setTab] = useState<ReviewTab>("draw");
  const [catalog, setCatalog] = useState<AdminCatalog | null>(null);
  const [rules, setRules] = useState<RuleDraftPage | null>(null);
  const [policies, setPolicies] = useState<PolicyViewPage | null>(null);
  const [lotteryId, setLotteryId] = useState("");
  const [issues, setIssues] = useState<AdminIssuePage | null>(null);
  const [issueCode, setIssueCode] = useState("");
  const [candidates, setCandidates] = useState<DrawCandidatePage | null>(null);
  const [versions, setVersions] = useState<DrawVersionPage | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const [drawStatus, setDrawStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [candidateIntent, setCandidateIntent] = useState<CandidateIntent | null>(null);
  const [ruleIntent, setRuleIntent] = useState<RuleIntent | null>(null);
  const [policyIntent, setPolicyIntent] = useState<PolicyIntent | null>(null);
  const [reviewIntent, setReviewIntent] = useState<ReviewIntent | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadBase = useCallback(async () => {
    if (!canDrawView && !canRuleView && !canPolicyView && !canDecisionView) {
      setStatus("forbidden");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const [catalogResult, ruleResult, policyResult] = await Promise.all([
        getAdminCatalog(),
        canRuleView ? listRuleDrafts() : Promise.resolve(null),
        canPolicyView ? listPolicies() : Promise.resolve(null),
      ]);
      setCatalog(catalogResult);
      setRules(ruleResult);
      setPolicies(policyResult);
      setLotteryId((current) => current || catalogResult.lotteries[0]?.id || "");
      setStatus("ready");
    } catch (cause) {
      setError(apiErrorMessage(cause));
      setStatus("error");
    }
  }, [canDrawView, canPolicyView, canRuleView, canDecisionView]);

  const loadIssueOptions = useCallback(async () => {
    if (lotteryId === "") {
      return;
    }
    try {
      const result = await listIssues(lotteryId, { limit: 100 });
      setIssues(result);
      setIssueCode((current) => result.items.some((item) => item.issueCode === current)
        ? current
        : result.items[0]?.issueCode ?? "");
    } catch (cause) {
      setDrawError(apiErrorMessage(cause));
      setDrawStatus("error");
    }
  }, [lotteryId]);

  const loadDrawData = useCallback(async () => {
    if (!canDrawView || lotteryId === "" || issueCode === "") {
      return;
    }
    setDrawStatus("loading");
    setDrawError(null);
    try {
      const [candidateResult, versionResult] = await Promise.all([
        listDrawCandidates(lotteryId, issueCode),
        listDrawVersions(lotteryId, issueCode),
      ]);
      setCandidates(candidateResult);
      setVersions(versionResult);
      setDrawStatus("ready");
    } catch (cause) {
      setDrawError(apiErrorMessage(cause));
      setDrawStatus("error");
    }
  }, [canDrawView, issueCode, lotteryId]);

  useEffect(() => {
    if (session.status === "authenticated") {
      void loadBase();
    }
  }, [loadBase, session.status]);

  useEffect(() => {
    const requested = new URLSearchParams((window.location.hash.includes('?') ? window.location.hash.slice(window.location.hash.indexOf('?')) : window.location.search)).get("tab");
    if (requested === "rules" || requested === "policies" || requested === "draw" || requested === "decisions") {
      setTab(requested);
    }
  }, []);

  useEffect(() => {
    if (catalog !== null && lotteryId !== "") {
      setIssueCode("");
      setCandidates(null);
      setVersions(null);
      void loadIssueOptions();
    }
  }, [catalog, loadIssueOptions, lotteryId]);

  useEffect(() => {
    if (issueCode !== "") {
      void loadDrawData();
    }
  }, [issueCode, loadDrawData]);

  const selectedLottery = catalog?.lotteries.find((item) => item.id === lotteryId) ?? null;
  const allPlays = useMemo(() => catalog?.lotteries.flatMap((lottery) => (
    lottery.plays.map((play) => ({ ...play, lotteryName: lottery.name }))
  )) ?? [], [catalog]);

  function openCandidate() {
    if (selectedLottery === null) {
      return;
    }
    setSubmitError(null);
    setCandidateIntent({
      areaValues: Object.fromEntries(
        numberAreaPresentations(selectedLottery.code).map((area) => [area.key, ""]),
      ),
      evidence: null,
      file: null,
      uploadKeys: newUploadIntentKeys(),
      key: newIntentKey("createDrawCandidate"),
      reason: "",
      replacesDrawVersion: versions?.items[0]?.version ?? "",
    });
  }

  async function submitCandidate() {
    if (candidateIntent === null || selectedLottery === null || issueCode === "") {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const areas = parseAreas(candidateIntent.areaValues);
      let evidence = candidateIntent.evidence;
      if (evidence === null) {
        if (candidateIntent.file === null) {
          throw new Error("请选择来源证据文件");
        }
        evidence = await uploadEvidence(
          candidateIntent.file,
          "DRAW_EVIDENCE",
          candidateIntent.uploadKeys,
        );
        setCandidateIntent((current) => current === null ? null : ({ ...current, evidence }));
      }
      await createDrawCandidate({
        lotteryId: selectedLottery.id,
        issueCode,
        areas,
        evidence,
        reason: candidateIntent.reason.trim(),
        ...(candidateIntent.replacesDrawVersion.trim() === ""
          ? {}
          : { replacesDrawVersion: candidateIntent.replacesDrawVersion.trim() }),
        idempotencyKey: candidateIntent.key,
      });
      setCandidateIntent(null);
      await loadDrawData();
    } catch (cause) {
      setSubmitError(cause instanceof Error && cause.message.startsWith("AREA_")
        ? areaErrorMessage(cause.message)
        : cause instanceof Error && cause.message === "请选择来源证据文件"
          ? cause.message
          : apiErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRule() {
    if (ruleIntent === null) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      let evidence = ruleIntent.evidence;
      if (evidence === null) {
        if (ruleIntent.file === null) {
          throw new Error("请选择规则制品文件");
        }
        evidence = await uploadEvidence(
          ruleIntent.file,
          "RULE_ARTIFACT",
          ruleIntent.uploadKeys,
        );
        setRuleIntent((current) => current === null ? null : ({ ...current, evidence }));
      }
      await createRuleDraft({
        playId: ruleIntent.playId,
        effectiveFromIssue: ruleIntent.effectiveFromIssue.trim(),
        artifact: evidence,
        reason: ruleIntent.reason.trim(),
        idempotencyKey: ruleIntent.key,
      });
      setRuleIntent(null);
      setRules(await listRuleDrafts());
    } catch (cause) {
      setSubmitError(cause instanceof Error && cause.message === "请选择规则制品文件"
        ? cause.message
        : apiErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitPolicy() {
    if (policyIntent === null) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      let evidence = policyIntent.evidence;
      if (evidence === null) {
        if (policyIntent.file === null) {
          throw new Error("请选择政策制品文件");
        }
        evidence = await uploadEvidence(
          policyIntent.file,
          "POLICY_ARTIFACT",
          policyIntent.uploadKeys,
        );
        setPolicyIntent((current) => current === null ? null : ({ ...current, evidence }));
      }
      await createPolicyVersion({
        code: policyIntent.code,
        artifact: evidence,
        reason: policyIntent.reason.trim(),
        idempotencyKey: policyIntent.key,
      });
      setPolicyIntent(null);
      setPolicies(await listPolicies());
    } catch (cause) {
      setSubmitError(cause instanceof Error && cause.message === "请选择政策制品文件"
        ? cause.message
        : apiErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  function openReview(target: ReviewTarget) {
    setSubmitError(null);
    setReviewIntent({
      target,
      decision: "APPROVE",
      reason: "",
      proofCode: "",
      key: newIntentKey(reviewOperation(target.kind)),
    });
  }

  async function submitReview() {
    if (reviewIntent === null) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const common = {
        decision: reviewIntent.decision,
        reason: reviewIntent.reason.trim(),
        proofCode: reviewIntent.proofCode.trim(),
        idempotencyKey: reviewIntent.key,
      };
      if (reviewIntent.target.kind === "candidate") {
        await reviewDrawCandidate({ candidate: reviewIntent.target.value, ...common });
        await loadDrawData();
      } else if (reviewIntent.target.kind === "rule") {
        await reviewRuleDraft({ rule: reviewIntent.target.value, ...common });
        setRules(await listRuleDrafts());
      } else {
        await reviewPolicyVersion({ policy: reviewIntent.target.value, ...common });
        setPolicies(await listPolicies());
      }
      setReviewIntent(null);
    } catch (cause) {
      setSubmitError(apiErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        actions={(
          <>
            <ChangeNotesButton module="draws" />
            {tab === "rules" && canRuleWrite ? <ActionButton onClick={() => setRuleIntent(newRuleIntent(allPlays[0]))} variant="primary">提交规则版本</ActionButton> : null}
            {tab === "policies" && canPolicyWrite ? <ActionButton onClick={() => setPolicyIntent(newPolicyIntent())} variant="primary">提交政策版本</ActionButton> : null}
            {tab === "policies" && canPolicyWrite && canPolicyView ? <FixedAwardDialog catalog={catalog} policies={policies?.items ?? []} onSaved={async () => setPolicies(await listPolicies())} /> : null}
          </>
        )}
        description="按彩种查看开奖报表，支持日期查询、分页和行内修改号码，二次确认后保留新旧版本。"
        pageId="A04"
        title="开奖候选与复核(修改)"
      />

      {status === "loading" ? <PageState kind="loading" title="正在读取复核工作区" /> : null}
      {status === "forbidden" ? <PageState kind="forbidden" description="当前员工没有开奖、规则或政策复核查看权限。" /> : null}
      {status === "error" ? <PageState action={<ActionButton onClick={() => void loadBase()}>重试</ActionButton>} description={error ?? "复核工作区读取失败。"} kind="error" /> : null}

      {status === "ready" ? (
        <Panel flush title="复核工作区">
          <Tabs<ReviewTab>
            items={[
              { id: "draw", label: "开奖报表" },
              { id: "rules", label: "规则版本", count: rules?.items.length },
              { id: "policies", label: "正式政策", count: policies?.items.length },
              { id: "decisions", label: "业务决定" },
            ]}
            label="复核类型"
            onChange={setTab}
            value={tab}
          />
          <div className={styles.tabContent}>
            {tab === "decisions" ? <BusinessDecisionsPanel permissions={(identity?.scopeStationIds.length ?? 1) === 0 ? permissions : []} employeeId={identity?.employeeId ?? ""} /> : null}
            {tab === "draw" ? (!canDrawView ? <PageState kind="forbidden" title="无开奖查看权限" /> : <DrawReportTable canEdit={canDrawReview} />) : null}
            {tab === "rules" ? (
              rules === null ? <PageState kind="forbidden" description="当前员工没有规则版本查看权限。" /> : (
                <RuleTable
                  canReview={canRuleReview}
                  catalog={catalog}
                  employeeId={identity?.employeeId ?? ""}
                  onReview={openReview}
                  page={rules}
                />
              )
            ) : null}
            {tab === "policies" ? (
              policies === null ? <PageState kind="forbidden" description="当前员工没有政策版本查看权限。" /> : (
                <PolicyTable
                  canReview={canPolicyReview}
                  employeeId={identity?.employeeId ?? ""}
                  onReview={openReview}
                  page={policies}
                />
              )
            ) : null}
          </div>
        </Panel>
      ) : null}

      <CandidateDialog
        intent={candidateIntent}
        lotteryCode={selectedLottery?.code ?? null}
        onChange={setCandidateIntent}
        onClose={() => setCandidateIntent(null)}
        onSubmit={() => void submitCandidate()}
        submitting={submitting}
        error={candidateIntent === null ? null : submitError}
      />
      <RuleDialog
        intent={ruleIntent}
        onChange={setRuleIntent}
        onClose={() => setRuleIntent(null)}
        onSubmit={() => void submitRule()}
        plays={allPlays}
        submitting={submitting}
        error={ruleIntent === null ? null : submitError}
      />
      <PolicyDialog
        intent={policyIntent}
        onChange={setPolicyIntent}
        onClose={() => setPolicyIntent(null)}
        onSubmit={() => void submitPolicy()}
        submitting={submitting}
        error={policyIntent === null ? null : submitError}
      />
      <ReviewDialog
        intent={reviewIntent}
        onChange={setReviewIntent}
        onClose={() => setReviewIntent(null)}
        onSubmit={() => void submitReview()}
        submitting={submitting}
        error={reviewIntent === null ? null : submitError}
      />
    </>
  );
}

function CandidateTable({
  page,
  lotteryCode,
  employeeId,
  canReview,
  onReview,
}: Readonly<{
  page: DrawCandidatePage | null;
  lotteryCode: LotteryCode;
  employeeId: string;
  canReview: boolean;
  onReview(target: ReviewTarget): void;
}>) {
  return (
    <Panel description="来源、证据、作者和替代版本均来自服务端事实。" flush title="开奖候选">
      <div className={styles.tableWrap}>
        <table className={styles.table} data-wide="true">
          <thead><tr><th>候选</th><th>号码</th><th>来源</th><th>状态</th><th>证据</th><th>作者</th><th>创建时间</th><th>操作</th></tr></thead>
          <tbody>
            {page === null || page.items.length === 0 ? <tr><td className={styles.emptyCell} colSpan={8}>当前期次没有开奖候选</td></tr> : page.items.map((candidate) => {
              const own = candidate.authorId === employeeId;
              return (
                <tr key={candidate.id}>
                  <td><span className={styles.entity}><strong>{candidate.issueCode}</strong><small>记录 v{candidate.version}</small></span></td>
                  <td><NumberBalls areas={candidate.areas} lotteryCode={lotteryCode} /></td>
                  <td>{candidate.source === "SYSTEM" ? "系统采集" : "人工录入"}</td>
                  <td><StatusBadge label={candidateStatusLabel(candidate.status)} status={candidate.status} /></td>
                  <td>{candidate.evidenceIds.length} 份</td>
                  <td><code className={styles.mono}>{candidate.authorId}</code></td>
                  <td>{formatDateTime(candidate.createdAt)}</td>
                  <td><button className={styles.textButton} disabled={!canReview || own || candidate.status !== "PENDING_REVIEW"} onClick={() => onReview({ kind: "candidate", value: candidate })} type="button">{own ? "作者不可复核" : "复核"}</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function VersionTable({ page, lotteryCode }: Readonly<{ page: DrawVersionPage | null; lotteryCode: LotteryCode }>) {
  return (
    <Panel description="更正版本按时间保留，原确认记录不会被覆盖。" flush title="已确认开奖版本">
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>版本</th><th>号码</th><th>状态</th><th>来源</th><th>奖项引用</th><th>确认时间</th><th>更正说明</th></tr></thead>
          <tbody>
            {page === null || page.items.length === 0 ? <tr><td className={styles.emptyCell} colSpan={7}>当前期次尚无确认开奖版本</td></tr> : page.items.map((version) => (
              <tr key={`${version.issueCode}-${version.version}`}>
                <td><strong>v{version.version}</strong></td>
                <td><NumberBalls areas={version.areas} lotteryCode={lotteryCode} /></td>
                <td><StatusBadge label={drawStatusLabel(version.status)} status={version.status} /></td>
                <td>{version.source === "SYSTEM" ? "系统来源" : "人工复核"}</td>
                <td>{version.prizeReferenceStatus}</td>
                <td>{version.confirmedAt === null ? "未确认" : formatDateTime(version.confirmedAt)}</td>
                <td>{version.correctionNote ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function RuleTable({ page, catalog, employeeId, canReview, onReview }: Readonly<{
  page: RuleDraftPage;
  catalog: AdminCatalog | null;
  employeeId: string;
  canReview: boolean;
  onReview(target: ReviewTarget): void;
}>) {
  return (
    <div className={styles.stack}>
      <InlineNotice title="规则版本必须独立复核" tone="warning">
        规则作者不能批准本人提交的版本；批准前会校验制品完整性，D01 未就绪的玩法仍不会自动获得生产准入。
      </InlineNotice>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>玩法</th><th>版本</th><th>生效期</th><th>状态</th><th>作者</th><th>制品摘要</th><th>操作</th></tr></thead>
          <tbody>
            {page.items.length === 0 ? <tr><td className={styles.emptyCell} colSpan={7}>暂无规则版本</td></tr> : page.items.map((rule) => {
              const own = rule.authorId === employeeId;
              return (
                <tr key={rule.id}>
                  <td><strong>{catalogPlayName(catalog, rule.playId)}</strong></td>
                  <td>v{rule.version}</td>
                  <td>{rule.effectiveFromIssue}</td>
                  <td><StatusBadge label={ruleStatusLabel(rule.status)} status={rule.status} /></td>
                  <td><code className={styles.mono}>{rule.authorId}</code></td>
                  <td><code className={styles.hash} title={rule.artifactHash}>{rule.artifactHash}</code></td>
                  <td><button className={styles.textButton} disabled={!canReview || own || rule.status !== "PENDING_REVIEW"} onClick={() => onReview({ kind: "rule", value: rule })} type="button">{own ? "作者不可复核" : "复核"}</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PolicyTable({ page, employeeId, canReview, onReview }: Readonly<{
  page: PolicyViewPage;
  employeeId: string;
  canReview: boolean;
  onReview(target: ReviewTarget): void;
}>) {
  return (
    <div className={styles.stack}>
      <InlineNotice title="正式政策受 D02–D07 门禁" tone="warning">
        上传制品不等于决策已批准；缺少正式决策证据时，服务端必须拒绝批准并保持业务入口未就绪。
      </InlineNotice>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>政策</th><th>版本</th><th>决策</th><th>状态</th><th>作者</th><th>制品摘要</th><th>操作</th></tr></thead>
          <tbody>
            {page.items.length === 0 ? <tr><td className={styles.emptyCell} colSpan={7}>暂无政策版本</td></tr> : page.items.map((policy) => {
              const own = policy.authorId === employeeId;
              return (
                <tr key={policy.id}>
                  <td><strong>{policyLabel(policy.code)}</strong></td>
                  <td>v{policy.version}</td>
                  <td>{policy.decisionIds.join(" / ")}</td>
                  <td><StatusBadge label={policyStatusLabel(policy.status)} status={policy.status} /></td>
                  <td><code className={styles.mono}>{policy.authorId}</code></td>
                  <td><code className={styles.hash} title={policy.artifactHash}>{policy.artifactHash}</code></td>
                  <td><button className={styles.textButton} disabled={!canReview || own || policy.status !== "PENDING_REVIEW"} onClick={() => onReview({ kind: "policy", value: policy })} type="button">{own ? "作者不可复核" : "复核"}</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CandidateDialog({ intent, lotteryCode, onChange, onClose, onSubmit, submitting, error }: Readonly<{
  intent: CandidateIntent | null;
  lotteryCode: LotteryCode | null;
  onChange(value: CandidateIntent | null): void;
  onClose(): void;
  onSubmit(): void;
  submitting: boolean;
  error: string | null;
}>) {
  return (
    <Dialog
      description="人工录入只形成待复核候选；证据文件会先进入私有证据存储。"
      footer={<><ActionButton disabled={submitting} onClick={onClose}>取消</ActionButton><ActionButton disabled={submitting || intent === null || intent.file === null || intent.reason.trim().length < 2} onClick={onSubmit} variant="primary">{submitting ? "提交中" : "提交候选"}</ActionButton></>}
      onClose={onClose}
      open={intent !== null}
      title="录入开奖候选"
      width="wide"
    >
      {intent === null || lotteryCode === null ? null : (
        <div className={styles.formGrid}>
          <div className={`${styles.areaEditor} ${styles.span2}`}>
            {numberAreaPresentations(lotteryCode).map((area) => (
              <div className={styles.areaEditorRow} key={area.key}>
                <label>{area.label}<small>{area.key}</small></label>
                <input className={styles.compactInput} onChange={(event) => onChange({ ...intent, areaValues: { ...intent.areaValues, [area.key]: event.target.value } })} placeholder="用空格或逗号分隔，保留完整号码" value={intent.areaValues[area.key] ?? ""} />
              </div>
            ))}
          </div>
          <label className={styles.field}>
            <span>替代开奖版本</span>
            <input onChange={(event) => onChange({ ...intent, replacesDrawVersion: event.target.value })} placeholder="首次确认可留空" value={intent.replacesDrawVersion} />
          </label>
          <label className={styles.field}>
            <span>来源证据文件</span>
            <input accept="application/json,image/png,image/jpeg,application/pdf,text/plain" onChange={(event) => onChange({ ...intent, file: event.target.files?.[0] ?? null, evidence: null, uploadKeys: newUploadIntentKeys() })} type="file" />
          </label>
          <label className={`${styles.field} ${styles.span2}`}>
            <span>录入或更正原因</span>
            <textarea maxLength={500} onChange={(event) => onChange({ ...intent, reason: event.target.value })} value={intent.reason} />
          </label>
          {intent.evidence === null ? null : <div className={`${styles.fileSummary} ${styles.span2}`}><span>证据已上传</span><strong>{intent.evidence.id}</strong></div>}
          {error === null ? null : <p className={`${styles.feedback} ${styles.span2}`} role="alert">{error}</p>}
        </div>
      )}
    </Dialog>
  );
}

function RuleDialog({ intent, plays, onChange, onClose, onSubmit, submitting, error }: Readonly<{
  intent: RuleIntent | null;
  plays: readonly (AdminPlay & { lotteryName: string })[];
  onChange(value: RuleIntent | null): void;
  onClose(): void;
  onSubmit(): void;
  submitting: boolean;
  error: string | null;
}>) {
  return (
    <Dialog
      description="规则制品提交后进入待独立复核状态，不会直接覆盖生效版本。"
      footer={<><ActionButton disabled={submitting} onClick={onClose}>取消</ActionButton><ActionButton disabled={submitting || intent === null || intent.file === null || intent.playId === "" || intent.effectiveFromIssue.trim() === "" || intent.reason.trim().length < 2} onClick={onSubmit} variant="primary">{submitting ? "提交中" : "提交待复核"}</ActionButton></>}
      onClose={onClose}
      open={intent !== null}
      title="提交玩法规则版本"
    >
      {intent === null ? null : (
        <div className={styles.formGrid}>
          <label className={`${styles.field} ${styles.span2}`}><span>彩票与玩法</span><select onChange={(event) => onChange({ ...intent, playId: event.target.value })} value={intent.playId}>{plays.map((play) => <option key={play.id} value={play.id}>{play.lotteryName} · {play.name}</option>)}</select></label>
          <label className={styles.field}><span>计划生效期</span><input maxLength={32} onChange={(event) => onChange({ ...intent, effectiveFromIssue: event.target.value })} value={intent.effectiveFromIssue} /></label>
          <label className={styles.field}><span>规则制品文件</span><input accept="application/json" onChange={(event) => onChange({ ...intent, file: event.target.files?.[0] ?? null, evidence: null, uploadKeys: newUploadIntentKeys() })} type="file" /></label>
          <label className={`${styles.field} ${styles.span2}`}><span>提交原因</span><textarea maxLength={500} onChange={(event) => onChange({ ...intent, reason: event.target.value })} value={intent.reason} /></label>
          {intent.evidence === null ? null : <div className={`${styles.fileSummary} ${styles.span2}`}><span>制品已上传</span><strong>{intent.evidence.id}</strong></div>}
          {error === null ? null : <p className={`${styles.feedback} ${styles.span2}`} role="alert">{error}</p>}
        </div>
      )}
    </Dialog>
  );
}

function PolicyDialog({ intent, onChange, onClose, onSubmit, submitting, error }: Readonly<{
  intent: PolicyIntent | null;
  onChange(value: PolicyIntent | null): void;
  onClose(): void;
  onSubmit(): void;
  submitting: boolean;
  error: string | null;
}>) {
  const codes: readonly PolicyCode[] = ["SIMULATION_AWARD", "REFERRAL_FIXED", "REFERRAL_AI_SHARE"];
  return (
    <Dialog
      description="模拟返奖与推广政策会绑定对应 D02、D06、D07 决策；福彩3D AI认购使用项目内现行规则集。"
      footer={<><ActionButton disabled={submitting} onClick={onClose}>取消</ActionButton><ActionButton disabled={submitting || intent === null || intent.file === null || intent.reason.trim().length < 2} onClick={onSubmit} variant="primary">{submitting ? "提交中" : "提交待复核"}</ActionButton></>}
      onClose={onClose}
      open={intent !== null}
      title="提交正式政策版本"
    >
      {intent === null ? null : (
        <div className={styles.formGrid}>
          <label className={`${styles.field} ${styles.span2}`}><span>政策类型</span><select onChange={(event) => onChange({ ...intent, code: event.target.value as PolicyCode })} value={intent.code}>{codes.map((code) => <option key={code} value={code}>{policyLabel(code)}</option>)}</select></label>
          <label className={`${styles.field} ${styles.span2}`}><span>政策制品文件</span><input accept="application/json" onChange={(event) => onChange({ ...intent, file: event.target.files?.[0] ?? null, evidence: null, uploadKeys: newUploadIntentKeys() })} type="file" /></label>
          <label className={`${styles.field} ${styles.span2}`}><span>提交原因</span><textarea maxLength={500} onChange={(event) => onChange({ ...intent, reason: event.target.value })} value={intent.reason} /></label>
          {intent.evidence === null ? null : <div className={`${styles.fileSummary} ${styles.span2}`}><span>制品已上传</span><strong>{intent.evidence.id}</strong></div>}
          {error === null ? null : <p className={`${styles.feedback} ${styles.span2}`} role="alert">{error}</p>}
        </div>
      )}
    </Dialog>
  );
}

function ReviewDialog({ intent, onChange, onClose, onSubmit, submitting, error }: Readonly<{
  intent: ReviewIntent | null;
  onChange(value: ReviewIntent | null): void;
  onClose(): void;
  onSubmit(): void;
  submitting: boolean;
  error: string | null;
}>) {
  return (
    <Dialog
      description="动作凭据绑定当前资源版本、决定、原因和最终幂等键；任一内容变化都必须重新认证。"
      footer={<><ActionButton disabled={submitting} onClick={onClose}>取消</ActionButton><ActionButton disabled={submitting || intent === null || intent.reason.trim().length < 2 || intent.proofCode.trim().length < 6} onClick={onSubmit} variant={intent?.decision === "REJECT" ? "danger" : "primary"}>{submitting ? "复核中" : intent?.decision === "REJECT" ? "确认驳回" : "确认批准"}</ActionButton></>}
      onClose={onClose}
      open={intent !== null}
      title="独立复核"
    >
      {intent === null ? null : (
        <div className={styles.formGrid}>
          <div className={`${styles.decisionBox} ${styles.span2}`}>
            <button data-active={intent.decision === "APPROVE" || undefined} data-decision="APPROVE" onClick={() => onChange({ ...intent, decision: "APPROVE" })} type="button"><strong>批准</strong><small>当前事实通过校验后生成新版本</small></button>
            <button data-active={intent.decision === "REJECT" || undefined} data-decision="REJECT" onClick={() => onChange({ ...intent, decision: "REJECT" })} type="button"><strong>驳回</strong><small>保留候选或制品历史，不覆盖旧事实</small></button>
          </div>
          <label className={`${styles.field} ${styles.span2}`}><span>复核原因</span><textarea maxLength={500} onChange={(event) => onChange({ ...intent, reason: event.target.value })} value={intent.reason} /></label>
          <label className={`${styles.field} ${styles.span2}`}><span>MFA 动态码</span><input autoComplete="one-time-code" inputMode="numeric" maxLength={6} onChange={(event) => onChange({ ...intent, proofCode: event.target.value.replace(/\D/g, "") })} value={intent.proofCode} /><small>输入“批准”或点击两个弹窗不能替代员工强认证。</small></label>
          {error === null ? null : <p className={`${styles.feedback} ${styles.span2}`} role="alert">{error}</p>}
        </div>
      )}
    </Dialog>
  );
}

function newRuleIntent(play: (AdminPlay & { lotteryName: string }) | undefined): RuleIntent {
  return { playId: play?.id ?? "", effectiveFromIssue: "", evidence: null, file: null, uploadKeys: newUploadIntentKeys(), key: newIntentKey("createRuleDraft"), reason: "" };
}

function newPolicyIntent(): PolicyIntent {
  return { code: "SIMULATION_AWARD", evidence: null, file: null, uploadKeys: newUploadIntentKeys(), key: newIntentKey("createPolicyVersion"), reason: "" };
}

function newUploadIntentKeys(): UploadIntentKeys {
  return {
    prepare: newIntentKey("prepareAdminUpload"),
    commit: newIntentKey("commitAdminUpload"),
  };
}

function parseAreas(values: Readonly<Record<string, string>>): readonly DrawArea[] {
  return Object.entries(values).map(([key, raw]) => {
    const tokens = raw.trim().split(/[\s,，]+/).filter(Boolean);
    if (tokens.length === 0) {
      throw new Error(`AREA_EMPTY:${key}`);
    }
    const chosen = tokens.map((token) => Number(token));
    if (chosen.some((value) => !Number.isInteger(value) || value < 0 || value > 99)) {
      throw new Error(`AREA_INVALID:${key}`);
    }
    if (new Set(chosen).size !== chosen.length) {
      throw new Error(`AREA_DUPLICATE:${key}`);
    }
    return { key, chosen };
  });
}

function areaErrorMessage(code: string): string {
  const [kind, key = "号码区域"] = code.split(":");
  if (kind === "AREA_EMPTY") return `${key} 不能为空。`;
  if (kind === "AREA_DUPLICATE") return `${key} 不能包含重复号码。`;
  return `${key} 只能输入 0–99 的整数，并使用空格或逗号分隔。`;
}

function reviewOperation(kind: ReviewTarget["kind"]): string {
  if (kind === "candidate") return "reviewDrawCandidate";
  if (kind === "rule") return "reviewRuleDraft";
  return "reviewPolicyVersion";
}

function catalogPlayName(catalog: AdminCatalog | null, playId: string): string {
  if (catalog === null) return playId;
  for (const lottery of catalog.lotteries) {
    const play = lottery.plays.find((item) => item.id === playId);
    if (play !== undefined) return `${lottery.name} · ${play.name}`;
  }
  return playId;
}

function candidateStatusLabel(value: string): string {
  return { PENDING_REVIEW: "待独立复核", APPROVED: "已批准", REJECTED: "已驳回", CONFLICT: "来源冲突" }[value] ?? value;
}

function drawStatusLabel(value: string): string {
  return { PENDING: "待确认", CONFIRMED: "已确认", CORRECTED: "更正版本", CONFLICT: "冲突" }[value] ?? value;
}

function ruleStatusLabel(value: string): string {
  return { DRAFT: "草稿", PENDING_REVIEW: "待独立复核", APPROVED: "已批准", REJECTED: "已驳回" }[value] ?? value;
}

function policyStatusLabel(value: string): string {
  return { UNCONFIRMED: "决策未就绪", PENDING_REVIEW: "待独立复核", APPROVED: "已批准", REJECTED: "已驳回", SUPERSEDED: "已被替代" }[value] ?? value;
}

function policyLabel(value: PolicyCode): string {
  return {
    SIMULATION_AWARD: "模拟返奖",
    REFERRAL_FIXED: "固定推广奖励",
    REFERRAL_AI_SHARE: "AI 推荐分红",
  }[value];
}
