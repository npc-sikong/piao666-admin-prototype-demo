"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ActionButton,
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
import type {
  CursorPage,
  Recommendation,
  RobotAdmin,
  TaskStatusSummary,
} from "./robot-models";
import {
  generateRobot,
  getAdminRobot,
  isRobotForbidden,
  listAdminRecommendations,
  listRobotExecutions,
  newRobotIntentKey,
  robotErrorMessage,
} from "./robots-api";
import {
  executionIdFromResultUrl,
  executionResultCopy,
  formatDateTime,
  lotteryNames,
  RecommendationCard,
  RobotIdentity,
  shortId,
  taskStatusLabel,
} from "./robot-ui";
import { useRobotTask } from "./use-robot-task";
import styles from "./robots-pages.module.css";

interface Snapshot {
  catalog: AdminCatalog;
  robot: RobotAdmin;
  executions: CursorPage<TaskStatusSummary>;
  recommendations: CursorPage<Recommendation>;
}

interface GenerateDraft {
  lotteryId: string;
  issueCode: string;
  reason: string;
  key: string;
}

export function RobotExecutionsPage({ robotId }: Readonly<{ robotId: string }>) {
  const session = useAdminSession();
  const permissions = session.identity?.permissions ?? [];
  const canView = permissions.includes("robot:view");
  const canGenerate = permissions.includes("robot:generate");
  const canViewTask = permissions.includes("task:view");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [draft, setDraft] = useState<GenerateDraft | null>(null);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskStatusSummary | null>(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);
  const task = useRobotTask(canViewTask);

  const load = useCallback(async () => {
    if (!canView) {
      setStatus("forbidden");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const [catalog, robot, executions, recommendations] = await Promise.all([
        getAdminCatalog(),
        getAdminRobot(robotId),
        listRobotExecutions(robotId),
        listAdminRecommendations(robotId),
      ]);
      setSnapshot({ catalog, robot, executions, recommendations });
      setStatus("ready");
    } catch (cause) {
      setError(robotErrorMessage(cause));
      setStatus(isRobotForbidden(cause) ? "forbidden" : "error");
    }
  }, [canView, robotId]);

  useEffect(() => {
    if (session.status === "authenticated") void load();
  }, [load, session.status]);

  const selectExecution = useCallback(async (execution: TaskStatusSummary) => {
    const executionId = executionIdFromResultUrl(execution.resultUrl);
    setSelectedTask(execution);
    setResultError(null);
    if (executionId === null) {
      setSelectedExecutionId(null);
      if (execution.status === "FAILED") return;
      setResultError("任务没有返回可读取的推荐执行批次地址。");
      return;
    }
    setSelectedExecutionId(executionId);
    setResultLoading(true);
    setSnapshot((value) => value === null ? null : ({
      ...value,
      recommendations: emptyRecommendationPage(),
    }));
    try {
      const recommendations = await listAdminRecommendations(robotId, { executionId });
      setSnapshot((value) => value === null ? null : ({ ...value, recommendations }));
    } catch (cause) {
      setResultError(robotErrorMessage(cause));
    } finally {
      setResultLoading(false);
    }
  }, [robotId]);

  useEffect(() => {
    if (task.status === null) return;
    setSelectedTask(task.status);
    if (task.status.status === "SUCCEEDED" || task.status.status === "FAILED" || task.status.status === "CANCELLED") {
      void listRobotExecutions(robotId).then((executions) => {
        setSnapshot((value) => value === null ? null : ({ ...value, executions }));
      }).catch((cause: unknown) => setResultError(robotErrorMessage(cause)));
    }
    if (task.status.status !== "SUCCEEDED") return;
    const executionId = executionIdFromResultUrl(task.status.resultUrl);
    if (executionId === null || executionId === selectedExecutionId) return;
    void selectExecution(task.status);
  }, [robotId, selectedExecutionId, selectExecution, task.status]);

  async function submitGeneration() {
    if (snapshot === null || draft === null) return;
    if (draft.lotteryId === "" || draft.issueCode.trim() === "" || draft.reason.trim().length < 2) {
      setActionError("请选择允许彩种，并填写已登记期号和至少 2 个字符的生成原因。");
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      const accepted = await generateRobot({
        robotId: snapshot.robot.robot.id,
        lotteryId: draft.lotteryId,
        issueCode: draft.issueCode.trim(),
        reason: draft.reason.trim(),
        idempotencyKey: draft.key,
      });
      task.start(accepted);
      setSelectedTask(null);
      setSelectedExecutionId(null);
      setDraft(null);
      void showAllRecommendations();
    } catch (cause) {
      setActionError(robotErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  async function loadMoreExecutions() {
    if (snapshot?.executions.nextCursor === null || snapshot === null) return;
    setResultLoading(true);
    setResultError(null);
    try {
      const next = await listRobotExecutions(robotId, snapshot.executions.nextCursor);
      setSnapshot((value) => value === null ? null : ({
        ...value,
        executions: {
          ...next,
          items: [...value.executions.items, ...next.items],
        },
      }));
    } catch (cause) {
      setResultError(robotErrorMessage(cause));
    } finally {
      setResultLoading(false);
    }
  }

  async function loadMoreRecommendations() {
    if (snapshot?.recommendations.nextCursor === null || snapshot === null) return;
    setResultLoading(true);
    setResultError(null);
    try {
      const next = await listAdminRecommendations(robotId, {
        ...(selectedExecutionId === null ? {} : { executionId: selectedExecutionId }),
        cursor: snapshot.recommendations.nextCursor,
      });
      setSnapshot((value) => value === null ? null : ({
        ...value,
        recommendations: {
          ...next,
          items: [...value.recommendations.items, ...next.items],
        },
      }));
    } catch (cause) {
      setResultError(robotErrorMessage(cause));
    } finally {
      setResultLoading(false);
    }
  }

  function openGeneration() {
    if (snapshot === null) return;
    setActionError(null);
    const readyLotteryId = snapshot.robot.robot.lotteryIds.find((id) => (
      snapshot.catalog.lotteries.find((lottery) => lottery.id === id)?.plays.some((play) => play.readiness === "READY")
    ));
    setDraft({
      lotteryId: readyLotteryId ?? "",
      issueCode: "",
      reason: "",
      key: newRobotIntentKey("generateRobot"),
    });
  }

  const hasReadyAllowedLottery = snapshot?.robot.robot.lotteryIds.some((id) => (
    snapshot.catalog.lotteries.find((lottery) => lottery.id === id)?.plays.some((play) => play.readiness === "READY")
  )) ?? false;
  const formalBlocked = snapshot?.catalog.approvalStatus !== "APPROVED" || !hasReadyAllowedLottery;

  async function showAllRecommendations(selectedTaskValue: TaskStatusSummary | null = null) {
    setSelectedExecutionId(null);
    setSelectedTask(selectedTaskValue);
    setResultLoading(true);
    setResultError(null);
    setSnapshot((value) => value === null ? null : ({
      ...value,
      recommendations: emptyRecommendationPage(),
    }));
    try {
      const recommendations = await listAdminRecommendations(robotId);
      setSnapshot((value) => value === null ? null : ({ ...value, recommendations }));
    } catch (cause) {
      setResultError(robotErrorMessage(cause));
    } finally {
      setResultLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        actions={(
          <>
            <Link className={styles.secondaryLink} href="/masters">返回大师列表</Link>
            <Link className={styles.secondaryLink} href={`/masters/${encodeURIComponent(robotId)}`}>策略设置</Link>
            <ActionButton
              disabled={!canGenerate || snapshot?.robot.status !== "ENABLED" || formalBlocked}
              onClick={openGeneration}
              variant="primary"
            >生成正式推荐</ActionButton>
          </>
        )}
        description="查看正式与预览执行任务、失败原因和不可变推荐版本；重跑不会覆盖已经售出的版本。"
        pageId="A08"
        title="大师执行与推荐版本"
      />

      {status === "loading" ? <PageState kind="loading" title="正在读取执行与推荐版本" /> : null}
      {status === "forbidden" ? <PageState description="当前员工没有 robot:view 权限。" kind="forbidden" /> : null}
      {status === "error" ? <PageState action={<ActionButton onClick={() => void load()}>重试</ActionButton>} description={error ?? "执行记录读取失败。"} kind="error" /> : null}

      {status === "ready" && snapshot !== null ? (
        <>
          <Panel
            actions={<RobotIdentity robot={snapshot.robot} />}
            description="正式生成使用当前策略版本、后端固定种子、可信历史快照和已登记目标期次。"
            title="执行边界"
          >
            <div className={styles.executionBoundary}>
              <div><span>机器人状态</span><StatusBadge label={snapshot.robot.status === "ENABLED" ? "启用" : "停用"} status={snapshot.robot.status === "ENABLED" ? "READY" : "DISABLED"} /></div>
              <div><span>策略版本</span><strong>v{snapshot.robot.strategyVersion}</strong></div>
              <div><span>允许彩种</span><strong>{lotteryNames(snapshot.catalog, snapshot.robot.robot.lotteryIds).join("、") || "未配置"}</strong></div>
              <div><span>重跑上限</span><strong>{snapshot.robot.strategy.common.maxRerunsPerIssue} 次 / 期</strong></div>
            </div>
          </Panel>

          {formalBlocked ? (
            <PageState
              description={snapshot.catalog.approvalStatus !== "APPROVED"
                ? "D01 最终 22 玩法目录尚未批准，正式 generateRobot 入口保持禁用；可以返回策略页执行隔离预览。"
                : "当前允许彩种没有任何规则就绪玩法，正式生成保持禁用；请先完成规则与数据准入。"}
              kind="not-ready"
              title="正式推荐规则尚未就绪"
            />
          ) : null}
          <InlineNotice title="D02 不由推荐任务替代" tone="warning">
            正式推荐完成只代表号码版本已发布。若模拟积分返奖表未批准，会员参与与返奖仍必须由下游服务保持禁用。
          </InlineNotice>

          {draft === null ? null : (
            <Panel
              actions={(
                <>
                  <ActionButton disabled={submitting} onClick={() => setDraft(null)}>取消</ActionButton>
                  <ActionButton disabled={submitting || formalBlocked} onClick={() => void submitGeneration()} variant="primary">{submitting ? "提交中" : "提交正式生成任务"}</ActionButton>
                </>
              )}
              description="同一机器人、彩种、期次只能有一个正式生成任务运行；服务端校验期次、截止、来源与重跑上限。"
              title="生成新推荐版本"
            >
              <div className={styles.formGrid}>
                <label className={styles.field}><span>规则就绪的允许彩种</span><select onChange={(event) => setDraft((value) => value === null ? null : ({ ...value, lotteryId: event.target.value }))} value={draft.lotteryId}>{snapshot.robot.robot.lotteryIds.map((id) => {
                  const lottery = snapshot.catalog.lotteries.find((item) => item.id === id);
                  const ready = lottery?.plays.some((play) => play.readiness === "READY") ?? false;
                  return <option disabled={!ready} key={id} value={id}>{lottery?.name ?? "未知彩种"}{ready ? "" : "（规则未就绪）"}</option>;
                })}</select></label>
                <label className={styles.field}><span>已登记目标期号</span><input maxLength={32} onChange={(event) => setDraft((value) => value === null ? null : ({ ...value, issueCode: event.target.value }))} placeholder="服务端校验真实期次与截止时间" value={draft.issueCode} /></label>
                <label className={`${styles.field} ${styles.span2}`}><span>生成 / 重跑原因</span><textarea maxLength={500} onChange={(event) => setDraft((value) => value === null ? null : ({ ...value, reason: event.target.value }))} value={draft.reason} /></label>
              </div>
              <InlineNotice title="提交结果" tone="warning">
                202 响应只显示“已受理”和任务号；只有任务完成并返回 PUBLISHED，才表示正式推荐版本已经生成。
              </InlineNotice>
              {actionError === null ? null : <p className={styles.feedback} role="alert">{actionError}</p>}
            </Panel>
          )}

          {task.accepted === null ? null : (
            <Panel
              actions={<button className={styles.textButton} onClick={task.clear} type="button">收起</button>}
              description={`任务号 ${task.accepted.taskId}`}
              title="当前提交任务"
            >
              <TaskStatus
                failureCode={task.status?.failureCode}
                progress={task.status?.progress ?? 0}
                resultCode={task.status?.resultCode}
                status={task.status?.status ?? task.accepted.status}
              />
              {task.status === null ? <p className={styles.taskSummary}>任务已受理，等待作业执行。</p> : <p className={styles.taskSummary}>{executionResultCopy(task.status)}</p>}
              {!canViewTask ? <p className={styles.feedback}>当前员工缺少 task:view，无法继续读取任务进度。</p> : null}
              {task.error === null ? null : <p className={styles.feedback} role="alert">{task.error}</p>}
            </Panel>
          )}

          <Panel
            actions={<ActionButton onClick={() => void load()}>刷新执行记录</ActionButton>}
            description="任务状态与业务结果分开：SUCCEEDED 可以是 PUBLISHED、PREVIEW_READY 或 0 推荐结果。"
            flush
            title="执行任务"
          >
            {snapshot.executions.items.length === 0 ? (
              <PageState description="该机器人尚无预览或正式生成任务。" kind="empty" />
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>任务</th><th>类型</th><th>状态</th><th>进度</th><th>业务结果</th><th>更新时间</th><th>操作</th></tr></thead>
                  <tbody>
                    {snapshot.executions.items.map((execution) => {
                      const executionId = executionIdFromResultUrl(execution.resultUrl);
                      return (
                        <tr data-selected={selectedTask?.id === execution.id || undefined} key={execution.id}>
                          <td><code className={styles.mono}>{shortId(execution.id)}</code></td>
                          <td>{execution.taskType === "ROBOT_PREVIEW" ? "隔离预览" : execution.taskType === "ROBOT_GENERATE" ? "正式生成" : execution.taskType}</td>
                          <td><StatusBadge label={taskStatusLabel(execution.status)} status={execution.status} /></td>
                          <td>{Math.round(execution.progress * 100)}%</td>
                          <td>{executionResultCopy(execution)}</td>
                          <td>{formatDateTime(execution.updatedAt)}</td>
                          <td><div className={styles.tableActions}>
                            {execution.status === "PENDING" || execution.status === "RUNNING" || execution.status === "RETRY_WAIT" ? <button className={styles.textButton} disabled={!canViewTask} onClick={() => { task.track(execution); void showAllRecommendations(execution); }} type="button">跟踪任务</button> : null}
                            {executionId === null ? null : <button className={styles.textButton} onClick={() => void selectExecution(execution)} type="button">查看推荐版本</button>}
                            {execution.status === "FAILED" ? <button className={styles.textButton} onClick={() => void showAllRecommendations(execution)} type="button">查看失败原因</button> : null}
                          </div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {snapshot.executions.hasMore ? <div className={styles.loadMore}><ActionButton disabled={resultLoading} onClick={() => void loadMoreExecutions()}>加载更多执行记录</ActionButton></div> : null}
          </Panel>

          {selectedTask?.status === "FAILED" ? (
            <PageState description={executionResultCopy(selectedTask)} kind="error" title="执行失败" />
          ) : null}
          {!resultLoading && selectedTask?.status === "SUCCEEDED" && snapshot.recommendations.items.length === 0 ? (
            <PageState description={executionResultCopy(selectedTask)} kind="empty" title="执行完成，0 个推荐" />
          ) : null}
          {resultError === null ? null : <PageState description={resultError} kind="error" title="推荐版本读取失败" />}

          <Panel
            actions={selectedExecutionId === null ? null : <button className={styles.textButton} onClick={() => void showAllRecommendations()} type="button">返回全部最新版本</button>}
            description={selectedExecutionId === null ? "展示当前可见推荐版本；号码、价格和解释均为服务端只读事实。" : `执行批次 ${shortId(selectedExecutionId)} 的隔离结果。`}
            title={selectedExecutionId === null ? "推荐版本" : "指定执行批次结果"}
          >
            {resultLoading ? <PageState kind="loading" title="正在读取推荐版本" /> : null}
            {!resultLoading && snapshot.recommendations.items.length === 0 && selectedTask?.status !== "SUCCEEDED" ? <PageState description="当前范围没有推荐版本。" kind="empty" /> : null}
            <div className={styles.recommendationList}>
              {snapshot.recommendations.items.map((recommendation) => <RecommendationCard catalog={snapshot.catalog} key={recommendation.id} recommendation={recommendation} />)}
            </div>
            {snapshot.recommendations.hasMore ? <div className={styles.loadMore}><ActionButton disabled={resultLoading} onClick={() => void loadMoreRecommendations()}>加载更多推荐版本</ActionButton></div> : null}
          </Panel>
        </>
      ) : null}
    </>
  );
}

function emptyRecommendationPage(): CursorPage<Recommendation> {
  return { items: [], nextCursor: null, hasMore: false, snapshotId: null };
}
