"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionButton,
  Dialog,
  InlineNotice,
  PageHeader,
  Panel,
  StatusBadge,
  formatDateTime,
} from "@/components/admin-workspace/admin-workspace";
import { PageState } from "@/components/page-state/page-state";
import { TaskStatus } from "@/components/task-status/task-status";
import { useAdminSession } from "@/session/admin-session";
import {
  apiErrorMessage,
  fetchDraw,
  getAdminCatalog,
  listDataSources,
  listIssues,
  newIntentKey,
  shanghaiDayEnd,
  shanghaiDayStart,
} from "./operations-api";
import type {
  AdminCatalog,
  AdminIssue,
  AdminIssuePage,
  SourceHealthPage,
} from "./operations-models";
import styles from "./operations-pages.module.css";
import { useAdminTask } from "./use-admin-task";

interface IssueFilters {
  issueCode: string;
  drawFrom: string;
  drawTo: string;
}

interface FetchIntent {
  issue: AdminIssue;
  sourceId: string;
  reason: string;
  key: string;
}

export function IssuesPage() {
  const session = useAdminSession();
  const permissions = session.identity?.permissions ?? [];
  const canView = permissions.includes("lottery:data:view");
  const canFetch = permissions.includes("draw:fetch");
  const [catalog, setCatalog] = useState<AdminCatalog | null>(null);
  const [sources, setSources] = useState<SourceHealthPage | null>(null);
  const [lotteryId, setLotteryId] = useState("");
  const [filters, setFilters] = useState<IssueFilters>({ issueCode: "", drawFrom: "", drawTo: "" });
  const [applied, setApplied] = useState<IssueFilters>({ issueCode: "", drawFrom: "", drawTo: "" });
  const [issues, setIssues] = useState<AdminIssuePage | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const [error, setError] = useState<string | null>(null);
  const [fetchIntent, setFetchIntent] = useState<FetchIntent | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const task = useAdminTask();

  const loadBase = useCallback(async () => {
    if (!canView && !canFetch) {
      setStatus("forbidden");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const [catalogResult, sourceResult] = await Promise.all([
        getAdminCatalog(),
        canFetch || canView ? listDataSources() : Promise.resolve(null),
      ]);
      setCatalog(catalogResult);
      setSources(sourceResult);
      setLotteryId((current) => current || catalogResult.lotteries[0]?.id || "");
    } catch (cause) {
      setError(apiErrorMessage(cause));
      setStatus("error");
    }
  }, [canFetch, canView]);

  const loadIssues = useCallback(async () => {
    if (lotteryId === "") {
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const query = {
        ...(applied.issueCode.trim() === "" ? {} : { issueCode: applied.issueCode.trim() }),
        ...(applied.drawFrom === "" ? {} : { drawFrom: shanghaiDayStart(applied.drawFrom) }),
        ...(applied.drawTo === "" ? {} : { drawTo: shanghaiDayEnd(applied.drawTo) }),
        limit: 100,
      };
      setIssues(await listIssues(lotteryId, query));
      setStatus("ready");
    } catch (cause) {
      setError(apiErrorMessage(cause));
      setStatus("error");
    }
  }, [applied, lotteryId]);

  useEffect(() => {
    if (session.status === "authenticated") {
      void loadBase();
    }
  }, [loadBase, session.status]);

  useEffect(() => {
    if (catalog !== null && lotteryId !== "") {
      void loadIssues();
    }
  }, [catalog, loadIssues, lotteryId]);

  const selectedLottery = catalog?.lotteries.find((item) => item.id === lotteryId) ?? null;
  const approvedSources = useMemo(() => (
    sources?.items.filter((source) => (
      source.status === "APPROVED" && source.lotteryIds.includes(lotteryId)
    )) ?? []
  ), [lotteryId, sources?.items]);

  function openFetch(issue: AdminIssue) {
    setFetchError(null);
    setFetchIntent({
      issue,
      sourceId: approvedSources[0]?.id ?? "",
      reason: "",
      key: newIntentKey("fetchDraw"),
    });
  }

  async function submitFetch() {
    if (fetchIntent === null) {
      return;
    }
    setFetching(true);
    setFetchError(null);
    try {
      const accepted = await fetchDraw({
        lotteryId: fetchIntent.issue.lotteryId,
        issueCode: fetchIntent.issue.issueCode,
        approvedSourceId: fetchIntent.sourceId,
        reason: fetchIntent.reason.trim(),
        idempotencyKey: fetchIntent.key,
      });
      task.start(accepted);
      setFetchIntent(null);
    } catch (cause) {
      setFetchError(apiErrorMessage(cause));
    } finally {
      setFetching(false);
    }
  }

  return (
    <>
      <PageHeader
        actions={<ActionButton onClick={() => void loadIssues()}>刷新期次</ActionButton>}
        description="查看真实期号、销售窗口参考、平台截止和预计开奖；不能编辑官方期号或提前标记开奖完成。"
        pageId="A03"
        title="期次与日历"
      />

      {catalog !== null ? (
        <Panel description="先选择彩票，再按期号或预计开奖日期筛选。" title="期次范围">
          <div className={styles.selectorStrip}>
            {catalog.lotteries.map((lottery) => (
              <button
                data-active={lotteryId === lottery.id || undefined}
                key={lottery.id}
                onClick={() => setLotteryId(lottery.id)}
                type="button"
              >
                <strong>{lottery.name}</strong>
                <small>最新确认期 {lottery.latestIssueCode ?? "无"}</small>
              </button>
            ))}
          </div>
          <form className={styles.filterBar} onSubmit={(event) => {
            event.preventDefault();
            setApplied({ ...filters });
          }}>
            <label className={styles.field} data-grow="true">
              <span>期号</span>
              <input
                onChange={(event) => setFilters((value) => ({ ...value, issueCode: event.target.value }))}
                placeholder="精确期号；留空查看全部"
                value={filters.issueCode}
              />
            </label>
            <label className={styles.field}>
              <span>开奖开始日</span>
              <input onChange={(event) => setFilters((value) => ({ ...value, drawFrom: event.target.value }))} type="date" value={filters.drawFrom} />
            </label>
            <label className={styles.field}>
              <span>开奖结束日</span>
              <input onChange={(event) => setFilters((value) => ({ ...value, drawTo: event.target.value }))} type="date" value={filters.drawTo} />
            </label>
            <ActionButton type="submit" variant="primary">查询</ActionButton>
            <ActionButton onClick={() => {
              const empty = { issueCode: "", drawFrom: "", drawTo: "" };
              setFilters(empty);
              setApplied(empty);
            }}>重置</ActionButton>
          </form>
        </Panel>
      ) : null}

      {approvedSources.length === 0 && status === "ready" ? (
        <InlineNotice title="当前彩票没有已批准的开奖来源" tone="warning">
          可以继续查看期次；自动获取开奖保持不可用，不能用未批准来源或随机数据替代。
        </InlineNotice>
      ) : null}

      {status === "loading" ? <PageState kind="loading" title="正在读取期次" /> : null}
      {status === "forbidden" ? <PageState kind="forbidden" description="当前员工没有彩票数据或开奖获取权限。" /> : null}
      {status === "error" ? (
        <PageState action={<ActionButton onClick={() => void loadIssues()}>重试</ActionButton>} description={error ?? "期次读取失败。"} kind="error" />
      ) : null}

      {status === "ready" && issues !== null ? (
        <Panel
          actions={<span className={styles.muted}>{selectedLottery?.name ?? lotteryId} · {issues.items.length} 条</span>}
          description="自动获取只形成后台任务和来源候选，任务完成前不会确认开奖。"
          flush
          title="期次列表"
        >
          <div className={styles.tableWrap}>
            <table className={styles.table} data-wide="true">
              <thead><tr><th>期号</th><th>状态</th><th>开放时间</th><th>平台截止</th><th>预计开奖</th><th>记录版本</th><th>操作</th></tr></thead>
              <tbody>
                {issues.items.length === 0 ? <tr><td className={styles.emptyCell} colSpan={7}>当前筛选范围没有期次</td></tr> : issues.items.map((issue) => (
                  <tr key={issue.id}>
                    <td><span className={styles.entity}><strong>{issue.officialIssueCode}</strong><small>{issue.id}</small></span></td>
                    <td><StatusBadge label={issueStatusLabel(issue.status)} status={issue.status} /></td>
                    <td>{issue.openAt === null ? "未提供" : formatDateTime(issue.openAt)}</td>
                    <td>{issue.cutoffAt ? formatDateTime(issue.cutoffAt) : "历史数据未提供"}</td>
                    <td>{issue.drawAt ? formatDateTime(issue.drawAt) : `${issue.drawDate}（仅日期）`}</td>
                    <td><code className={styles.mono}>v{issue.version}</code></td>
                    <td>
                      <div className={styles.tableActions}>
                        <button
                          className={styles.textButton}
                          disabled={!canFetch || approvedSources.length === 0 || issue.status === "CANCELLED"}
                          onClick={() => openFetch(issue)}
                          type="button"
                        >自动获取开奖</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {task.accepted === null ? null : (
        <Panel
          actions={<button className={styles.textButton} onClick={task.clear} type="button">收起</button>}
          description={`任务号 ${task.accepted.taskId}`}
          title="开奖获取任务"
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
        description={fetchIntent === null ? undefined : `${selectedLottery?.name ?? "彩票"} · ${fetchIntent.issue.issueCode}`}
        footer={(
          <>
            <ActionButton disabled={fetching} onClick={() => setFetchIntent(null)}>取消</ActionButton>
            <ActionButton
              disabled={fetching || fetchIntent?.sourceId === "" || (fetchIntent?.reason.trim().length ?? 0) < 2}
              onClick={() => void submitFetch()}
              variant="primary"
            >{fetching ? "提交中" : "提交获取任务"}</ActionButton>
          </>
        )}
        onClose={() => setFetchIntent(null)}
        open={fetchIntent !== null}
        title="从批准来源获取开奖"
      >
        {fetchIntent === null ? null : (
          <div className={styles.formGrid}>
            <label className={`${styles.field} ${styles.span2}`}>
              <span>批准来源</span>
              <select value={fetchIntent.sourceId} onChange={(event) => setFetchIntent((value) => value === null ? null : ({ ...value, sourceId: event.target.value }))}>
                {approvedSources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
              </select>
            </label>
            <label className={`${styles.field} ${styles.span2}`}>
              <span>获取原因</span>
              <textarea
                maxLength={500}
                onChange={(event) => setFetchIntent((value) => value === null ? null : ({ ...value, reason: event.target.value }))}
                placeholder="说明为何需要重新获取或补采"
                value={fetchIntent.reason}
              />
              <small>提交后仅表示任务已持久化受理，不代表开奖已确认。</small>
            </label>
            {fetchError === null ? null : <p className={`${styles.feedback} ${styles.span2}`} role="alert">{fetchError}</p>}
          </div>
        )}
      </Dialog>
    </>
  );
}

function issueStatusLabel(value: AdminIssue["status"]): string {
  return {
    SCHEDULED: "已排期",
    OPEN: "参与开放",
    CLOSED: "已截止",
    CANCELLED: "已取消",
    DRAWN: "已开奖",
  }[value];
}
