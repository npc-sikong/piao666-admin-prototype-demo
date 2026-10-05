"use client";
import { ChangeNotesButton } from "@/features/change-notes/change-notes";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ActionButton,
  Dialog,
  InlineNotice,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/admin-workspace/admin-workspace";
import { PageState } from "@/components/page-state/page-state";
import { useAdminSession } from "@/session/admin-session";
import {
  calculateAllocation,
  confirmAllocation,
  errorView,
  getAllocation,
  getPool,
  listAllocations,
  newIntent,
  publishDisclosure,
} from "./ai-management-api";
import type {
  AiPoolAdmin,
  Allocation,
  DisclosureReceipt,
} from "./ai-management-models";
import {
  Breadcrumbs,
  Definition,
  DefinitionList,
  ErrorState,
  PoolStatusBadge,
  TaskReceipt,
  formatAiPoints,
  formatRate,
  shortHash,
} from "./ai-management-ui";
import { AiAllocationPreviewDialog } from "./ai-allocation-preview-dialog";
import { useAiTask } from "./use-ai-task";
import styles from "./ai-management.module.css";

interface ReviewIntent {
  reason: string;
  idempotencyKey: string;
}

export function AiAllocationPage({ poolIssueId }: Readonly<{ poolIssueId: string }>) {
  const session = useAdminSession();
  const permissions = session.identity?.permissions ?? [];
  const canView = permissions.includes("ai-pool:view");
  const canCalculate = permissions.includes("ai-pool:calculate");
  const canPublish = permissions.includes("ai-disclosure:publish");
  const [pool, setPool] = useState<AiPoolAdmin | null>(null);
  const [allocations, setAllocations] = useState<readonly Allocation[]>([]);
  const [selected, setSelected] = useState<Allocation | null>(null);
  const [selectedEtag, setSelectedEtag] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const [error, setError] = useState<ReturnType<typeof errorView> | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [calculateOpen, setCalculateOpen] = useState(false);
  const [calculateReason, setCalculateReason] = useState("");
  const [calculateTarget, setCalculateTarget] = useState(5);
  const [calculateIntent, setCalculateIntent] = useState<string | null>(null);
  const [reviewIntent, setReviewIntent] = useState<ReviewIntent | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishReason, setPublishReason] = useState("");
  const [publishIntent, setPublishIntent] = useState<string | null>(null);
  const [disclosure, setDisclosure] = useState<DisclosureReceipt | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const task = useAiTask();

  const load = useCallback(async () => {
    if (!canView) {
      setStatus("forbidden");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const [poolResult, page] = await Promise.all([getPool(poolIssueId), listAllocations(poolIssueId)]);
      const summary = page.items[0] ?? null;
      const detail = summary === null ? null : await getAllocation(summary.id);
      setPool(poolResult.value);
      setAllocations(page.items);
      setSelected(detail?.value ?? null);
      setSelectedEtag(detail?.etag ?? null);
      setStatus("ready");
    } catch (cause) {
      const view = errorView(cause);
      setError(view);
      setStatus(view.kind === "forbidden" ? "forbidden" : "error");
    }
  }, [canView, poolIssueId]);

  useEffect(() => {
    if (session.status === "authenticated") void load();
  }, [load, session.status]);

  useEffect(() => {
    if (task.status?.status === "SUCCEEDED") void load();
  }, [load, task.status?.status]);

  async function chooseAllocation(allocationId: string) {
    setError(null);
    try {
      const detail = await getAllocation(allocationId);
      setSelected(detail.value);
      setSelectedEtag(detail.etag);
    } catch (cause) {
      setError(errorView(cause));
    }
  }

  async function submitCalculation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pool === null) return;
    const intent = calculateIntent ?? newIntent("calculateAllocation");
    setCalculateIntent(intent);
    setSubmitting(true);
    setSubmitError(null);
    try {
      const accepted = await calculateAllocation({
        pool,
        targetNetReturnPercent: calculateTarget,
        reason: calculateReason.trim(),
        idempotencyKey: intent,
      });
      task.start(accepted);
      setCalculateOpen(false);
      setCalculateIntent(null);
      setFeedback("收益率预览任务已受理；任务成功后会生成不可变的50组只读额度。");
    } catch (cause) {
      setSubmitError(errorView(cause).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected === null || selectedEtag === null || reviewIntent === null) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await confirmAllocation({
        allocationId: selected.id,
        reason: reviewIntent.reason.trim(),
        etag: selectedEtag,
        idempotencyKey: reviewIntent.idempotencyKey,
      });
      setFeedback(`最新预览版本 ${result.version} 已确认，额度和收益率已锁定。`);
      setReviewIntent(null);
      await load();
    } catch (cause) {
      setSubmitError(errorView(cause).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitPublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected === null) return;
    const intent = publishIntent ?? newIntent("publishAiDisclosure");
    setPublishIntent(intent);
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await publishDisclosure({
        poolIssueId,
        allocation: selected,
        reason: publishReason.trim(),
        idempotencyKey: intent,
      });
      setDisclosure(result);
      setFeedback(`号码与分配公示 ${result.version} 已由服务端发布。`);
      setPublishOpen(false);
      setPublishIntent(null);
      await load();
    } catch (cause) {
      setSubmitError(errorView(cause).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (session.status === "loading") return <PageState kind="loading" title="正在读取员工会话" description="确认分配权限与数据范围。" />;
  if (session.status === "anonymous") return <PageState kind="forbidden" title="员工会话已失效" description="请重新登录运营后台。" />;
  if (session.status === "error") return <PageState kind="error" title="员工会话不可用" description={`会话校验失败（${session.errorCode ?? "SESSION_UNAVAILABLE"}）。`} />;
  if (status === "loading") return <PageState kind="loading" title="正在读取分配版本" description="同步计算任务、确认状态与公示条件。" />;
  if (status === "forbidden") return <PageState kind="forbidden" title="无分配查看权限" description="需要 ai-pool:view 权限与匹配的数据范围。" />;
  if (status === "error" || pool === null || error !== null) return <ErrorState error={error ?? errorView(new Error("AI_ALLOCATION_UNAVAILABLE"))} onRetry={() => void load()} />;

  const canCalculateNow = canCalculate && pool.allowedActions.includes("CALCULATE_ALLOCATION");
  const isLatestAllocation = selected !== null && selected.id === allocations[0]?.id;
  const canConfirmNow = canCalculate && isLatestAllocation && pool.allowedActions.includes("CONFIRM_ALLOCATION") && selected?.confirmationStatus === "PENDING_CONFIRMATION" && selectedEtag !== null;
  const canPublishNow = canPublish && isLatestAllocation && pool.allowedActions.includes("PUBLISH_DISCLOSURE") && selected?.confirmationStatus === "CONFIRMED";

  return (
    <div className={styles.stack}>
      <Breadcrumbs current="分配与公示" poolIssueId={poolIssueId} />
      <PageHeader
        actions={<div className={styles.pageActions}><ChangeNotesButton module="aiManagement" /><Link className={styles.linkButton} href={`/ai-pools/${encodeURIComponent(poolIssueId)}/payout`}>前往发放</Link>{canCalculateNow && selected === null ? <ActionButton onClick={() => { setCalculateTarget(pool.pool.defaultTargetNetReturnPercent); setCalculateReason(""); setCalculateIntent(newIntent("calculateAllocation")); setSubmitError(null); setCalculateOpen(true); }} variant="primary">生成默认预览</ActionButton> : null}</div>}
        description="开奖后选择0%—100%的整数目标收益率，服务端在固定总池内自动生成50组额度。"
        meta={<div className={styles.inlineActions}><PoolStatusBadge status={pool.pool.status} /><span>期次 {pool.pool.issueCode}</span><span>输入集 {shortHash(pool.inputVersionSetHash)}</span></div>}
        pageId="A15"
        title="配额分配与结果公示(修改)"
      />
      {feedback === null ? null : <InlineNotice tone="success" title="服务端回执">{feedback}</InlineNotice>}
      <TaskReceipt accepted={task.accepted} error={task.error} status={task.status} />
      {selected === null ? <InlineNotice tone="warning" title="尚无收益率预览">开奖确认后系统会先按默认 {pool.pool.defaultTargetNetReturnPercent}% 建立预览；任务受理不代表额度已确认。</InlineNotice> : <AllocationOutcome allocation={selected} />}

      <div className={styles.split}>
        <Panel description="保留所有版本用于重放和更正；选择版本后读取独立 ETag。" flush title="分配版本">
          {allocations.length === 0 ? <div className={styles.emptyInline}>暂无计算版本。</div> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>版本</th><th>目标</th><th>实际</th><th>容差</th><th>状态</th><th>操作</th></tr></thead><tbody>{allocations.map((item) => <tr key={item.id}><td><strong>{item.version}</strong><small className={styles.cellMeta}>{shortHash(item.inputVersionSetHash)}</small></td><td>{item.requestedTargetNetReturnPercent}%</td><td>{formatPercent(item.actualNetReturnRate)}</td><td><StatusBadge label={item.ruleSetCode === "FC3D_50X20_POST_DRAW_V3" ? "目标分配" : item.withinTolerance ? "±3内" : "超出±3"} status={item.withinTolerance ? "APPROVED" : "FAILED"} /></td><td><StatusBadge label={item.status === "SUPERSEDED" ? "已替代 · 历史" : allocationConfirmationLabel(item.confirmationStatus)} status={item.confirmationStatus} /></td><td><ActionButton onClick={() => void chooseAllocation(item.id)} variant="quiet">{selected?.id === item.id ? "当前查看" : "查看"}</ActionButton></td></tr>)}</tbody></table></div>}
        </Panel>
        <Panel actions={<div className={styles.actions}>{canConfirmNow ? <ActionButton onClick={() => { setSubmitError(null); setReviewIntent({ reason: "", idempotencyKey: newIntent("confirmAllocation") }); }} variant="primary">确认本期额度</ActionButton> : null}{canPublishNow ? <ActionButton onClick={() => { setPublishReason(""); setPublishIntent(newIntent("publishAiDisclosure")); setSubmitError(null); setPublishOpen(true); }} variant="primary">发布结算公示</ActionButton> : null}</div>} description="只有最新有效预览可确认；单个管理员即可操作，不需要独立复核。" title="收益率与版本事实">
          {selected === null ? <div className={styles.emptyInline}>选择预览版本后显示。</div> : <DefinitionList><Definition label="版本" value={selected.version} /><Definition label="确认状态" value={<StatusBadge label={allocationConfirmationLabel(selected.confirmationStatus)} status={selected.confirmationStatus} />} /><Definition label="管理员目标" value={`${selected.requestedTargetNetReturnPercent}%`} /><Definition label="最终实际收益率" value={formatPercent(selected.actualNetReturnRate)} /><Definition label="目标差值" value={`${selected.differencePercentagePoints ?? "—"} 个百分点`} />{selected.ruleSetCode === "FC3D_50X20_POST_DRAW_V3" ? <Definition label="平台目标尾差" value={formatAiPoints(selected.targetRoundingAdjustmentPoints)} /> : <Definition label="±3个百分点" value={selected.withinTolerance ? "容差内" : "超出容差"} />}<Definition label="奖励需求" value={formatAiPoints(selected.rewardRequiredPoints)} /><Definition label="本期固定总池" value={formatAiPoints(selected.totalPurchasePoints)} /><Definition label="输入版本集" value={<span className={styles.mono}>{selected.inputVersionSetHash}</span>} /></DefinitionList>}
        </Panel>
      </div>

      {selected === null ? null : (
        <Panel description="F0/U/I/C/T_raw/E_align/T/F 均来自锁期资金快照；输入指纹用于重放本次预览。" title="资金拆分与输入指纹">
          <DefinitionList>
            <Definition label="命中号码 / 组" value={`${selected.winningNumberCode} / 第 ${selected.winningGroupSequenceNo} 组`} />
            <Definition label="F0 平台初始积分" value={formatAiPoints(selected.initialOfficialPoints)} />
            <Definition label="U 用户认购" value={formatAiPoints(selected.userPurchasePoints)} />
            <Definition label="I 用户增量总量" value={formatAiPoints(selected.incrementTotalPoints)} />
            <Definition label="C 平台增量基数" value={formatAiPoints(selected.platformIncrementBasePoints)} />
            <Definition label="T_raw 对齐前总池" value={formatAiPoints(selected.rawTotalPoints)} />
            <Definition label="E_align 锁期补齐" value={formatAiPoints(selected.alignmentPoints)} />
            <Definition label="T 固定总池" value={formatAiPoints(selected.totalPurchasePoints)} />
            <Definition label="F 平台总投入" value={formatAiPoints(selected.officialContributionPoints)} />
            <Definition label="平台投入检查" value={`${selected.officialContributionWithinLimit ? "通过" : "超限"} / 上限 ${formatAiPoints(selected.maxOfficialContributionPoints)}`} />
            <Definition label="奖励预算检查" value={`${selected.rewardBudgetWithinLimit ? "通过" : "超限"} / 上限 ${formatAiPoints(selected.rewardBudgetLimitPoints)}`} />
            <Definition label="分组输入哈希" value={<span className={styles.mono}>{selected.groupingInputHash}</span>} />
            <Definition label="认购输入哈希" value={<span className={styles.mono}>{selected.subscriptionInputHash}</span>} />
            <Definition label="开奖输入哈希" value={<span className={styles.mono}>{selected.drawInputHash}</span>} />
            <Definition label="规则输入哈希" value={<span className={styles.mono}>{selected.ruleInputHash}</span>} />
            <Definition label="预览输入哈希" value={<span className={styles.mono}>{selected.previewInputHash}</span>} />
          </DefinitionList>
        </Panel>
      )}

      <Panel actions={canCalculate && isLatestAllocation && selected !== null && selectedEtag !== null
        && selected.status === "SOLVED" && ["ALLOCATION_PENDING", "CORRECTING", "EXCEPTION_PENDING"].includes(pool.pool.status)
        && pool.allowedActions.includes("RECALCULATE_ALLOCATION")
        ? <AiAllocationPreviewDialog key={selected.id} allocation={selected} etag={selectedEtag}
          onSaved={async (result) => { setFeedback(`目标 ${result.requestedTargetNetReturnPercent}% 的新预览已生成。`); await load(); }} /> : undefined}
        description="每组最低40积分，50组总额等于固定总池；V3直接按目标分配额度，小数倍数为派生展示值。" flush title="50组只读额度明细">
        {selected === null || selected.items.length === 0 ? <div className={styles.emptyInline}>当前版本没有可展示的分配明细。</div> : <div className={styles.tableWrap}><table className={styles.table} data-wide="true"><thead><tr><th>组序</th><th>组合 ID</th><th>分配积分</th><th>倍数</th><th>分配比例</th><th>奖级</th><th>中奖积分</th></tr></thead><tbody>{selected.items.map((item) => <tr key={item.combinationId}><td><strong>{item.sequenceNo}</strong></td><td><span className={styles.mono}>{item.combinationId}</span></td><td>{formatAiPoints(item.allocatedPoints)}</td><td>{item.multiplier}</td><td>{formatRate(item.allocationRatio)}</td><td>{item.awardCodes.length === 0 ? "—" : item.awardCodes.join(" / ")}</td><td><strong>{formatAiPoints(item.winningPoints)}</strong></td></tr>)}</tbody><tfoot><tr><td colSpan={2}>服务端汇总</td><td>购买 {formatAiPoints(selected.totalPurchasePoints)}</td><td colSpan={3}>平台返还 {formatAiPoints(selected.platformWinningPoints)}</td><td>总返还 {formatAiPoints(selected.totalWinningPoints)}</td></tr></tfoot></table></div>}
      </Panel>
      {disclosure === null ? null : <Panel description="以下为本次发布返回的权威回执。" title="公示回执"><DefinitionList><Definition label="公示 ID" value={disclosure.id} /><Definition label="公示版本" value={disclosure.version} /><Definition label="状态" value={disclosure.status} /><Definition label="标签" value={disclosure.label} /></DefinitionList></Panel>}

      <Dialog footer={<div className={styles.dialogActions}><ActionButton disabled={submitting} onClick={() => setCalculateOpen(false)}>取消</ActionButton><ActionButton disabled={submitting || calculateReason.trim() === ""} form="calculate-allocation-form" type="submit" variant="primary">{submitting ? "受理中…" : "生成预览"}</ActionButton></div>} onClose={() => setCalculateOpen(false)} open={calculateOpen} title="生成默认收益率预览" description={`固定输入版本集 ${shortHash(pool.inputVersionSetHash)}；202 只表示任务受理。`}><form className={styles.formGrid} id="calculate-allocation-form" onSubmit={submitCalculation}><label className={styles.field}><span>目标净收益率（整数%）</span><input min={0} max={100} step={1} type="number" value={calculateTarget} onChange={(event) => setCalculateTarget(Number(event.target.value))} /></label><label className={`${styles.field} ${styles.span2}`}><span>计算原因</span><textarea maxLength={500} onChange={(event) => setCalculateReason(event.target.value)} required value={calculateReason} /></label>{submitError === null ? null : <div className={styles.span2}><InlineNotice tone="danger">{submitError}</InlineNotice></div>}</form></Dialog>
      <Dialog footer={<div className={styles.dialogActions}><ActionButton disabled={submitting} onClick={() => setReviewIntent(null)}>取消</ActionButton><ActionButton disabled={submitting || reviewIntent?.reason.trim().length === 0} form="review-allocation-form" type="submit" variant="primary">{submitting ? "确认中…" : "确认并锁定"}</ActionButton></div>} onClose={() => setReviewIntent(null)} open={reviewIntent !== null} title="确认最新收益率预览" description="确认后目标、实际收益率及50组额度不可再通过普通预览修改。">{reviewIntent === null ? null : <form className={styles.formGrid} id="review-allocation-form" onSubmit={submitReview}><label className={styles.field}><span>版本</span><input disabled value={selected?.version ?? ""} /></label><label className={`${styles.field} ${styles.span2}`}><span>确认原因</span><textarea maxLength={500} onChange={(event) => setReviewIntent({ ...reviewIntent, reason: event.target.value })} required value={reviewIntent.reason} /></label>{submitError === null ? null : <div className={styles.span2}><InlineNotice tone="danger">{submitError}</InlineNotice></div>}</form>}</Dialog>
      <Dialog footer={<div className={styles.dialogActions}><ActionButton disabled={submitting} onClick={() => setPublishOpen(false)}>取消</ActionButton><ActionButton disabled={submitting || publishReason.trim() === ""} form="publish-disclosure-form" type="submit" variant="primary">{submitting ? "发布中…" : "确认发布"}</ActionButton></div>} onClose={() => setPublishOpen(false)} open={publishOpen} title="发布号码与分配公示" description="发布后会员端将读取服务端公示版本；此操作不执行积分发放。"><form className={styles.formGrid} id="publish-disclosure-form" onSubmit={submitPublish}><label className={`${styles.field} ${styles.span2}`}><span>发布原因</span><textarea maxLength={500} onChange={(event) => setPublishReason(event.target.value)} required value={publishReason} /></label>{submitError === null ? null : <div className={styles.span2}><InlineNotice tone="danger">{submitError}</InlineNotice></div>}</form></Dialog>
    </div>
  );
}

function AllocationOutcome({ allocation }: Readonly<{ allocation: Allocation }>) {
  const messages: Readonly<Record<Allocation["status"], { tone: "success" | "warning" | "danger" | "info"; title: string; body: string }>> = {
    SOLVED: allocation.withinTolerance
      ? { tone: "success", title: "已生成合法预览", body: "实际收益率位于目标正负3个百分点内；确认前仍可选择其他整数目标重新计算。" }
      : { tone: "warning", title: "已取最近合法方案", body: "当前不存在容差内方案，系统已按最近优先、同距取低生成预览。" },
    UNSATISFIABLE: { tone: "warning", title: "当前约束无解", body: "当前总池或奖励预算没有可执行候选；可补充奖励预算后重新计算。" },
    TIMEOUT: { tone: "warning", title: "计算超时", body: "任务未在计算边界内完成，尚未形成可确认额度。" },
    INVALID_INPUT: { tone: "danger", title: "输入无效", body: "开奖、规则、政策或资金输入不一致。请修复权威输入后生成新版本，不能手工修改本版本。" },
    SUPERSEDED: { tone: "info", title: "版本已替代", body: "该版本仅用于审计与重放，不可再确认、公示或发放。" },
  };
  const value = messages[allocation.status];
  return <InlineNotice tone={value.tone} title={value.title}>{value.body}</InlineNotice>;
}

function allocationConfirmationLabel(status: Allocation["confirmationStatus"]): string {
  return { NOT_CONFIRMABLE: "不可确认", PENDING_CONFIRMATION: "待确认", CONFIRMED: "已确认" }[status];
}

function formatPercent(rate: string | null): string {
  if (rate === null) return "—";
  const value = Number(rate);
  return Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "—";
}
