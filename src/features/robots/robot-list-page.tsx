"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionButton,
  Dialog,
  InlineNotice,
  MetricStrip,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/admin-workspace/admin-workspace";
import { PageState } from "@/components/page-state/page-state";
import { getAdminCatalog } from "@/features/operations/operations-api";
import type { AdminCatalog } from "@/features/operations/operations-models";
import { useAdminSession } from "@/session/admin-session";
import { RobotEditor } from "./robot-editor";
import type {
  CursorPage,
  RobotAdmin,
  StatusToggle,
  StrategyDefinition,
} from "./robot-models";
import {
  createRobot,
  deleteRobot,
  isRobotForbidden,
  isRobotVersionExpired,
  listAdminRobots,
  listRobotStrategies,
  newRobotIntentKey,
  robotErrorMessage,
  setRobotStatus,
  type RobotListQuery,
  type RobotWriteInput,
} from "./robots-api";
import {
  formatDateTime,
  formatRate,
  formatScore,
  generationModeLabel,
  lotteryNames,
  RobotIdentity,
} from "./robot-ui";
import styles from "./robots-pages.module.css";

interface Snapshot {
  catalog: AdminCatalog;
  strategies: readonly StrategyDefinition[];
  robots: CursorPage<RobotAdmin>;
}

interface Filters {
  keyword: string;
  lotteryId: string;
  status: "" | StatusToggle;
}

interface StatusIntent {
  robot: RobotAdmin;
  status: StatusToggle;
  reason: string;
  key: string;
}

interface DeleteIntent {
  robot: RobotAdmin;
  key: string;
}

const emptyFilters: Filters = { keyword: "", lotteryId: "", status: "" };

export function RobotListPage() {
  const session = useAdminSession();
  const permissions = session.identity?.permissions ?? [];
  const canView = permissions.includes("robot:view");
  const canCreate = permissions.includes("robot:create");
  const canChangeStatus = permissions.includes("robot:status");
  const canDelete = permissions.includes("robot:delete");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(emptyFilters);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<readonly (string | undefined)[]>([]);
  const [createIntent, setCreateIntent] = useState<{ key: string; editorKey: string } | null>(null);
  const [statusIntent, setStatusIntent] = useState<StatusIntent | null>(null);
  const [deleteIntent, setDeleteIntent] = useState<DeleteIntent | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [versionExpired, setVersionExpired] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async (
    nextCursor: string | undefined,
    nextFilters: Filters,
  ) => {
    if (!canView) {
      setStatus("forbidden");
      return;
    }
    setStatus("loading");
    setError(null);
    const query: RobotListQuery = {
      limit: 20,
      ...(nextCursor === undefined ? {} : { cursor: nextCursor }),
      ...(nextFilters.keyword.trim() === "" ? {} : { keyword: nextFilters.keyword.trim() }),
      ...(nextFilters.lotteryId === "" ? {} : { lotteryId: nextFilters.lotteryId }),
      ...(nextFilters.status === "" ? {} : { status: nextFilters.status }),
    };
    try {
      const [catalog, strategies, robots] = await Promise.all([
        getAdminCatalog(),
        listRobotStrategies(),
        listAdminRobots(query),
      ]);
      setSnapshot({ catalog, strategies: strategies.items, robots });
      setStatus("ready");
    } catch (cause) {
      setError(robotErrorMessage(cause));
      setStatus(isRobotForbidden(cause) ? "forbidden" : "error");
    }
  }, [canView]);

  useEffect(() => {
    if (session.status === "authenticated") void load(cursor, appliedFilters);
  }, [appliedFilters, cursor, load, session.status]);

  const metrics = useMemo(() => listMetrics(snapshot?.robots.items ?? []), [snapshot?.robots.items]);

  function applyFilters() {
    setCursor(undefined);
    setCursorHistory([]);
    setAppliedFilters(filters);
  }

  function resetFilters() {
    setFilters(emptyFilters);
    setCursor(undefined);
    setCursorHistory([]);
    setAppliedFilters(emptyFilters);
  }

  async function submitCreate(input: RobotWriteInput) {
    if (createIntent === null) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const created = await createRobot(input, createIntent.key);
      setCreateIntent(null);
      setFeedback(`${created.robot.name} 已创建并保持停用；确认策略后可单独启用。`);
      setCursor(undefined);
      setCursorHistory([]);
      await load(undefined, appliedFilters);
    } catch (cause) {
      setActionError(robotErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitStatus() {
    if (statusIntent === null || statusIntent.reason.trim().length < 2) return;
    setSubmitting(true);
    setActionError(null);
    setVersionExpired(false);
    try {
      const updated = await setRobotStatus({
        robot: statusIntent.robot,
        status: statusIntent.status,
        reason: statusIntent.reason.trim(),
        idempotencyKey: statusIntent.key,
      });
      setStatusIntent(null);
      setFeedback(`${updated.robot.name} 已由服务端确认${updated.status === "ENABLED" ? "启用" : "停用"}。`);
      await load(cursor, appliedFilters);
    } catch (cause) {
      setVersionExpired(isRobotVersionExpired(cause));
      setActionError(robotErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitDelete() {
    if (deleteIntent === null) return;
    setSubmitting(true);
    setActionError(null);
    setVersionExpired(false);
    try {
      await deleteRobot(deleteIntent.robot, deleteIntent.key);
      const name = deleteIntent.robot.robot.name;
      setDeleteIntent(null);
      setFeedback(`${name} 已逻辑删除；历史推荐和已有引用继续保留。`);
      await load(cursor, appliedFilters);
    } catch (cause) {
      setVersionExpired(isRobotVersionExpired(cause));
      setActionError(robotErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  function openStatus(robot: RobotAdmin) {
    setActionError(null);
    setVersionExpired(false);
    setStatusIntent({
      robot,
      status: robot.status === "ENABLED" ? "DISABLED" : "ENABLED",
      reason: "",
      key: newRobotIntentKey("setRobotStatus"),
    });
  }

  return (
    <>
      <PageHeader
        actions={(
          <>
            <ActionButton onClick={() => void load(cursor, appliedFilters)}>刷新列表</ActionButton>
            <ActionButton
              disabled={!canCreate || snapshot === null}
              onClick={() => {
                setActionError(null);
                setCreateIntent({ key: newRobotIntentKey("createRobot"), editorKey: crypto.randomUUID() });
              }}
              variant="primary"
            >新增机器人大师</ActionButton>
          </>
        )}
        description="按六类可解释策略管理大师资料、允许彩种和运行边界；推荐号码始终由可信后端生成。"
        pageId="A06"
        title="彩票大师管理"
      />

      {status === "loading" ? <PageState kind="loading" title="正在读取机器人大师" /> : null}
      {status === "forbidden" ? <PageState description="当前员工没有 robot:view 权限。" kind="forbidden" /> : null}
      {status === "error" ? (
        <PageState
          action={<ActionButton onClick={() => void load(cursor, appliedFilters)}>重试</ActionButton>}
          description={error ?? "大师列表读取失败。"}
          kind="error"
        />
      ) : null}

      {status === "ready" && snapshot !== null ? (
        <>
          <MetricStrip items={metrics} />
          {snapshot.catalog.approvalStatus === "D01_PENDING" ? (
            <InlineNotice title="D01 最终玩法目录尚未确认" tone="warning">
              机器人资料和策略可以维护，正式推荐生成继续由服务端关闭；页面不会用原型演示玩法补齐。
            </InlineNotice>
          ) : null}
          <InlineNotice title="推荐发布不等于积分参与就绪">
            大师只生成号码、评分和版本。D02 模拟积分返奖规则由参与与结算服务独立门控，本页不把推荐价格解释为返奖承诺。
          </InlineNotice>
          {feedback === null ? null : <InlineNotice title="服务端已确认" tone="success">{feedback}</InlineNotice>}

          <Panel description="搜索、彩种和状态筛选均提交到后台；分页游标绑定当前筛选。" title="筛选与列表">
            <div className={styles.filterBar}>
              <label className={styles.field} data-grow="true">
                <span>名称 / 编号</span>
                <input
                  maxLength={100}
                  onChange={(event) => setFilters((value) => ({ ...value, keyword: event.target.value }))}
                  placeholder="搜索大师名称或资源编号"
                  value={filters.keyword}
                />
              </label>
              <label className={styles.field}>
                <span>允许彩种</span>
                <select onChange={(event) => setFilters((value) => ({ ...value, lotteryId: event.target.value }))} value={filters.lotteryId}>
                  <option value="">全部彩种</option>
                  {snapshot.catalog.lotteries.map((lottery) => <option key={lottery.id} value={lottery.id}>{lottery.name}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span>状态</span>
                <select onChange={(event) => setFilters((value) => ({ ...value, status: event.target.value as Filters["status"] }))} value={filters.status}>
                  <option value="">全部状态</option>
                  <option value="ENABLED">启用</option>
                  <option value="DISABLED">停用</option>
                </select>
              </label>
              <ActionButton onClick={resetFilters}>重置</ActionButton>
              <ActionButton onClick={applyFilters} variant="primary">查询</ActionButton>
            </div>
          </Panel>

          {snapshot.robots.items.length === 0 ? (
            <PageState description="当前筛选没有机器人大师；页面不会填充原型演示数据。" kind="empty" />
          ) : (
            <Panel
              description={`当前页 ${snapshot.robots.items.length} 条${snapshot.robots.snapshotId === null ? "" : ` · 快照 ${snapshot.robots.snapshotId}`}`}
              flush
              title="大师列表"
            >
              <div className={styles.tableWrap}>
                <table className={styles.table} data-wide="true">
                  <thead><tr><th>大师</th><th>策略 / 运行</th><th>允许彩种</th><th>本期覆盖</th><th>号码组合</th><th>推荐评分</th><th>历史命中</th><th>积分价</th><th>最近执行</th><th>状态</th><th>操作</th></tr></thead>
                  <tbody>
                    {snapshot.robots.items.map((robot) => (
                      <tr key={robot.robot.id}>
                        <td><RobotIdentity robot={robot} /></td>
                        <td><div className={styles.entity}><strong>{robot.robot.strategyLabel}</strong><small>{generationModeLabel(robot.generationMode, robot.generationTime)}</small></div></td>
                        <td><div className={styles.tagList}>{lotteryNames(snapshot.catalog, robot.robot.lotteryIds).map((name, index) => <span key={`${robot.robot.id}-lottery-${index}`}>{name}</span>)}</div></td>
                        <td><strong>{robot.currentLotteryCount} 彩种</strong><div className={styles.muted}>{robot.currentPlayCount} 个玩法</div></td>
                        <td><Link className={styles.inlineLink} href={`/masters/${encodeURIComponent(robot.robot.id)}/executions`}>{robot.robot.currentGroups} 组</Link><div className={styles.muted}>{robot.currentBetCount} 注</div></td>
                        <td><strong>{formatScore(robot.robot.recommendationScore)}</strong><div className={styles.muted}>不是中奖概率</div></td>
                        <td><strong>{formatRate(robot.robot.performance.hitRate)}</strong><div className={styles.muted}>{robot.robot.performance.hitGroups}/{robot.robot.performance.settledGroups} 组</div></td>
                        <td><strong>{robot.currentPricePoints}</strong><div className={styles.muted}>积分</div></td>
                        <td>{formatDateTime(robot.latestExecutionAt)}</td>
                        <td><StatusBadge label={robot.status === "ENABLED" ? "启用" : "停用"} status={robot.status === "ENABLED" ? "READY" : "DISABLED"} /></td>
                        <td>
                          <div className={styles.tableActions}>
                            <Link className={styles.inlineLink} href={`/masters/${encodeURIComponent(robot.robot.id)}`}>策略设置</Link>
                            <Link className={styles.inlineLink} href={`/masters/${encodeURIComponent(robot.robot.id)}/executions`}>执行与版本</Link>
                            <button className={styles.textButton} disabled={!canChangeStatus} onClick={() => openStatus(robot)} type="button">{robot.status === "ENABLED" ? "停用" : "启用"}</button>
                            <button className={styles.dangerButton} disabled={!canDelete} onClick={() => {
                              setActionError(null);
                              setVersionExpired(false);
                              setDeleteIntent({ robot, key: newRobotIntentKey("deleteRobot") });
                            }} type="button">删除</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.pagination}>
                <ActionButton
                  disabled={cursorHistory.length === 0}
                  onClick={() => {
                    const previous = cursorHistory.at(-1);
                    setCursor(previous);
                    setCursorHistory((history) => history.slice(0, -1));
                  }}
                >上一页</ActionButton>
                <span>游标分页，不虚构总页数</span>
                <ActionButton
                  disabled={!snapshot.robots.hasMore || snapshot.robots.nextCursor === null}
                  onClick={() => {
                    setCursorHistory((history) => [...history, cursor]);
                    setCursor(snapshot.robots.nextCursor ?? undefined);
                  }}
                >下一页</ActionButton>
              </div>
            </Panel>
          )}

          <Panel description="说明来自 listRobotStrategies；参数编辑使用类型化表单，不执行 schemaRef 或自由脚本。" title="六类策略目录">
            <div className={styles.strategyGrid}>
              {snapshot.strategies.map((strategy) => (
                <article key={strategy.code}><span>{strategy.code}</span><strong>{strategy.label}</strong><p>{strategy.description}</p></article>
              ))}
            </div>
          </Panel>
        </>
      ) : null}

      <Dialog
        onClose={() => !submitting && setCreateIntent(null)}
        open={createIntent !== null}
        title="新增机器人大师"
        width="wide"
      >
        {createIntent === null || snapshot === null ? null : (
          <RobotEditor
            busy={submitting}
            catalog={snapshot.catalog}
            definitions={snapshot.strategies}
            error={actionError}
            key={createIntent.editorKey}
            onCancel={() => setCreateIntent(null)}
            onSubmit={submitCreate}
            submitLabel="创建停用机器人"
          />
        )}
      </Dialog>

      <Dialog
        footer={(
          <>
            <ActionButton disabled={submitting} onClick={() => setStatusIntent(null)}>取消</ActionButton>
            <ActionButton
              disabled={submitting || (statusIntent?.reason.trim().length ?? 0) < 2 || versionExpired}
              onClick={() => void submitStatus()}
              variant="primary"
            >{submitting ? "提交中" : statusIntent?.status === "ENABLED" ? "确认启用" : "确认停用"}</ActionButton>
          </>
        )}
        onClose={() => !submitting && setStatusIntent(null)}
        open={statusIntent !== null}
        title={statusIntent?.status === "ENABLED" ? "启用机器人大师" : "停用机器人大师"}
      >
        {statusIntent === null ? null : (
          <div className={styles.dialogStack}>
            <InlineNotice title={statusIntent.robot.robot.name} tone="warning">
              {statusIntent.status === "ENABLED" ? "启用后才可创建预览和正式生成任务。" : "停用只阻止新任务，已有推荐继续保留并等待核验。"}
            </InlineNotice>
            <label className={styles.field}><span>操作原因</span><textarea maxLength={500} onChange={(event) => setStatusIntent((value) => value === null ? null : ({ ...value, reason: event.target.value }))} value={statusIntent.reason} /></label>
            {actionError === null ? null : <p className={styles.feedback} role="alert">{actionError}</p>}
            {versionExpired ? <ActionButton onClick={() => { setStatusIntent(null); void load(cursor, appliedFilters); }}>重新加载列表</ActionButton> : null}
          </div>
        )}
      </Dialog>

      <Dialog
        footer={(
          <>
            <ActionButton disabled={submitting} onClick={() => setDeleteIntent(null)}>取消</ActionButton>
            <ActionButton disabled={submitting || versionExpired} onClick={() => void submitDelete()} variant="danger">{submitting ? "删除中" : "确认逻辑删除"}</ActionButton>
          </>
        )}
        onClose={() => !submitting && setDeleteIntent(null)}
        open={deleteIntent !== null}
        title="逻辑删除机器人大师"
      >
        {deleteIntent === null ? null : (
          <div className={styles.dialogStack}>
            <InlineNotice title={deleteIntent.robot.robot.name} tone="danger">
              删除后不再出现在运营列表；已发布推荐、历史战绩和订单引用不会被物理删除。
            </InlineNotice>
            {actionError === null ? null : <p className={styles.feedback} role="alert">{actionError}</p>}
            {versionExpired ? <ActionButton onClick={() => { setDeleteIntent(null); void load(cursor, appliedFilters); }}>重新加载列表</ActionButton> : null}
          </div>
        )}
      </Dialog>
    </>
  );
}

function listMetrics(robots: readonly RobotAdmin[]) {
  const enabled = robots.filter((robot) => robot.status === "ENABLED").length;
  const groups = sumIntegerStrings(robots.map((robot) => robot.robot.currentGroups));
  const betCount = sumIntegerStrings(robots.map((robot) => robot.currentBetCount));
  const totalPrice = sumPointStrings(robots.map((robot) => robot.currentPricePoints));
  return [
    { label: "当前页大师", value: String(robots.length), detail: "仅当前游标页，不冒充全量" },
    { label: "当前页启用", value: String(enabled), detail: "停用机器人不会创建新任务", tone: enabled > 0 ? "good" as const : "default" as const },
    { label: "当前组合 / 注数", value: `${groups} / ${betCount}`, detail: "来自服务端当前推荐汇总" },
    { label: "当前组合积分", value: totalPrice, detail: "只读计价，不是返奖承诺" },
  ];
}

function sumIntegerStrings(values: readonly string[]): string {
  try {
    return values.reduce((sum, value) => sum + BigInt(value), 0n).toString();
  } catch {
    return "—";
  }
}

function sumPointStrings(values: readonly string[]): string {
  try {
    const minor = values.reduce((sum, value) => {
      const match = /^(0|[1-9][0-9]{0,15})\.([0-9]{2})$/.exec(value);
      if (match === null || match[1] === undefined || match[2] === undefined) throw new Error("INVALID_POINTS");
      return sum + BigInt(match[1]) * 100n + BigInt(match[2]);
    }, 0n);
    return `${minor / 100n}.${(minor % 100n).toString().padStart(2, "0")}`;
  } catch {
    return "—";
  }
}
