import { isTaskTerminal } from "@piao777/api-client";
import styles from "./task-status.module.css";

interface TaskStatusProps {
  status: string;
  progress: number;
  resultCode?: string | null | undefined;
  failureCode?: string | null | undefined;
}

const descriptions: Readonly<Record<string, { label: string; detail: string }>> = {
  PENDING: { label: "已受理", detail: "任务已持久化，等待可信作业执行。" },
  RUNNING: { label: "处理中", detail: "任务正在执行，进度不代表资产已经入账。" },
  RETRY_WAIT: { label: "等待重试", detail: "系统将继续原任务，不会复制业务义务。" },
  SUCCEEDED: { label: "任务完成", detail: "最终业务结果以服务端回执和对账事实为准。" },
  FAILED: { label: "任务失败", detail: "任务已停止，请依据失败码进入对应处理流程。" },
  CANCELLED: { label: "任务已取消", detail: "该任务不会继续执行。" },
};

export function TaskStatus({
  status,
  progress,
  resultCode,
  failureCode,
}: TaskStatusProps) {
  const copy = descriptions[status] ?? {
    label: "状态待支持",
    detail: "服务端返回了当前界面尚未识别的任务状态。",
  };
  const percentage = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const code = failureCode ?? resultCode;
  return (
    <section className={styles.root} data-status={status} aria-live="polite">
      <div className={styles.heading}>
        <strong>{copy.label}</strong>
        <span>{percentage}%</span>
      </div>
      <progress max={100} value={percentage} aria-label={`任务进度 ${percentage}%`} />
      <p>{copy.detail}</p>
      {code === null || code === undefined ? null : <code>{code}</code>}
      {isTaskTerminal(status) ? null : <small>离开页面不会取消已受理任务。</small>}
    </section>
  );
}
