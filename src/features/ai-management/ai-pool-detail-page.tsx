"use client";

import { numberAreaPresentations } from "@piao777/ui-tokens";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
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
import { NumberBalls } from "@/components/number-balls/number-balls";
import { PageState } from "@/components/page-state/page-state";
import {
  apiErrorMessage,
  createDrawCandidate,
  fetchDraw,
  getAdminCatalog,
  listDrawCandidates,
  listDrawVersions,
  newIntentKey,
  reviewDrawCandidate,
  uploadEvidence,
} from "@/features/operations/operations-api";
import type {
  AdminCatalog,
  DrawArea,
  DrawCandidate,
  DrawCandidatePage,
  DrawVersionPage,
  EvidenceUpload,
} from "@/features/operations/operations-models";
import { useAdminSession } from "@/session/admin-session";
import { closeFunding, errorView, getPool, listSubscriptions, newIntent } from "./ai-management-api";
import type {
  AiPoolAdmin,
  CommandReceipt,
  Subscription,
  TaskAccepted,
} from "./ai-management-models";
import {
  Breadcrumbs,
  Definition,
  DefinitionList,
  ErrorState,
  PoolStatusBadge,
  TaskReceipt,
  actualNetReturnRateText,
  formatAiPoints,
  formatBps,
  formatDateTime,
  formatRate,
  shortHash,
} from "./ai-management-ui";
import { useAiTask } from "./use-ai-task";
import styles from "./ai-management.module.css";
import { AiBudgetDialog } from "./ai-budget-dialog";

type DetailTab = "overview" | "subscriptions" | "draw";

interface CandidateIntent {
  areaValues: Readonly<Record<string, string>>;
  evidence: EvidenceUpload | null;
  file: File | null;
  uploadKeys: Readonly<{ prepare: string; commit: string }>;
  idempotencyKey: string;
  reason: string;
  replacesDrawVersion: string;
}

interface ReviewIntent {
  candidate: DrawCandidate;
  decision: "APPROVE" | "REJECT";
  reason: string;
  proofCode: string;
  idempotencyKey: string;
}

export function AiPoolDetailPage({ poolIssueId }: Readonly<{ poolIssueId: string }>) {
  const session = useAdminSession();
  const permissions = session.identity?.permissions ?? [];
  const canView = permissions.includes("ai-pool:view");
  const canViewSubscriptions = permissions.includes("ai-pool:subscriptions:view");
  const canClose = permissions.includes("ai-pool:close");
  const canFetchDraw = permissions.includes("draw:fetch");
  const canDrawView = permissions.includes("draw:review:view");
  const canCreateCandidate = permissions.includes("draw:candidate:create") && permissions.includes("evidence:write");
  const canReviewDraw = permissions.includes("draw:confirm") && permissions.includes("action:authorize");
  const [tab, setTab] = useState<DetailTab>("overview");
  const [pool, setPool] = useState<AiPoolAdmin | null>(null);
  const [etag, setEtag] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<AdminCatalog | null>(null);
  const [subscriptions, setSubscriptions] = useState<readonly Subscription[]>([]);
  const [subscriptionCursor, setSubscriptionCursor] = useState<string | null>(null);
  const [subscriptionHasMore, setSubscriptionHasMore] = useState(false);
  const [subscriptionsLoadingMore, setSubscriptionsLoadingMore] = useState(false);
  const [candidates, setCandidates] = useState<DrawCandidatePage | null>(null);
  const [versions, setVersions] = useState<DrawVersionPage | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const [error, setError] = useState<ReturnType<typeof errorView> | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [closeIntent, setCloseIntent] = useState<string | null>(null);
  const [closeReceipt, setCloseReceipt] = useState<CommandReceipt | null>(null);
  const [fetchOpen, setFetchOpen] = useState(false);
  const [sourceId, setSourceId] = useState("");
  const [fetchReason, setFetchReason] = useState("");
  const [fetchIntent, setFetchIntent] = useState<string | null>(null);
  const [candidateIntent, setCandidateIntent] = useState<CandidateIntent | null>(null);
  const [reviewIntent, setReviewIntent] = useState<ReviewIntent | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const drawTask = useAiTask();

  const load = useCallback(async () => {
    if (!canView) {
      setStatus("forbidden");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const [poolResult, catalogResult] = await Promise.all([
        getPool(poolIssueId),
        getAdminCatalog(),
      ]);
      const [subscriptionResult, candidateResult, versionResult] = await Promise.all([
        canViewSubscriptions ? listSubscriptions(poolIssueId) : Promise.resolve(null),
        canDrawView
          ? listDrawCandidates(poolResult.value.pool.lotteryId, poolResult.value.pool.issueCode)
          : Promise.resolve(null),
        canDrawView
          ? listDrawVersions(poolResult.value.pool.lotteryId, poolResult.value.pool.issueCode)
          : Promise.resolve(null),
      ]);
      setPool(poolResult.value);
      setEtag(poolResult.etag);
      setCatalog(catalogResult);
      setSubscriptions(subscriptionResult?.items ?? []);
      setSubscriptionCursor(subscriptionResult?.nextCursor ?? null);
      setSubscriptionHasMore(subscriptionResult?.hasMore ?? false);
      setCandidates(candidateResult);
      setVersions(versionResult);
      setStatus("ready");
    } catch (cause) {
      const view = errorView(cause);
      setError(view);
      setStatus(view.kind === "forbidden" ? "forbidden" : "error");
    }
  }, [canDrawView, canView, canViewSubscriptions, poolIssueId]);

  useEffect(() => {
    if (session.status === "authenticated") void load();
  }, [load, session.status]);

  useEffect(() => {
    if (drawTask.status?.status === "SUCCEEDED") void load();
  }, [drawTask.status?.status, load]);

  const lottery = useMemo(() => catalog?.lotteries.find((item) => item.id === pool?.pool.lotteryId) ?? null, [catalog, pool]);
  const play = lottery?.plays.find((item) => item.id === pool?.pool.playId) ?? null;

  async function loadMoreSubscriptions() {
    if (subscriptionCursor === null || subscriptionsLoadingMore) return;
    setSubscriptionsLoadingMore(true);
    setError(null);
    try {
      const result = await listSubscriptions(poolIssueId, subscriptionCursor);
      setSubscriptions((current) => [...current, ...result.items]);
      setSubscriptionCursor(result.nextCursor);
      setSubscriptionHasMore(result.hasMore);
    } catch (cause) {
      setError(errorView(cause));
    } finally {
      setSubscriptionsLoadingMore(false);
    }
  }

  async function submitClose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pool === null || etag === null) return;
    const intent = closeIntent ?? newIntent("closeAiPoolFunding");
    setCloseIntent(intent);
    setSubmitting(true);
    setSubmitError(null);
    try {
      const receipt = await closeFunding({
        poolIssueId,
        etag,
        reason: closeReason.trim(),
        idempotencyKey: intent,
      });
      setCloseReceipt(receipt);
      setFeedback("认购截止命令已由服务端确认；页面已重新读取期次事实。");
      setCloseOpen(false);
      setCloseIntent(null);
      await load();
    } catch (cause) {
      setSubmitError(errorView(cause).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitFetch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pool === null) return;
    const intent = fetchIntent ?? newIntentKey("fetchDraw");
    setFetchIntent(intent);
    setSubmitting(true);
    setSubmitError(null);
    try {
      const accepted = await fetchDraw({
        lotteryId: pool.pool.lotteryId,
        issueCode: pool.pool.issueCode,
        approvedSourceId: sourceId.trim(),
        reason: fetchReason.trim(),
        idempotencyKey: intent,
      });
      drawTask.start(taskAccepted(accepted));
      setFetchOpen(false);
      setFetchIntent(null);
      setFeedback("开奖抓取任务已受理，需等待任务完成并复核候选，当前期次尚未据此结算。");
    } catch (cause) {
      setSubmitError(errorView(cause).message);
    } finally {
      setSubmitting(false);
    }
  }

  function openCandidate() {
    if (lottery === null) return;
    setSubmitError(null);
    setCandidateIntent({
      areaValues: Object.fromEntries(numberAreaPresentations(lottery.code).map((area) => [area.key, ""])),
      evidence: null,
      file: null,
      uploadKeys: {
        prepare: newIntentKey("prepareAdminUpload"),
        commit: newIntentKey("commitAdminUpload"),
      },
      idempotencyKey: newIntentKey("createDrawCandidate"),
      reason: "",
      replacesDrawVersion: versions?.items[0]?.version ?? "",
    });
  }

  async function submitCandidate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (candidateIntent === null || pool === null) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const areas = parseAreas(candidateIntent.areaValues);
      let evidence = candidateIntent.evidence;
      if (evidence === null) {
        if (candidateIntent.file === null) throw new Error("请选择开奖来源证据文件。");
        evidence = await uploadEvidence(candidateIntent.file, "DRAW_EVIDENCE", candidateIntent.uploadKeys);
        setCandidateIntent((current) => current === null ? null : { ...current, evidence });
      }
      await createDrawCandidate({
        lotteryId: pool.pool.lotteryId,
        issueCode: pool.pool.issueCode,
        areas,
        evidence,
        reason: candidateIntent.reason.trim(),
        ...(candidateIntent.replacesDrawVersion.trim() === "" ? {} : { replacesDrawVersion: candidateIntent.replacesDrawVersion.trim() }),
        idempotencyKey: candidateIntent.idempotencyKey,
      });
      setCandidateIntent(null);
      setFeedback("人工开奖候选与证据已提交，必须由非作者员工独立复核后才会成为确认版本。");
      await load();
    } catch (cause) {
      setSubmitError(candidateError(cause));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reviewIntent === null) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await reviewDrawCandidate({
        candidate: reviewIntent.candidate,
        decision: reviewIntent.decision,
        reason: reviewIntent.reason.trim(),
        proofCode: reviewIntent.proofCode,
        idempotencyKey: reviewIntent.idempotencyKey,
      });
      setReviewIntent(null);
      setFeedback("开奖候选复核结果已由服务端记录，期次详情已刷新。");
      await load();
    } catch (cause) {
      setSubmitError(errorView(cause).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (session.status === "loading") return <PageState kind="loading" title="正在读取员工会话" description="确认期次权限与数据范围。" />;
  if (session.status === "anonymous") return <PageState kind="forbidden" title="员工会话已失效" description="请重新登录运营后台。" />;
  if (session.status === "error") return <PageState kind="error" title="员工会话不可用" description={`会话校验失败（${session.errorCode ?? "SESSION_UNAVAILABLE"}）。`} />;
  if (status === "loading") return <PageState kind="loading" title="正在读取 AI 合买期次" description="同步固定号码、认购与开奖版本。" />;
  if (status === "forbidden") return <PageState kind="forbidden" title="无期次查看权限" description="需要 ai-pool:view 权限与匹配的数据范围。" />;
  if (status === "error" || pool === null) return <ErrorState error={error ?? errorView(new Error("AI_POOL_UNAVAILABLE"))} onRetry={() => void load()} />;

  const value = pool.pool;
  const tabs = [
    { id: "overview" as const, label: "期次概览", count: pool.combinations.length },
    { id: "subscriptions" as const, label: "认购与容量", count: canViewSubscriptions ? subscriptions.length : undefined },
    { id: "draw" as const, label: "开奖与证据", count: canDrawView ? candidates?.items.length ?? 0 : undefined },
  ];
  const canCloseNow = canClose && pool.allowedActions.includes("CLOSE_FUNDING") && etag !== null;

  return (
    <div className={styles.stack}>
      <Breadcrumbs current={`期次 ${value.issueCode}`} />
      <PageHeader
        actions={<div className={styles.pageActions}><Link className={styles.linkButton} href={`/ai-pools/${encodeURIComponent(poolIssueId)}/allocation`}>分配与公示</Link><Link className={styles.linkButton} href={`/ai-pools/${encodeURIComponent(poolIssueId)}/payout`}>发放中心</Link>{canCloseNow ? <ActionButton onClick={() => { setCloseReason(""); setCloseIntent(newIntent("closeAiPoolFunding")); setSubmitError(null); setCloseOpen(true); }} variant="primary">截止认购</ActionButton> : null}</div>}
        description="固定号码、认购资金与开奖证据以同一期次版本为边界；浏览器只提交操作意图。"
        meta={<div className={styles.inlineActions}><PoolStatusBadge status={value.status} /><span>{lottery?.name ?? value.lotteryId} · {play?.name ?? value.playId}</span><span>输入集 {shortHash(pool.inputVersionSetHash)}</span></div>}
        pageId="A14"
        title={`AI 合买期次 · ${value.issueCode}`}
      />
      {feedback === null ? null : <InlineNotice tone="success" title="服务端回执">{feedback}</InlineNotice>}
      {session.identity?.permissions.includes("ai-project:configure") ? <AiBudgetDialog pools={[value]} /> : null}
      {error === null ? null : <InlineNotice tone="danger" title="部分数据加载失败">{error.message}</InlineNotice>}
      {value.status === "EXCEPTION_PENDING" ? <InlineNotice tone="warning" title="异常待处理">当前期次存在无解、超时、版本或规则阻塞；请查看分配页的服务端失败状态，不得人工猜测分配结果。</InlineNotice> : null}
      {closeReceipt === null ? null : <InlineNotice tone="info" title="命令回执">命令 {closeReceipt.commandId} · {closeReceipt.status} · 资源 {closeReceipt.resourceId}</InlineNotice>}
      <MetricStrip items={[
        { label: "总资金 T", value: formatAiPoints(value.totalPurchasePoints), detail: "服务端期次事实" },
        { label: "用户资金 U", value: formatAiPoints(value.userPurchasePoints), detail: `实际占比 ${formatRate(value.actualUserShare)}` },
        { label: "平台资金 F", value: formatAiPoints(value.platformPoints), detail: `含对齐补池 ${formatAiPoints(value.alignmentPoints)}` },
        { label: "总返还", value: value.totalWinningPoints === null ? "待开奖" : formatAiPoints(value.totalWinningPoints), detail: "服务端结算事实" },
        { label: "实际净收益率", value: actualNetReturnRateText(value.totalPurchasePoints, value.totalWinningPoints) ?? "待开奖", detail: "（总返还−总投入）÷总投入" },
        { label: "参与人数", value: String(value.participantCount), detail: `用户增量比例 ${formatBps(value.userIncrementRatioBps)}` },
      ]} />
      <Tabs<DetailTab> items={tabs} label="期次详情" onChange={setTab} value={tab} />

      {tab === "overview" ? <OverviewTab pool={pool} /> : null}
      {tab === "subscriptions" ? <SubscriptionsTab canView={canViewSubscriptions} hasMore={subscriptionHasMore} items={subscriptions} loadingMore={subscriptionsLoadingMore} onLoadMore={() => void loadMoreSubscriptions()} /> : null}
      {tab === "draw" ? (
        <DrawTab
          canCreate={canCreateCandidate}
          canFetch={canFetchDraw}
          canReview={canReviewDraw}
          canView={canDrawView}
          candidates={candidates}
          employeeId={session.identity?.employeeId ?? ""}
          lotteryCode={lottery?.code ?? null}
          onCreate={openCandidate}
          onFetch={() => { setSourceId(""); setFetchReason(""); setFetchIntent(newIntentKey("fetchDraw")); setSubmitError(null); setFetchOpen(true); }}
          onReview={(candidate) => { setSubmitError(null); setReviewIntent({ candidate, decision: "APPROVE", reason: "", proofCode: "", idempotencyKey: newIntentKey("reviewDrawCandidate") }); }}
          versions={versions}
        />
      ) : null}
      <TaskReceipt accepted={drawTask.accepted} error={drawTask.error} status={drawTask.status} />

      <Dialog footer={<div className={styles.dialogActions}><ActionButton disabled={submitting} onClick={() => setCloseOpen(false)}>取消</ActionButton><ActionButton disabled={submitting || closeReason.trim() === ""} form="close-funding-form" type="submit" variant="primary">{submitting ? "提交中…" : "确认截止"}</ActionButton></div>} onClose={() => setCloseOpen(false)} open={closeOpen} title="截止本期认购" description="服务端将核验期次版本并锁定认购事实。">
        <form className={styles.formGrid} id="close-funding-form" onSubmit={submitClose}><label className={`${styles.field} ${styles.span2}`}><span>操作原因</span><textarea maxLength={500} onChange={(event) => setCloseReason(event.target.value)} required value={closeReason} /></label>{submitError === null ? null : <InlineNotice tone="danger">{submitError}</InlineNotice>}</form>
      </Dialog>

      <Dialog footer={<div className={styles.dialogActions}><ActionButton disabled={submitting} onClick={() => setFetchOpen(false)}>取消</ActionButton><ActionButton disabled={submitting || sourceId.trim() === "" || fetchReason.trim() === ""} form="fetch-draw-form" type="submit" variant="primary">{submitting ? "受理中…" : "发起抓取"}</ActionButton></div>} onClose={() => setFetchOpen(false)} open={fetchOpen} title="从批准来源抓取开奖" description="仅填写后台已批准的数据源 ID；任务受理不代表开奖已确认。">
        <form className={styles.formGrid} id="fetch-draw-form" onSubmit={submitFetch}><label className={`${styles.field} ${styles.span2}`}><span>批准来源 ID</span><input maxLength={128} onChange={(event) => setSourceId(event.target.value)} required value={sourceId} /></label><label className={`${styles.field} ${styles.span2}`}><span>抓取原因</span><textarea maxLength={500} onChange={(event) => setFetchReason(event.target.value)} required value={fetchReason} /></label>{submitError === null ? null : <InlineNotice tone="danger">{submitError}</InlineNotice>}</form>
      </Dialog>

      <CandidateDialog intent={candidateIntent} lotteryName={lottery?.name ?? "当前彩种"} onChange={setCandidateIntent} onClose={() => setCandidateIntent(null)} onSubmit={submitCandidate} pending={submitting} submitError={submitError} />
      <ReviewDialog intent={reviewIntent} onChange={setReviewIntent} onClose={() => setReviewIntent(null)} onSubmit={submitReview} pending={submitting} submitError={submitError} />
    </div>
  );
}

function OverviewTab({ pool }: Readonly<{ pool: AiPoolAdmin }>) {
  return (
    <div className={styles.split}>
      <Panel description="生成后号码不可由浏览器修改；后续计算引用选择哈希与输入版本集。" title="固定号码组合">
        {pool.combinations.length === 0 ? <div className={styles.emptyInline}>服务端未返回固定号码。</div> : <div className={styles.combinationGrid}>{pool.combinations.map((item) => <article className={styles.combination} key={item.id}><div className={styles.combinationHeader}><strong>第 {item.sequenceNo} 组</strong><span className={styles.mono}>{shortHash(item.groupHash)}</span></div><div className={styles.numberLine}>{item.numberCodes.join(" ")}</div><div className={styles.detailLine}><span>20 个号码</span><span>每组最低 {formatAiPoints(item.baseCostPoints)}</span><span>{formatDateTime(item.generatedAt)}</span></div></article>)}</div>}
      </Panel>
      <Panel description="这些字段来自期次快照，不使用项目当前配置回写。" title="版本边界">
        <DefinitionList><Definition label="项目 ID" value={pool.pool.projectId} /><Definition label="配置版本" value={pool.configVersion} /><Definition label="期次版本" value={pool.pool.version} /><Definition label="输入版本集" value={<span className={styles.mono}>{pool.inputVersionSetHash}</span>} /><Definition label="生成时间" value={formatDateTime(pool.pool.generatedAt)} /><Definition label="认购截止" value={formatDateTime(pool.pool.cutoffAt)} /><Definition label="平台初始积分 F0" value={formatAiPoints(pool.pool.initialOfficialPoints)} /><Definition label="默认目标净收益率" value={`${pool.pool.defaultTargetNetReturnPercent}%`} /><Definition label="平台投入上限" value={formatAiPoints(pool.pool.maxOfficialContributionPoints)} /><Definition label="奖励预算上限" value={formatAiPoints(pool.pool.rewardBudgetLimitPoints)} /><Definition label="号码已公示" value={pool.pool.numbersDisclosed ? "是" : "否"} /></DefinitionList>
      </Panel>
    </div>
  );
}

function SubscriptionsTab({ canView, hasMore, items, loadingMore, onLoadMore }: Readonly<{ canView: boolean; hasMore: boolean; items: readonly Subscription[]; loadingMore: boolean; onLoadMore(): void }>) {
  if (!canView) return <PageState kind="forbidden" title="无认购明细权限" description="需要 ai-pool:subscriptions:view 权限。" />;
  return <Panel description="用户身份按服务端授权范围返回；账本交易号是资金事实追踪入口。" flush title="认购与容量">{items.length === 0 ? <div className={styles.emptyInline}>本期暂无认购记录。</div> : <><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>认购 ID</th><th>积分</th><th>额度日期</th><th>状态</th><th>锁定时间</th><th>账本交易</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><span className={styles.mono}>{item.id}</span><small className={styles.cellMeta}>{formatDateTime(item.createdAt)}</small></td><td><strong>{formatAiPoints(item.points)}</strong></td><td>{item.quotaDate}</td><td><StatusBadge status={item.status} /></td><td>{item.lockedAt === null ? "—" : formatDateTime(item.lockedAt)}</td><td><span className={styles.mono}>{item.ledgerTransactionId}</span></td></tr>)}</tbody></table></div>{hasMore ? <div className={styles.summaryBar}><span>已加载 {items.length} 条授权认购记录。</span><ActionButton disabled={loadingMore} onClick={onLoadMore}>{loadingMore ? "加载中…" : "加载更多"}</ActionButton></div> : null}</>}</Panel>;
}

function DrawTab({ canCreate, canFetch, canReview, canView, candidates, employeeId, lotteryCode, onCreate, onFetch, onReview, versions }: Readonly<{ canCreate: boolean; canFetch: boolean; canReview: boolean; canView: boolean; candidates: DrawCandidatePage | null; employeeId: string; lotteryCode: AdminCatalog["lotteries"][number]["code"] | null; onCreate(): void; onFetch(): void; onReview(candidate: DrawCandidate): void; versions: DrawVersionPage | null }>) {
  if (!canView) return <PageState kind="forbidden" title="无开奖复核查看权限" description="需要 draw:review:view 权限。" />;
  return <div className={styles.stack}><Panel actions={<div className={styles.actions}>{canFetch ? <ActionButton onClick={onFetch}>抓取开奖</ActionButton> : null}{canCreate ? <ActionButton onClick={onCreate} variant="primary">人工候选 + 证据</ActionButton> : null}</div>} description="候选、证据与确认版本分离；候选作者不能复核本人提交。" flush title="开奖候选">{candidates === null || candidates.items.length === 0 ? <div className={styles.emptyInline}>暂无开奖候选。</div> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>号码</th><th>来源 / 状态</th><th>证据</th><th>作者</th><th>时间</th><th>操作</th></tr></thead><tbody>{candidates.items.map((candidate) => <tr key={candidate.id}><td>{lotteryCode === null ? candidate.areas.map((area) => `${area.key} ${area.chosen.join(" ")}`).join(" · ") : <NumberBalls areas={candidate.areas} lotteryCode={lotteryCode} />}</td><td><StatusBadge label={candidateStatusLabel(candidate.status)} status={candidate.status} /><small className={styles.cellMeta}>{candidate.source}</small></td><td>{candidate.evidenceIds.map((id) => <span className={styles.cellMeta} key={id}>{id}</span>)}</td><td><span className={styles.mono}>{candidate.authorId}</span></td><td>{formatDateTime(candidate.createdAt)}</td><td>{canReview && candidate.status === "PENDING_REVIEW" && candidate.authorId !== employeeId ? <ActionButton onClick={() => onReview(candidate)} variant="quiet">独立复核</ActionButton> : <span className={styles.cellMeta}>{candidate.authorId === employeeId ? "本人不可复核" : "不可操作"}</span>}</td></tr>)}</tbody></table></div>}</Panel><Panel description="确认或更正版本才可进入后续确定性计算。" flush title="开奖版本">{versions === null || versions.items.length === 0 ? <div className={styles.emptyInline}>暂无确认开奖版本。</div> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>版本</th><th>号码</th><th>状态</th><th>来源</th><th>奖级参考</th><th>确认时间</th></tr></thead><tbody>{versions.items.map((version) => <tr key={version.version}><td><span className={styles.mono}>{version.version}</span></td><td>{lotteryCode === null ? version.areas.map((area) => `${area.key} ${area.chosen.join(" ")}`).join(" · ") : <NumberBalls areas={version.areas} lotteryCode={lotteryCode} />}</td><td><StatusBadge status={version.status} /></td><td>{version.source}</td><td>{version.prizeReferenceStatus}</td><td>{version.confirmedAt === null ? "—" : formatDateTime(version.confirmedAt)}</td></tr>)}</tbody></table></div>}</Panel></div>;
}

function CandidateDialog({ intent, lotteryName, onChange, onClose, onSubmit, pending, submitError }: Readonly<{ intent: CandidateIntent | null; lotteryName: string; onChange(value: CandidateIntent | null): void; onClose(): void; onSubmit(event: FormEvent<HTMLFormElement>): void; pending: boolean; submitError: string | null }>) {
  return <Dialog footer={<div className={styles.dialogActions}><ActionButton disabled={pending} onClick={onClose}>取消</ActionButton><ActionButton disabled={pending} form="manual-draw-form" type="submit" variant="primary">{pending ? "提交中…" : "提交候选"}</ActionButton></div>} onClose={onClose} open={intent !== null} title={`人工开奖候选 · ${lotteryName}`} description="号码只作为待复核候选提交，证据文件先走私有上传链路。" width="wide">{intent === null ? null : <form className={styles.formGrid} id="manual-draw-form" onSubmit={onSubmit}>{Object.entries(intent.areaValues).map(([key, value]) => <label className={styles.field} key={key}><span>{key} 号码</span><input onChange={(event) => onChange({ ...intent, areaValues: { ...intent.areaValues, [key]: event.target.value } })} placeholder="使用空格或逗号分隔" required value={value} /></label>)}<label className={`${styles.field} ${styles.span2}`}><span>来源证据文件</span><input accept=".json,.pdf,.png,.jpg,.jpeg" onChange={(event) => onChange({ ...intent, evidence: null, file: event.target.files?.[0] ?? null })} required={intent.evidence === null} type="file" /><small>上传后由服务端校验哈希并绑定候选。</small></label><label className={styles.field}><span>替代开奖版本（可选）</span><input maxLength={128} onChange={(event) => onChange({ ...intent, replacesDrawVersion: event.target.value })} value={intent.replacesDrawVersion} /></label><label className={styles.field}><span>提交原因</span><input maxLength={500} onChange={(event) => onChange({ ...intent, reason: event.target.value })} required value={intent.reason} /></label>{submitError === null ? null : <div className={styles.span2}><InlineNotice tone="danger">{submitError}</InlineNotice></div>}</form>}</Dialog>;
}

function ReviewDialog({ intent, onChange, onClose, onSubmit, pending, submitError }: Readonly<{ intent: ReviewIntent | null; onChange(value: ReviewIntent | null): void; onClose(): void; onSubmit(event: FormEvent<HTMLFormElement>): void; pending: boolean; submitError: string | null }>) {
  return <Dialog footer={<div className={styles.dialogActions}><ActionButton disabled={pending} onClick={onClose}>取消</ActionButton><ActionButton disabled={pending} form="review-draw-form" type="submit" variant={intent?.decision === "REJECT" ? "danger" : "primary"}>{pending ? "复核中…" : "提交复核"}</ActionButton></div>} onClose={onClose} open={intent !== null} title="开奖候选独立复核" description="强认证令牌与最终幂等键绑定；批准会形成可追溯开奖版本。">{intent === null ? null : <form className={styles.formGrid} id="review-draw-form" onSubmit={onSubmit}><label className={styles.field}><span>复核结论</span><select onChange={(event) => onChange({ ...intent, decision: event.target.value as "APPROVE" | "REJECT" })} value={intent.decision}><option value="APPROVE">批准</option><option value="REJECT">驳回</option></select></label><label className={styles.field}><span>MFA 动态码</span><input autoComplete="one-time-code" inputMode="numeric" maxLength={6} onChange={(event) => onChange({ ...intent, proofCode: event.target.value.replace(/\D/g, "") })} required value={intent.proofCode} /></label><label className={`${styles.field} ${styles.span2}`}><span>复核原因</span><textarea maxLength={500} onChange={(event) => onChange({ ...intent, reason: event.target.value })} required value={intent.reason} /></label>{submitError === null ? null : <div className={styles.span2}><InlineNotice tone="danger">{submitError}</InlineNotice></div>}</form>}</Dialog>;
}

function parseAreas(values: Readonly<Record<string, string>>): readonly DrawArea[] {
  return Object.entries(values).map(([key, raw]) => {
    const tokens = raw.trim().split(/[\s,，]+/).filter(Boolean);
    if (tokens.length === 0) throw new Error(`AREA_EMPTY:${key}`);
    const chosen = tokens.map(Number);
    if (chosen.some((value) => !Number.isInteger(value) || value < 0 || value > 99)) throw new Error(`AREA_INVALID:${key}`);
    if (new Set(chosen).size !== chosen.length) throw new Error(`AREA_DUPLICATE:${key}`);
    return { key, chosen };
  });
}

function candidateError(cause: unknown): string {
  if (cause instanceof Error && cause.message === "请选择开奖来源证据文件。") return cause.message;
  if (cause instanceof Error && cause.message.startsWith("AREA_")) {
    const [kind, key = "号码区域"] = cause.message.split(":");
    if (kind === "AREA_EMPTY") return `${key} 不能为空。`;
    if (kind === "AREA_DUPLICATE") return `${key} 不能包含重复号码。`;
    return `${key} 只能输入 0–99 的整数，并使用空格或逗号分隔。`;
  }
  return apiErrorMessage(cause);
}

function candidateStatusLabel(status: DrawCandidate["status"]): string {
  return { PENDING_REVIEW: "待独立复核", APPROVED: "已批准", REJECTED: "已驳回", CONFLICT: "来源冲突" }[status];
}

function taskAccepted(value: { taskId: string; status: string; statusUrl: string; pollAfterSeconds: number }): TaskAccepted {
  if (value.status !== "PENDING" && value.status !== "RUNNING" && value.status !== "RETRY_WAIT") throw new TypeError("TASK_ACCEPTED_STATUS_MISMATCH");
  return { ...value, status: value.status };
}
