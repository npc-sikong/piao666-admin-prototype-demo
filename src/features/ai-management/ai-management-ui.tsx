import { formatPoints, netReturnRateText, subtractPoints } from "@piao777/api-client";
import Link from "next/link";
import type { ReactNode } from "react";
import { ActionButton, InlineNotice, StatusBadge } from "@/components/admin-workspace/admin-workspace";
import { PageState } from "@/components/page-state/page-state";
import { TaskStatus as TaskStatusView } from "@/components/task-status/task-status";
import type { ErrorView } from "./ai-management-api";
import type {
  PoolStatus,
  ProjectStatus,
  Selection,
  TaskAccepted,
  TaskStatus,
} from "./ai-management-models";
import styles from "./ai-management.module.css";

const dateTime = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function ErrorState({
  error,
  onRetry,
}: Readonly<{ error: ErrorView; onRetry?: () => void }>) {
  const kind = error.kind === "forbidden"
    ? "forbidden"
    : error.kind === "not-ready"
      ? "not-ready"
      : "error";
  return (
    <PageState
      action={onRetry === undefined ? undefined : <ActionButton onClick={onRetry}>重新加载</ActionButton>}
      description={error.message}
      kind={kind}
      title={error.kind === "stale" ? "版本已失效" : undefined}
    />
  );
}

export function TaskReceipt({
  accepted,
  status,
  error,
}: Readonly<{
  accepted: TaskAccepted | null;
  status: TaskStatus | null;
  error: string | null;
}>) {
  if (accepted === null) return null;
  return (
    <div className={styles.taskStack}>
      <InlineNotice title="任务已受理" tone="info">
        任务号 {accepted.taskId}。受理不代表结算、发放或导出已经完成。
      </InlineNotice>
      {status === null ? (
        <div className={styles.taskPending}>等待服务端返回任务进度…</div>
      ) : (
        <TaskStatusView
          failureCode={status.failureCode}
          progress={status.progress}
          resultCode={status.resultCode}
          status={status.status}
        />
      )}
      {error === null ? null : <InlineNotice tone="danger">{error}</InlineNotice>}
    </div>
  );
}

export function Breadcrumbs({
  poolIssueId,
  current,
}: Readonly<{ poolIssueId?: string | undefined; current: string }>) {
  return (
    <nav aria-label="AI合买路径" className={styles.breadcrumbs}>
      <Link href="/ai-pools">AI项目</Link>
      {poolIssueId === undefined ? null : (
        <>
          <span>/</span>
          <Link href={`/ai-pools/${encodeURIComponent(poolIssueId)}`}>期次详情</Link>
        </>
      )}
      <span>/</span>
      <strong>{current}</strong>
    </nav>
  );
}

export function DefinitionList({ children }: Readonly<{ children: ReactNode }>) {
  return <dl className={styles.definitionList}>{children}</dl>;
}

export function Definition({ label, value }: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function ProjectStatusBadge({ status }: Readonly<{ status: ProjectStatus }>) {
  return <StatusBadge label={status === "ENABLED" ? "启用" : "停用"} status={status} />;
}

export function PoolStatusBadge({ status }: Readonly<{ status: PoolStatus }>) {
  return <StatusBadge label={poolStatusLabel(status)} status={status} />;
}

export function poolStatusLabel(status: PoolStatus): string {
  const labels: Readonly<Record<PoolStatus, string>> = {
    OPEN: "认购中",
    CUTOFF_PENDING: "截止处理中",
    LOCKED: "已锁定",
    DRAW_PENDING: "待开奖",
    ALLOCATION_PENDING: "待分配",
    DISCLOSED: "已公示",
    DISTRIBUTING: "发放中",
    SETTLED: "已结算",
    CANCELLING: "取消处理中",
    CANCELLED: "已取消",
    CORRECTING: "更正处理中",
    CORRECTED: "已更正",
    EXCEPTION_PENDING: "异常待处理",
    NO_PARTICIPATION: "无人参与",
  };
  return labels[status];
}

export function formatDateTime(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateTime.format(parsed);
}

export function formatRate(value: string | null): string {
  if (value === null) return "—";
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? new Intl.NumberFormat("zh-CN", { style: "percent", maximumFractionDigits: 4 }).format(parsed)
    : value;
}

export function formatBps(value: number): string {
  return `${new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(value / 100)}%`;
}

export function formatAiPoints(value: string | null): string {
  return value === null ? "待开奖" : formatPoints(value);
}

/**
 * 两个积分金额相减，按最小单位（0.01积分）做整数运算。
 *
 * <p>资产金额一律不经过浮点数：先把 "22000.00" 这类两位小数字符串转成 BigInt 最小单位，
 * 相减后再还原。任一侧格式不符合预期时返回 null，由调用方按"未知"显示，
 * 不做猜测性回退。</p>
 */
export function subtractAiPoints(left: string | null, right: string | null): string | null {
  return subtractPoints(left, right);
}

/**
 * 本期实际净收益率 =（总返还 − 总投入）÷ 总投入，按最小单位做 BigInt 整数运算。
 *
 * <p>总返还为空表示尚未结算，返回 null 由调用方显示「待开奖」；
 * 收益率为 0 是有效结果，照常显示 0%，不拿目标收益率顶替。</p>
 */
export function actualNetReturnRateText(
  totalPurchasePoints: string,
  totalWinningPoints: string | null,
): string | null {
  return netReturnRateText(totalPurchasePoints, totalWinningPoints);
}

export function formatSelection(selection: Selection): string {
  return selection.areas.map((area) => {
    if (area.chosen.length > 0) return `${area.key} ${area.chosen.map(numberText).join(" ")}`;
    const dan = area.dan.length === 0 ? "" : `胆 ${area.dan.map(numberText).join(" ")}`;
    const tuo = area.tuo.length === 0 ? "" : `拖 ${area.tuo.map(numberText).join(" ")}`;
    return `${area.key} ${[dan, tuo].filter(Boolean).join(" / ")}`;
  }).join(" · ");
}

export function shortHash(value: string): string {
  return value.length <= 16 ? value : `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function numberText(value: number): string {
  return String(value).padStart(2, "0");
}
