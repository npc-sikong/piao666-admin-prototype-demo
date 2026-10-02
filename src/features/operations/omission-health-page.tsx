"use client";

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
import { TaskStatus } from "@/components/task-status/task-status";
import { useAdminSession } from "@/session/admin-session";
import {
  acknowledgeOmissionGap,
  apiErrorMessage,
  getAdminCatalog,
  getDataHealth,
  listOmissionGaps,
  newIntentKey,
  rebuildOmissions,
  revokeOmissionGapAcknowledgement,
} from "./operations-api";
import type {
  AdminCatalog,
  DataHealthItem,
  DataHealthPage,
  OmissionGap,
  OmissionGapPage,
} from "./operations-models";
import styles from "./operations-pages.module.css";
import { useAdminTask } from "./use-admin-task";

interface HealthSnapshot {
  catalog: AdminCatalog;
  health: DataHealthPage;
}

interface RebuildIntent {
  health: DataHealthItem;
  fromIssueCode: string;
  reason: string;
  key: string;
}

interface AcknowledgeIntent {
  gap: OmissionGap;
  reason: string;
}

export function OmissionHealthPage() {
  const session = useAdminSession();
  const permissions = session.identity?.permissions ?? [];
  const canView = permissions.includes("lottery:data:view");
  const canRebuild = permissions.includes("omission:rebuild");
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const [error, setError] = useState<string | null>(null);
  const [lotteryId, setLotteryId] = useState("");
  const [rebuildIntent, setRebuildIntent] = useState<RebuildIntent | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildError, setRebuildError] = useState<string | null>(null);
  const [gaps, setGaps] = useState<OmissionGapPage | null>(null);
  const [gapError, setGapError] = useState<string | null>(null);
  const [ackIntent, setAckIntent] = useState<AcknowledgeIntent | null>(null);
  const [ackBusy, setAckBusy] = useState(false);
  const [ackError, setAckError] = useState<string | null>(null);
  const task = useAdminTask();

  const load = useCallback(async () => {
    if (!canView) {
      setStatus("forbidden");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const [catalog, health] = await Promise.all([
        getAdminCatalog(),
        getDataHealth(),
      ]);
      setSnapshot({ catalog, health });
      setLotteryId((current) => {
        if (current !== "") {
          return current;
        }
        const requested = new URLSearchParams((window.location.hash.includes('?') ? window.location.hash.slice(window.location.hash.indexOf('?')) : window.location.search)).get("lotteryId");
        return health.items.some((item) => item.lotteryId === requested)
          ? requested ?? ""
          : health.items[0]?.lotteryId ?? catalog.lotteries[0]?.id ?? "";
      });
      setStatus("ready");
    } catch (cause) {
      setError(apiErrorMessage(cause));
      setStatus("error");
    }
  }, [canView]);

  useEffect(() => {
    if (session.status === "authenticated") {
      void load();
    }
  }, [load, session.status]);

  useEffect(() => {
    if (task.status?.status === "SUCCEEDED") {
      void load();
    }
  }, [load, task.status?.status]);

  const loadGaps = useCallback(async (selected: string) => {
    if (!canView || selected === "") {
      return;
    }
    setGapError(null);
    try {
      setGaps(await listOmissionGaps(selected));
    } catch (cause) {
      setGaps(null);
      setGapError(apiErrorMessage(cause));
    }
  }, [canView]);

  useEffect(() => {
    if (status === "ready") {
      void loadGaps(lotteryId);
    }
  }, [loadGaps, lotteryId, status]);

  const selectedHealth = snapshot?.health.items.find((item) => item.lotteryId === lotteryId)
    ?? null;
  const selectedLottery = snapshot?.catalog.lotteries.find((item) => item.id === lotteryId)
    ?? null;
  const healthByLottery = useMemo(() => new Map(
    snapshot?.health.items.map((item) => [item.lotteryId, item]) ?? [],
  ), [snapshot?.health.items]);

  function openRebuild(health: DataHealthItem) {
    setRebuildError(null);
    setRebuildIntent({
      health,
      fromIssueCode: "",
      reason: "",
      key: newIntentKey("rebuildOmissions"),
    });
  }

  async function submitRebuild() {
    if (rebuildIntent === null || rebuildIntent.health.drawVersionSetHash === null) {
      return;
    }
    setRebuilding(true);
    setRebuildError(null);
    try {
      const accepted = await rebuildOmissions({
        lotteryId: rebuildIntent.health.lotteryId,
        fromIssueCode: rebuildIntent.fromIssueCode.trim(),
        expectedDrawVersionSetHash: rebuildIntent.health.drawVersionSetHash,
        reason: rebuildIntent.reason.trim(),
        idempotencyKey: rebuildIntent.key,
      });
      task.start(accepted);
      setRebuildIntent(null);
    } catch (cause) {
      setRebuildError(apiErrorMessage(cause));
    } finally {
      setRebuilding(false);
    }
  }

  async function submitAcknowledge() {
    if (ackIntent === null) {
      return;
    }
    setAckBusy(true);
    setAckError(null);
    try {
      await acknowledgeOmissionGap({
        lotteryId,
        beforeIssueCode: ackIntent.gap.beforeIssueCode,
        afterIssueCode: ackIntent.gap.afterIssueCode,
        reason: ackIntent.reason.trim(),
      });
      setAckIntent(null);
      await Promise.all([loadGaps(lotteryId), load()]);
    } catch (cause) {
      setAckError(apiErrorMessage(cause));
    } finally {
      setAckBusy(false);
    }
  }

  async function revokeAcknowledgement(gap: OmissionGap) {
    if (gap.acknowledgementId === null) {
      return;
    }
    setAckBusy(true);
    setGapError(null);
    try {
      await revokeOmissionGapAcknowledgement(gap.acknowledgementId);
      await Promise.all([loadGaps(lotteryId), load()]);
    } catch (cause) {
      setGapError(apiErrorMessage(cause));
    } finally {
      setAckBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        actions={<ActionButton onClick={() => void load()}>刷新健康状态</ActionButton>}
        description="查看每个彩种最后可信遗漏快照、连续水位、缺期和后台重建状态。"
        pageId="A05"
        title="遗漏数据健康"
      />

      {status === "loading" ? <PageState kind="loading" title="正在读取遗漏数据水位" /> : null}
      {status === "forbidden" ? (
        <PageState description="当前员工没有彩票数据健康查看权限。" kind="forbidden" />
      ) : null}
      {status === "error" ? (
        <PageState
          action={<ActionButton onClick={() => void load()}>重试</ActionButton>}
          description={error ?? "遗漏数据健康读取失败。"}
          kind="error"
        />
      ) : null}

      {status === "ready" && snapshot !== null ? (
        <>
          <MetricStrip items={healthMetrics(snapshot.health)} />
          <InlineNotice title="重建期间继续使用最后可信快照">
            新代次在后台完成检查点处理和一致性校验后才原子切换；任务已受理、处理中都不代表新投影已经生效。
          </InlineNotice>

          <Panel
            description="缺失区间只展示服务端确认的区间数量和尾部缺口；没有具体边界时不猜测期号。"
            title="彩种健康水位"
          >
            <div className={styles.selectorStrip}>
              {snapshot.catalog.lotteries.map((lottery) => {
                const health = healthByLottery.get(lottery.id);
                return (
                  <button
                    data-active={lotteryId === lottery.id || undefined}
                    key={lottery.id}
                    onClick={() => setLotteryId(lottery.id)}
                    type="button"
                  >
                    <strong>{lottery.name}</strong>
                    <small>{health === undefined ? "无健康记录" : healthStatusLabel(health.status)}</small>
                  </button>
                );
              })}
            </div>
          </Panel>

          {selectedHealth === null ? (
            <PageState description="当前彩种没有可显示的健康记录。" kind="empty" />
          ) : (
            <Panel
              actions={(
                <ActionButton
                  disabled={!canRebuild || selectedHealth.drawVersionSetHash === null}
                  onClick={() => openRebuild(selectedHealth)}
                  variant="primary"
                >发起遗漏重建</ActionButton>
              )}
              description={`${selectedLottery?.name ?? selectedHealth.lotteryId} 的当前服务端健康事实。`}
              flush
              title="当前投影状态"
            >
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>健康状态</th>
                      <th>最新确认期</th>
                      <th>连续可用水位</th>
                      <th>开奖版本</th>
                      <th>遗漏投影版本</th>
                      <th>缺失区间</th>
                      <th>重建状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><StatusBadge label={healthStatusLabel(selectedHealth.status)} status={selectedHealth.status} /></td>
                      <td><strong>{selectedHealth.latestConfirmedIssue ?? "尚无确认开奖"}</strong></td>
                      <td>{watermarkLabel(selectedHealth)}</td>
                      <td><code className={styles.mono}>{selectedHealth.drawVersion === null ? "—" : `v${selectedHealth.drawVersion}`}</code></td>
                      <td><code className={styles.mono}>{selectedHealth.omissionGeneration === null ? "未生成" : `G${selectedHealth.omissionGeneration}`}</code></td>
                      <td>{gapLabel(selectedHealth)}</td>
                      <td>{selectedHealth.pendingTaskCount === 0 ? "没有进行中任务" : `${selectedHealth.pendingTaskCount} 个任务处理中`}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className={styles.tabContent}>
                <div className={styles.detailList}>
                  <div className={styles.detailItem}>
                    <span className={styles.exceptionMarker} data-tone={selectedHealth.drawVersionSetHash === null ? "danger" : undefined} aria-hidden="true" />
                    <div className={styles.detailCopy}>
                      <strong>当前开奖版本集合</strong>
                      <span>{selectedHealth.drawVersionSetHash === null ? "没有可绑定的可信开奖版本集合，不能发起重建。" : "重建请求会绑定此哈希；开奖事实变化后旧请求会被服务端拒绝。"}</span>
                    </div>
                    <code className={styles.hash} title={selectedHealth.drawVersionSetHash ?? undefined}>{selectedHealth.drawVersionSetHash ?? "未就绪"}</code>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.exceptionMarker} data-tone={selectedHealth.projectionLag > 0 ? "danger" : undefined} aria-hidden="true" />
                    <div className={styles.detailCopy}>
                      <strong>投影落后期数</strong>
                      <span>{selectedHealth.projectionLag === 0 ? "当前投影已覆盖全部已确认开奖。" : `${selectedHealth.projectionLag} 期已确认开奖尚未纳入当前投影；开奖确认不会自动推进投影，需要发起遗漏重建。`}</span>
                    </div>
                    <span className={styles.countValue}>{selectedHealth.projectionLag}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.exceptionMarker} data-tone={selectedHealth.qualificationLag > 0 ? "danger" : undefined} aria-hidden="true" />
                    <div className={styles.detailCopy}>
                      <strong>关联资格水位</strong>
                      <span>{selectedHealth.qualificationLag === 0 ? "没有会员资格重算滞后。" : `${selectedHealth.qualificationLag} 个会员资格待追平；该数字不属于遗漏投影代次。`}</span>
                    </div>
                    <span className={styles.countValue}>{selectedHealth.qualificationLag}</span>
                  </div>
                </div>
              </div>
            </Panel>
          )}

          <Panel
            actions={<ActionButton onClick={() => void loadGaps(lotteryId)}>刷新缺口</ActionButton>}
            description="缺口按边界列出，确认后仍然如实保留和计数，只是不再把彩种判为降级、也不再进总览告警。"
            flush
            title={gapPanelTitle(gaps)}
          >
            {gapError !== null ? (
              <div className={styles.tabContent}>
                <p className={styles.feedback} role="alert">{gapError}</p>
              </div>
            ) : null}
            {gaps !== null && gaps.items.length === 0 ? (
              <div className={styles.tabContent}>
                <PageState description="当前生效投影里没有缺口。" kind="empty" />
              </div>
            ) : null}
            {gaps !== null && gaps.items.length > 0 ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>缺口位置</th>
                      <th>状态</th>
                      <th>确认原因</th>
                      <th>确认人 / 时间</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gaps.items.map((gap) => (
                      <tr key={`${gap.beforeIssueCode}-${gap.afterIssueCode}`}>
                        <td>
                          <code className={styles.mono}>
                            {gap.beforeIssueCode} → {gap.afterIssueCode}
                          </code>
                        </td>
                        <td>
                          <StatusBadge
                            label={gap.acknowledged ? "已确认接受" : "未确认"}
                            status={gap.acknowledged ? "READY" : "DEGRADED"}
                          />
                        </td>
                        <td>{gap.reason ?? "—"}</td>
                        <td>
                          {gap.acknowledgedBy === null
                            ? "—"
                            : `${gap.acknowledgedBy} · ${formatMoment(gap.acknowledgedAt)}`}
                        </td>
                        <td>
                          {gap.acknowledged ? (
                            <button
                              className={styles.textButton}
                              disabled={!canRebuild || ackBusy}
                              onClick={() => void revokeAcknowledgement(gap)}
                              type="button"
                            >撤销确认</button>
                          ) : (
                            <button
                              className={styles.textButton}
                              disabled={!canRebuild || ackBusy}
                              onClick={() => {
                                setAckError(null);
                                setAckIntent({ gap, reason: "" });
                              }}
                              type="button"
                            >确认接受</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </Panel>
        </>
      ) : null}

      {task.accepted === null ? null : (
        <Panel
          actions={<button className={styles.textButton} onClick={task.clear} type="button">收起</button>}
          description={`任务号 ${task.accepted.taskId}`}
          title="遗漏重建任务"
        >
          <TaskStatus
            failureCode={task.status?.failureCode}
            progress={task.status?.progress ?? 0}
            resultCode={task.status?.resultCode}
            status={task.status?.status ?? task.accepted.status}
          />
          {task.error === null ? null : <p className={styles.feedback}>{task.error}</p>}
        </Panel>
      )}

      <Dialog
        description={rebuildIntent === null ? undefined : `${lotteryName(snapshot?.catalog ?? null, rebuildIntent.health.lotteryId)} · 当前投影 ${rebuildIntent.health.omissionGeneration ?? "未生成"}`}
        footer={(
          <>
            <ActionButton disabled={rebuilding} onClick={() => setRebuildIntent(null)}>取消</ActionButton>
            <ActionButton
              disabled={rebuilding
                || rebuildIntent?.health.drawVersionSetHash === null
                || (rebuildIntent?.fromIssueCode.trim().length ?? 0) === 0
                || (rebuildIntent?.reason.trim().length ?? 0) < 2}
              onClick={() => void submitRebuild()}
              variant="primary"
            >{rebuilding ? "提交中" : "提交重建任务"}</ActionButton>
          </>
        )}
        onClose={() => setRebuildIntent(null)}
        open={rebuildIntent !== null}
        title="从受影响期重建遗漏"
        width="wide"
      >
        {rebuildIntent === null ? null : (
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>最早受影响期号</span>
              <input
                maxLength={32}
                onChange={(event) => setRebuildIntent((value) => value === null ? null : ({ ...value, fromIssueCode: event.target.value }))}
                placeholder="输入已登记的真实期号"
                value={rebuildIntent.fromIssueCode}
              />
              <small>系统从该期开始创建影子投影，不修改当前可读快照。</small>
            </label>
            <label className={styles.field}>
              <span>当前开奖集合哈希</span>
              <input readOnly value={rebuildIntent.health.drawVersionSetHash ?? "未就绪"} />
              <small>提交时原样发送；集合变化会返回版本冲突。</small>
            </label>
            <label className={`${styles.field} ${styles.span2}`}>
              <span>重建原因</span>
              <textarea
                maxLength={500}
                onChange={(event) => setRebuildIntent((value) => value === null ? null : ({ ...value, reason: event.target.value }))}
                placeholder="说明缺期补齐、开奖更正或其他已确认原因"
                value={rebuildIntent.reason}
              />
            </label>
            <div className={styles.span2}>
              <InlineNotice title="提交结果" tone="warning">
                提交成功仅代表后台任务已持久化受理；一致性校验通过并完成原子切换后，新投影版本才生效。
              </InlineNotice>
            </div>
            {rebuildError === null ? null : <p className={`${styles.feedback} ${styles.span2}`} role="alert">{rebuildError}</p>}
          </div>
        )}
      </Dialog>

      <Dialog
        description={ackIntent === null
          ? undefined
          : `${lotteryName(snapshot?.catalog ?? null, lotteryId)} · 缺在 ${ackIntent.gap.beforeIssueCode} 与 ${ackIntent.gap.afterIssueCode} 之间`}
        footer={(
          <>
            <ActionButton disabled={ackBusy} onClick={() => setAckIntent(null)}>取消</ActionButton>
            <ActionButton
              disabled={ackBusy || (ackIntent?.reason.trim().length ?? 0) < 2}
              onClick={() => void submitAcknowledge()}
              variant="primary"
            >{ackBusy ? "提交中" : "确认接受该缺口"}</ActionButton>
          </>
        )}
        onClose={() => setAckIntent(null)}
        open={ackIntent !== null}
        title="确认接受已知缺口"
      >
        {ackIntent === null ? null : (
          <div className={styles.formGrid}>
            <div className={styles.span2}>
              <InlineNotice title="确认不会改动任何开奖或遗漏事实" tone="warning">
                这处缺口仍然保留在投影里、仍然在「缺失区间」中如实计数，遗漏统计的连续性判断也不变。
                确认只表示已经人工核实为源侧不可得、接受它继续存在，因此不再把彩种判为降级。
                缺口补齐后确认自动失效；同一彩种出现新的缺口时依然会重新告警。
              </InlineNotice>
            </div>
            <label className={`${styles.field} ${styles.span2}`}>
              <span>确认原因</span>
              <textarea
                maxLength={500}
                onChange={(event) => setAckIntent((value) => value === null
                  ? null
                  : ({ ...value, reason: event.target.value }))}
                placeholder="说明为什么这些期在源侧取不到，例如：官方接口只提供近 N 期，早于该范围的历史无法补齐"
                value={ackIntent.reason}
              />
            </label>
            {ackError === null ? null : <p className={`${styles.feedback} ${styles.span2}`} role="alert">{ackError}</p>}
          </div>
        )}
      </Dialog>
    </>
  );
}

function gapPanelTitle(gaps: OmissionGapPage | null): string {
  if (gaps === null) {
    return "已知缺口";
  }
  if (gaps.gapCount === 0) {
    return "已知缺口（无）";
  }
  return `已知缺口（${gaps.gapCount} 处，已确认 ${gaps.acknowledgedGapCount} 处）`;
}

function formatMoment(value: string | null): string {
  if (value === null) {
    return "—";
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("zh-CN");
}

function healthMetrics(page: DataHealthPage) {
  const ready = page.items.filter((item) => item.status === "READY").length;
  const gapCount = page.items.reduce((sum, item) => sum + item.gapCount, 0);
  const acknowledged = page.items.reduce((sum, item) => sum + item.acknowledgedGapCount, 0);
  const openGaps = Math.max(0, gapCount - acknowledged);
  const pending = page.items.reduce((sum, item) => sum + item.pendingTaskCount, 0);
  const unavailable = page.items.filter((item) => item.status === "UNAVAILABLE").length;
  return [
    { label: "健康彩种", value: `${ready} / ${page.items.length}`, detail: "投影、来源和水位均可用", tone: ready === page.items.length ? "good" as const : "warning" as const },
    {
      label: "缺失区间",
      value: String(gapCount),
      // 缺口总数照实显示；已确认部分单独说明，不从总数里扣掉。
      detail: acknowledged === 0
        ? "服务端确认的缺口总数"
        : `其中 ${acknowledged} 处已确认为源侧不可得，${openGaps} 处待处理`,
      tone: openGaps === 0 ? "good" as const : "danger" as const,
    },
    { label: "进行中任务", value: String(pending), detail: "包含重建及关联彩票任务", tone: pending === 0 ? "default" as const : "warning" as const },
    { label: "不可用彩种", value: String(unavailable), detail: "没有可信快照或批准来源", tone: unavailable === 0 ? "good" as const : "danger" as const },
  ];
}

function watermarkLabel(health: DataHealthItem): string {
  if (health.latestConfirmedIssue === null || health.omissionGeneration === null) {
    return "无可信连续水位";
  }
  if (health.gapCount === 0 && !health.trailingGap) {
    return `连续至 ${health.latestConfirmedIssue}`;
  }
  // 确认只改健康判定，不改连续性事实——缺口照样阻断连续水位。
  return health.gapCount > 0 && health.gapCount === health.acknowledgedGapCount
    ? "被已确认接受的缺口阻断"
    : "被已确认缺口阻断";
}

function gapLabel(health: DataHealthItem): string {
  if (health.gapCount === 0) {
    return "无已知缺口";
  }
  const trailing = health.trailingGap ? "（含尾部缺口）" : "";
  return health.acknowledgedGapCount === 0
    ? `${health.gapCount} 个区间${trailing}`
    : `${health.gapCount} 个区间${trailing}，已确认 ${health.acknowledgedGapCount} 个`;
}

function healthStatusLabel(value: DataHealthItem["status"]): string {
  return {
    READY: "健康",
    DEGRADED: "降级",
    UNAVAILABLE: "不可用",
  }[value];
}

function lotteryName(catalog: AdminCatalog | null, lotteryId: string): string {
  return catalog?.lotteries.find((item) => item.id === lotteryId)?.name ?? lotteryId;
}
