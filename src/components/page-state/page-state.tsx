import type { ReactNode } from "react";
import styles from "./page-state.module.css";

export type PageStateKind =
  | "loading"
  | "empty"
  | "error"
  | "forbidden"
  | "not-ready";

interface PageStateProps {
  kind: PageStateKind;
  title?: string | undefined;
  description?: string | undefined;
  action?: ReactNode;
}

const copy: Readonly<Record<PageStateKind, { title: string; description: string }>> = {
  loading: { title: "正在加载", description: "正在获取当前范围内的数据。" },
  empty: { title: "暂无数据", description: "当前筛选范围没有可显示的记录。" },
  error: {
    title: "加载失败",
    description: "请保留筛选条件后重试；未知提交结果先查询原任务。",
  },
  forbidden: {
    title: "无权查看",
    description: "当前员工权限或站点范围不包含此内容。",
  },
  "not-ready": {
    title: "规则尚未就绪",
    description: "正式规则、来源或业务准入完成后才能执行此操作。",
  },
};

export function PageState({ kind, title, description, action }: PageStateProps) {
  const preset = copy[kind];
  return (
    <section
      className={styles.root}
      data-kind={kind}
      role={kind === "error" ? "alert" : "status"}
    >
      <span className={styles.marker} aria-hidden="true" />
      <div className={styles.copy}>
        <h2>{title ?? preset.title}</h2>
        <p>{description ?? preset.description}</p>
      </div>
      {action === undefined ? null : <div className={styles.action}>{action}</div>}
    </section>
  );
}
