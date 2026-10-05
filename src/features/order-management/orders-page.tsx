"use client";
import { ChangeNotesButton } from "@/features/change-notes/change-notes";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ActionButton,
  InlineNotice,
  MetricStrip,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/admin-workspace/admin-workspace";
import { PageState } from "@/components/page-state/page-state";
import { useAdminSession } from "@/session/admin-session";
import {
  listAdminMemberOrders,
  listAdminOrders,
  orderFailure,
  type AdminOrderQuery,
  type OrderFailureKind,
} from "./order-api";
import type { AdminOrderPage, TaskAccepted } from "./order-models";
import { OrderRetryDialog } from "./order-retry-dialog";
import styles from "./order-management.module.css";

const orderStatusOptions = [
  "RESERVED",
  "LOCKED",
  "WAITING_DRAW",
  "SETTLING",
  "AWARD_PENDING_BUDGET",
  "SETTLED",
  "CANCELLING",
  "CANCELLED",
  "CORRECTING",
  "CORRECTED",
  "EXCEPTION_PENDING",
] as const;

interface Filters {
  mode: "all" | "member";
  memberId: string;
  lotteryId: string;
  issueCode: string;
  status: string;
}

const emptyFilters: Filters = {
  mode: "all",
  memberId: "",
  lotteryId: "",
  issueCode: "",
  status: "",
};

export function OrdersPage() {
  const session = useAdminSession();
  const permissions = session.identity?.permissions ?? [];
  const canView = permissions.includes("order:view");
  const canViewMember = permissions.includes("member:orders:view");
  const canRetry = permissions.includes("order:settlement:retry");
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState<AdminOrderPage | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | OrderFailureKind>("loading");
  const [error, setError] = useState<string | null>(null);
  const [retryOrderId, setRetryOrderId] = useState<string | null>(null);
  const [acceptedTask, setAcceptedTask] = useState<TaskAccepted | null>(null);

  const load = useCallback(async (cursor?: string) => {
    if (filters.mode === "all" && !canView) {
      setStatus("forbidden");
      return;
    }
    if (filters.mode === "member" && !canViewMember) {
      setError("当前员工没有授权会员订单读取权限。");
      setStatus("forbidden");
      return;
    }
    if (filters.mode === "member" && filters.memberId.trim() === "") {
      setError("按会员范围查询时必须填写会员 ID。");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const next = filters.mode === "member"
        ? await listAdminMemberOrders(filters.memberId.trim(), cursor)
        : await listAdminOrders(toQuery(filters, cursor));
      setPage(next);
      setStatus("ready");
    } catch (cause) {
      const failure = orderFailure(cause);
      setError(failure.message);
      setStatus(failure.kind);
    }
  }, [canView, canViewMember, filters]);

  useEffect(() => {
    if (session.status === "authenticated") {
      void load();
    }
  }, [load, session.status]);

  function applyFilters() {
    setAcceptedTask(null);
    setFilters({
      ...draft,
      memberId: draft.memberId.trim(),
      lotteryId: draft.lotteryId.trim(),
      issueCode: draft.issueCode.trim(),
    });
  }

  function resetFilters() {
    setDraft(emptyFilters);
    setFilters(emptyFilters);
    setAcceptedTask(null);
  }

  const items = page?.items ?? [];
  const pendingCount = items.filter((item) => !["SETTLED", "CANCELLED", "CORRECTED"].includes(item.status)).length;
  const exceptionCount = items.filter((item) => ["EXCEPTION_PENDING", "AWARD_PENDING_BUDGET"].includes(item.status)).length;

  return (
    <>
      <PageHeader
        actions={<><ActionButton onClick={() => void load()}>刷新订单</ActionButton><ChangeNotesButton module="orders" /></>}
        description="查询普通积分参与订单的不可变内容快照、冻结、开奖结算、退款与更正事实。"
        pageId="A22"
        title="普通参与订单(修改)"
      />

      <InlineNotice title="订单事实不可人工改写">
        页面不提供改号码、改中奖结果或直接改余额入口；恢复操作只继续原结算任务，最终结果以账本与服务端订单状态为准。
      </InlineNotice>

      <Panel description="按会员范围查询使用独立的对象授权接口；切换筛选会清空游标。" title="订单筛选">
        <form className={styles.filterBar} onSubmit={(event) => { event.preventDefault(); applyFilters(); }}>
          <label className={styles.field}>
            <span>查询范围</span>
            <select value={draft.mode} onChange={(event) => setDraft((current) => ({ ...current, mode: event.target.value as Filters["mode"] }))}>
              <option disabled={!canView} value="all">授权站点订单</option>
              <option disabled={!canViewMember} value="member">指定会员订单</option>
            </select>
          </label>
          <label className={styles.field} data-grow="true">
            <span>会员 ID</span>
            <input onChange={(event) => setDraft((current) => ({ ...current, memberId: event.target.value }))} placeholder="UUID" value={draft.memberId} />
          </label>
          {draft.mode === "all" ? (
            <>
              <label className={styles.field}>
                <span>彩票 ID</span>
                <input onChange={(event) => setDraft((current) => ({ ...current, lotteryId: event.target.value }))} value={draft.lotteryId} />
              </label>
              <label className={styles.field}>
                <span>期号</span>
                <input onChange={(event) => setDraft((current) => ({ ...current, issueCode: event.target.value }))} value={draft.issueCode} />
              </label>
              <label className={styles.field}>
                <span>订单状态</span>
                <select onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))} value={draft.status}>
                  <option value="">全部状态</option>
                  {orderStatusOptions.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}
                </select>
              </label>
            </>
          ) : null}
          <div className={styles.filterActions}>
            <ActionButton type="submit" variant="primary">查询</ActionButton>
            <ActionButton onClick={resetFilters}>重置</ActionButton>
          </div>
        </form>
      </Panel>

      {acceptedTask === null ? null : (
        <InlineNotice title={`恢复任务已受理 · ${acceptedTask.taskId}`} tone="success">
          当前状态 {acceptedTask.status}。202 仅表示任务已持久化受理，不代表返奖、退款或更正已经完成。
        </InlineNotice>
      )}

      {status === "loading" ? <PageState kind="loading" title="正在读取订单" /> : null}
      {status === "forbidden" ? <PageState description={error ?? "当前员工没有订单查看权限。"} kind="forbidden" /> : null}
      {status === "not-ready" ? <PageState description={error ?? undefined} kind="not-ready" /> : null}
      {status === "version" ? (
        <PageState action={<ActionButton onClick={() => void load()}>重新加载</ActionButton>} description={error ?? "订单版本已失效。"} kind="error" title="版本已失效" />
      ) : null}
      {status === "error" ? (
        <PageState action={<ActionButton onClick={() => void load()}>重试</ActionButton>} description={error ?? undefined} kind="error" />
      ) : null}

      {status === "ready" && page !== null ? (
        <>
          <MetricStrip items={[
            { label: "当前页订单", value: String(items.length), detail: "仅当前游标页" },
            { label: "未终态", value: String(pendingCount), detail: "不等于异常" },
            { label: "异常/预算待处理", value: String(exceptionCount), detail: "按当前页状态", tone: exceptionCount > 0 ? "warning" : "good" },
            { label: "查询快照", value: page.snapshotId === null ? "未提供" : "已固定", detail: page.snapshotId ?? "服务端未返回快照 ID" },
          ]} />
          {items.length === 0 ? <PageState kind="empty" title="当前筛选没有订单" /> : (
            <Panel description="所有积分字段单位均为积分；应返为空表示仍未形成可信结算结果，不按 0 展示。" flush title="订单列表">
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>订单 / 创建时间</th>
                      <th>彩票 / 玩法 / 期号</th>
                      <th>状态</th>
                      <th>参与积分</th>
                      <th>应返 / 已净发</th>
                      <th>退款</th>
                      <th>结算版本</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((order) => (
                      <tr key={order.id}>
                        <td><div className={styles.entity}><strong>{order.id}</strong><small>{formatDateTime(order.createdAt)}</small></div></td>
                        <td><div className={styles.entity}><strong>{order.issueCode}</strong><small>{order.lotteryId} · {order.playId}</small></div></td>
                        <td><StatusBadge label={statusLabel(order.status)} status={order.status} /></td>
                        <td><strong className={styles.points}>{order.purchasePoints}</strong></td>
                        <td><div className={styles.entity}><strong>{order.dueAwardPoints ?? "待结算"}</strong><small>已净发 {order.netPostedAwardPoints}</small></div></td>
                        <td>{order.refundPoints}</td>
                        <td>{order.settlementVersion ?? "—"}</td>
                        <td><div className={styles.rowActions}>
                          <Link className={styles.textLink} href={`/orders/${encodeURIComponent(order.id)}`}>查看详情</Link>
                          <button
                            className={styles.textButton}
                            disabled={!canRetry || !retryable(order.status)}
                            onClick={() => setRetryOrderId(order.id)}
                            type="button"
                          >恢复结算</button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.pagination}>
                <span>{page.hasMore ? "还有下一页" : "已到当前筛选末页"}</span>
                <ActionButton disabled={!page.hasMore || page.nextCursor === null} onClick={() => void load(page.nextCursor ?? undefined)}>下一页</ActionButton>
              </div>
            </Panel>
          )}
        </>
      ) : null}

      <OrderRetryDialog
        onAccepted={setAcceptedTask}
        onClose={() => setRetryOrderId(null)}
        orderId={retryOrderId}
      />
    </>
  );
}

function toQuery(filters: Filters, cursor?: string): AdminOrderQuery {
  return {
    memberId: filters.memberId || undefined,
    lotteryId: filters.lotteryId || undefined,
    issueCode: filters.issueCode || undefined,
    status: filters.status || undefined,
    cursor,
  };
}

function retryable(status: string): boolean {
  return ["SETTLING", "AWARD_PENDING_BUDGET", "EXCEPTION_PENDING", "CORRECTING"].includes(status);
}

export function statusLabel(status: string): string {
  const labels: Readonly<Record<string, string>> = {
    RESERVED: "已冻结",
    LOCKED: "已锁定",
    WAITING_DRAW: "等待开奖",
    SETTLING: "结算中",
    AWARD_PENDING_BUDGET: "等待返奖预算",
    SETTLED: "已结算",
    CANCELLING: "退款处理中",
    CANCELLED: "已退款取消",
    CORRECTING: "更正中",
    CORRECTED: "已更正",
    EXCEPTION_PENDING: "异常待处理",
  };
  return labels[status] ?? status;
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
