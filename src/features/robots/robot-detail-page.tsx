"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ActionButton,
  Dialog,
  InlineNotice,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/admin-workspace/admin-workspace";
import { PageState } from "@/components/page-state/page-state";
import { TaskStatus } from "@/components/task-status/task-status";
import { getAdminCatalog } from "@/features/operations/operations-api";
import type { AdminCatalog } from "@/features/operations/operations-models";
import { useAdminSession } from "@/session/admin-session";
import { RobotEditor } from "./robot-editor";
import type {
  CursorPage,
  Recommendation,
  RobotAdmin,
  StrategyDefinition,
} from "./robot-models";
import {
  getAdminRobot,
  generateRobot,
  isRobotForbidden,
  isRobotVersionExpired,
  listAdminRecommendations,
  listRobotStrategies,
  newRobotIntentKey,
  previewRobot,
  robotErrorMessage,
  updateRobot,
  type RobotWriteInput,
} from "./robots-api";
import {
  executionIdFromResultUrl,
  executionResultCopy,
  formatBasisPoints,
  formatDateTime,
  formatRate,
  formatScore,
  generationModeLabel,
  lotteryNames,
  RecommendationCard,
  RobotIdentity,
  StrategySummary,
} from "./robot-ui";
import { useRobotTask } from "./use-robot-task";
import styles from "./robots-pages.module.css";

interface Snapshot {
  catalog: AdminCatalog;
  robot: RobotAdmin;
  strategies: readonly StrategyDefinition[];
}

interface GenerateDraft {
  lotteryId: string;
  issueCode: string;
  reason: string;
  key: string;
}

export function RobotDetailPage({ robotId }: Readonly<{ robotId: string }>) {
  const session = useAdminSession();
  const permissions = session.identity?.permissions ?? [];
  const canView = permissions.includes("robot:view");
  const canUpdate = permissions.includes("robot:update");
  const canGenerate = permissions.includes("robot:generate");
  const canViewTask = permissions.includes("task:view");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editorKey, setEditorKey] = useState("");
  const [updateKey, setUpdateKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [versionExpired, setVersionExpired] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [previewDraft, setPreviewDraft] = useState<GenerateDraft | null>(null);
  const [previewResult, setPreviewResult] = useState<CursorPage<Recommendation> | null>(null);
  const [previewResultError, setPreviewResultError] = useState<string | null>(null);
  const [loadedExecutionId, setLoadedExecutionId] = useState<string | null>(null);
  const [taskKind, setTaskKind] = useState<"PREVIEW" | "PUBLISH" | null>(null);
  const task = useRobotTask(canViewTask);

  const load = useCallback(async () => {
    if (!canView) {
      setStatus("forbidden");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const [catalog, robot, strategies] = await Promise.all([
        getAdminCatalog(),
        getAdminRobot(robotId),
        listRobotStrategies(),
      ]);
      setSnapshot({ catalog, robot, strategies: strategies.items });
      setStatus("ready");
    } catch (cause) {
      setError(robotErrorMessage(cause));
      setStatus(isRobotForbidden(cause) ? "forbidden" : "error");
    }
  }, [canView, robotId]);

  useEffect(() => {
    if (session.status === "authenticated") void load();
  }, [load, session.status]);

  useEffect(() => {
    const executionId = executionIdFromResultUrl(task.status?.resultUrl ?? null);
    if (task.status?.status !== "SUCCEEDED" || executionId === null || executionId === loadedExecutionId) return;
    setLoadedExecutionId(executionId);
    setPreviewResultError(null);
    void listAdminRecommendations(robotId, { executionId }).then(setPreviewResult).catch((cause: unknown) => {
      setPreviewResultError(robotErrorMessage(cause));
    });
  }, [loadedExecutionId, robotId, task.status]);

  async function submitUpdate(input: RobotWriteInput) {
    if (snapshot === null) return;
    setSubmitting(true);
    setActionError(null);
    setVersionExpired(false);
    try {
      const updated = await updateRobot(snapshot.robot, input, updateKey);
      setSnapshot((value) => value === null ? null : ({ ...value, robot: updated }));
      setEditing(false);
      setFeedback(`策略 v${updated.strategyVersion} 已由服务端保存；已发布推荐版本未被改写。`);
      await load();
    } catch (cause) {
      setVersionExpired(isRobotVersionExpired(cause));
      setActionError(robotErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitGeneration() {
    if (snapshot === null || previewDraft === null) return;
    if (previewDraft.lotteryId === "" || previewDraft.issueCode.trim() === "" || previewDraft.reason.trim().length < 2) {
      setActionError(`请选择允许彩种，并填写已登记期号和至少 2 个字符的${taskKind === "PUBLISH" ? "生成" : "预览"}原因。`);
      return;
    }
    setSubmitting(true);
    setActionError(null);
    setPreviewResult(null);
    setPreviewResultError(null);
    setLoadedExecutionId(null);
    try {
      const request = {
        robotId: snapshot.robot.robot.id,
        lotteryId: previewDraft.lotteryId,
        issueCode: previewDraft.issueCode.trim(),
        reason: previewDraft.reason.trim(),
        idempotencyKey: previewDraft.key,
      };
      const accepted = taskKind === "PUBLISH"
        ? await generateRobot(request)
        : await previewRobot(request);
      task.start(accepted);
      setPreviewDraft(null);
    } catch (cause) {
      setActionError(robotErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  function openEditor() {
    setActionError(null);
    setVersionExpired(false);
    setUpdateKey(newRobotIntentKey("updateRobot"));
    setEditorKey(crypto.randomUUID());
    setEditing(true);
  }

  function openGeneration(kind: "PREVIEW" | "PUBLISH") {
    if (snapshot === null) return;
    setActionError(null);
    setTaskKind(kind);
    const firstLotteryId = kind === "PUBLISH"
      ? snapshot.robot.robot.lotteryIds.find((id) => (
        snapshot.catalog.lotteries.find((lottery) => lottery.id === id)?.plays.some((play) => play.readiness === "READY")
      ))
      : snapshot.robot.robot.lotteryIds[0];
    setPreviewDraft({
      lotteryId: firstLotteryId ?? "",
      issueCode: "",
      reason: "",
      key: newRobotIntentKey(kind === "PUBLISH" ? "generateRobot" : "previewRobot"),
    });
  }

  const hasReadyAllowedLottery = snapshot?.robot.robot.lotteryIds.some((id) => (
    snapshot.catalog.lotteries.find((lottery) => lottery.id === id)?.plays.some((play) => play.readiness === "READY")
  )) ?? false;
  const formalBlocked = snapshot?.catalog.approvalStatus !== "APPROVED" || !hasReadyAllowedLottery;

  return (
    <>
      <PageHeader
        actions={(
          <>
            <Link className={styles.secondaryLink} href="/masters">返回大师列表</Link>
            <Link className={styles.secondaryLink} href={`/masters/${encodeURIComponent(robotId)}/executions`}>执行与推荐版本</Link>
            <ActionButton disabled={!canUpdate || snapshot === null} onClick={openEditor} variant="primary">编辑策略</ActionButton>
          </>
        )}
        description="查看类型化策略版本、允许彩种和执行边界；保存只创建新策略版本，不修改历史推荐。"
        pageId="A07"
        title="大师策略设置"
      />

      {status === "loading" ? <PageState kind="loading" title="正在读取大师策略" /> : null}
      {status === "forbidden" ? <PageState description="当前员工没有 robot:view 权限。" kind="forbidden" /> : null}
      {status === "error" ? <PageState action={<ActionButton onClick={() => void load()}>重试</ActionButton>} description={error ?? "大师详情读取失败。"} kind="error" /> : null}

      {status === "ready" && snapshot !== null ? (
        <>
          {snapshot.catalog.approvalStatus === "D01_PENDING" ? (
            <InlineNotice title="D01 玩法目录尚未确认" tone="warning">
              策略预览仍会由服务端按当前可信快照执行；正式推荐发布保持关闭，不能使用原型演示玩法替代。
            </InlineNotice>
          ) : null}
          <InlineNotice title="D02 与推荐生成分离">
            预览只生成号码、评分和解释，不进入正式战绩；模拟积分返奖规则未就绪时，下游积分参与仍应明确禁用。
          </InlineNotice>
          {feedback === null ? null : <InlineNotice title="服务端已确认" tone="success">{feedback}</InlineNotice>}

          <Panel
            actions={(
              <>
                <ActionButton disabled={!canGenerate || snapshot.robot.status !== "ENABLED"} onClick={() => openGeneration("PREVIEW")}>创建策略预览</ActionButton>
                <ActionButton
                  disabled={!canGenerate || snapshot.robot.status !== "ENABLED" || formalBlocked}
                  onClick={() => openGeneration("PUBLISH")}
                  variant="primary"
                >生成正式版本</ActionButton>
              </>
            )}
            description={`${generationModeLabel(snapshot.robot.generationMode, snapshot.robot.generationTime)} · 最近执行 ${formatDateTime(snapshot.robot.latestExecutionAt)}`}
            title="当前机器人"
          >
            <div className={styles.detailHero}>
              <RobotIdentity robot={snapshot.robot} />
              <div className={styles.heroFacts}>
                <div><span>状态</span><StatusBadge label={snapshot.robot.status === "ENABLED" ? "启用" : "停用"} status={snapshot.robot.status === "ENABLED" ? "READY" : "DISABLED"} /></div>
                <div><span>推荐评分</span><strong>{formatScore(snapshot.robot.robot.recommendationScore)}</strong></div>
                <div><span>真实历史命中</span><strong>{formatRate(snapshot.robot.robot.performance.hitRate)}</strong><small>{snapshot.robot.robot.performance.hitGroups}/{snapshot.robot.robot.performance.settledGroups} 组</small></div>
                <div><span>当前组合</span><strong>{snapshot.robot.robot.currentGroups} 组</strong><small>{snapshot.robot.currentBetCount} 注 · {snapshot.robot.currentPricePoints} 积分</small></div>
              </div>
            </div>
          </Panel>

          {snapshot.catalog.approvalStatus === "APPROVED" && !hasReadyAllowedLottery ? (
            <PageState
              description="当前允许彩种没有任何规则就绪玩法；可以维护策略，但正式推荐生成保持禁用。"
              kind="not-ready"
              title="允许范围内的玩法规则未就绪"
            />
          ) : null}

          <div className={styles.twoColumn}>
            <Panel description={snapshot.robot.robot.strategyDescription} title={snapshot.robot.robot.strategyLabel}>
              <StrategySummary strategy={snapshot.robot.strategy} />
              <div className={styles.weightList}>
                {snapshot.robot.strategy.common.weights.map((weight) => (
                  <div key={weight.feature}><span>{weight.feature}</span><strong>{formatBasisPoints(weight.basisPoints)}</strong></div>
                ))}
              </div>
            </Panel>
            <Panel description="机器人只会从这些彩种中选择；具体玩法仍须满足目录、规则和历史数据准入。" title="允许彩种与规则状态">
              <div className={styles.lotteryReadinessList}>
                {snapshot.robot.robot.lotteryIds.map((lotteryId) => {
                  const lottery = snapshot.catalog.lotteries.find((item) => item.id === lotteryId) ?? null;
                  const ready = lottery?.plays.filter((play) => play.readiness === "READY").length ?? 0;
                  return (
                    <div key={lotteryId}>
                      <span><strong>{lottery?.name ?? "未知彩种"}</strong><small>{lotteryId}</small></span>
                      <span>{lottery === null ? "目录不可匹配" : `${ready}/${lottery.plays.length} 个玩法规则就绪`}</span>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>

          {task.accepted === null ? null : (
            <Panel
              actions={<button className={styles.textButton} onClick={task.clear} type="button">收起</button>}
              description={`任务号 ${task.accepted.taskId}`}
              title={taskKind === "PUBLISH" ? "正式推荐生成任务" : "策略预览任务"}
            >
              <InlineNotice title="202 仅代表已受理" tone="warning">
                {taskKind === "PUBLISH" ? "正式生成任务已持久化，但只有任务完成且结果为 PUBLISHED，才表示推荐版本已发布。" : "预览任务已持久化，不代表已生成推荐，更不代表正式发布。"}
              </InlineNotice>
              <TaskStatus
                failureCode={task.status?.failureCode}
                progress={task.status?.progress ?? 0}
                resultCode={task.status?.resultCode}
                status={task.status?.status ?? task.accepted.status}
              />
              {task.status === null ? null : <p className={styles.taskSummary}>{executionResultCopy(task.status)}</p>}
              {!canViewTask ? <p className={styles.feedback}>当前员工缺少 task:view；任务已受理，但本页不能读取其后续进度。</p> : null}
              {task.error === null ? null : <p className={styles.feedback} role="alert">{task.error}</p>}
            </Panel>
          )}

          {previewResultError === null ? null : <PageState description={previewResultError} kind="error" title="预览结果读取失败" />}
          {task.status?.status === "SUCCEEDED" && previewResult !== null && previewResult.items.length === 0 ? (
            <PageState description={executionResultCopy(task.status)} kind="empty" title="执行完成，0 个推荐" />
          ) : null}
          {previewResult !== null && previewResult.items.length > 0 ? (
            <Panel
              description={taskKind === "PUBLISH" ? "这些组合来自已完成的正式生成任务；是否可参与仍由期次、D02 返奖规则和下游报价共同裁决。" : "这些组合来自隔离预览执行，不会发布、不进入历史战绩，也不能被会员参与。"}
              title={taskKind === "PUBLISH" ? "正式推荐版本" : "未发布预览结果"}
            >
              <div className={styles.recommendationList}>
                {previewResult.items.map((recommendation) => <RecommendationCard catalog={snapshot.catalog} key={recommendation.id} recommendation={recommendation} />)}
              </div>
            </Panel>
          ) : null}
        </>
      ) : null}

      <Dialog onClose={() => !submitting && setEditing(false)} open={editing} title="编辑大师策略" width="wide">
        {!editing || snapshot === null ? null : (
          <RobotEditor
            busy={submitting}
            catalog={snapshot.catalog}
            definitions={snapshot.strategies}
            error={actionError}
            key={editorKey}
            onCancel={() => setEditing(false)}
            onReload={() => { setEditing(false); void load(); }}
            onSubmit={submitUpdate}
            robot={snapshot.robot}
            submitLabel="保存新策略版本"
            versionExpired={versionExpired}
          />
        )}
      </Dialog>

      <Dialog
        footer={(
          <>
            <ActionButton disabled={submitting} onClick={() => setPreviewDraft(null)}>取消</ActionButton>
            <ActionButton
              disabled={submitting || !canGenerate || (taskKind === "PUBLISH" && formalBlocked)}
              onClick={() => void submitGeneration()}
              variant="primary"
            >{submitting ? "提交中" : taskKind === "PUBLISH" ? "提交正式生成任务" : "提交预览任务"}</ActionButton>
          </>
        )}
        onClose={() => !submitting && setPreviewDraft(null)}
        open={previewDraft !== null}
        title={taskKind === "PUBLISH" ? "生成正式推荐版本" : "模拟生成策略预览"}
      >
        {previewDraft === null || snapshot === null ? null : (
          <div className={styles.dialogStack}>
            <InlineNotice title={taskKind === "PUBLISH" ? "正式生成仍是异步任务" : "预览不等于发布"}>
              {taskKind === "PUBLISH" ? "提交成功仅表示任务已受理；任务完成后才会生成 PUBLISHED 版本，并按版本替代规则停止旧版本的新参与。" : "任务成功后结果固定标记为 PREVIEW；不会替代正式版本、不会进入真实战绩。"}
            </InlineNotice>
            <label className={styles.field}><span>允许彩种</span><select onChange={(event) => setPreviewDraft((value) => value === null ? null : ({ ...value, lotteryId: event.target.value }))} value={previewDraft.lotteryId}>{snapshot.robot.robot.lotteryIds.map((id, index) => {
              const lottery = snapshot.catalog.lotteries.find((item) => item.id === id);
              const ready = lottery?.plays.some((play) => play.readiness === "READY") ?? false;
              return <option disabled={taskKind === "PUBLISH" && !ready} key={id} value={id}>{lotteryNames(snapshot.catalog, [id])[0] ?? `彩种 ${index + 1}`}{taskKind === "PUBLISH" && !ready ? "（规则未就绪）" : ""}</option>;
            })}</select></label>
            <label className={styles.field}><span>已登记目标期号</span><input maxLength={32} onChange={(event) => setPreviewDraft((value) => value === null ? null : ({ ...value, issueCode: event.target.value }))} placeholder="服务端将校验期次与截止状态" value={previewDraft.issueCode} /></label>
            <label className={styles.field}><span>{taskKind === "PUBLISH" ? "生成原因" : "预览原因"}</span><textarea maxLength={500} onChange={(event) => setPreviewDraft((value) => value === null ? null : ({ ...value, reason: event.target.value }))} value={previewDraft.reason} /></label>
            {actionError === null ? null : <p className={styles.feedback} role="alert">{actionError}</p>}
          </div>
        )}
      </Dialog>
    </>
  );
}
