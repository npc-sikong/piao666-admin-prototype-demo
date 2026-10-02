"use client";

import { useEffect, useId, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./admin-workspace.module.css";

interface PageHeaderProps {
  pageId: string;
  title: string;
  description: string;
  actions?: ReactNode;
  meta?: ReactNode;
}

interface MetricItem {
  label: string;
  value: string;
  detail?: string | undefined;
  tone?: "default" | "good" | "warning" | "danger";
}

interface PanelProps {
  title: string;
  description?: string | undefined;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
}

interface DialogProps {
  open: boolean;
  title: string;
  description?: string | undefined;
  children: ReactNode;
  footer?: ReactNode;
  onClose(): void;
  width?: "medium" | "wide";
}

interface TabItem<T extends string> {
  id: T;
  label: string;
  count?: number | undefined;
}

interface TabsProps<T extends string> {
  items: readonly TabItem<T>[];
  value: T;
  onChange(value: T): void;
  label: string;
}

interface NoticeProps {
  title?: string;
  children: ReactNode;
  tone?: "info" | "warning" | "danger" | "success";
}

export function PageHeader({ pageId, title, description, actions, meta }: PageHeaderProps) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageTitle}>
        <span>{pageId}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        {meta === undefined ? null : <div className={styles.pageMeta}>{meta}</div>}
      </div>
      {actions === undefined ? null : <div className={styles.pageActions}>{actions}</div>}
    </header>
  );
}

export function MetricStrip({ items }: Readonly<{ items: readonly MetricItem[] }>) {
  return (
    <section className={styles.metricStrip} aria-label="关键指标">
      {items.map((item) => (
        <div className={styles.metric} data-tone={item.tone ?? "default"} key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.detail === undefined ? null : <small>{item.detail}</small>}
        </div>
      ))}
    </section>
  );
}

export function Panel({ title, description, actions, children, flush = false }: PanelProps) {
  return (
    <section className={styles.panel} data-flush={flush || undefined}>
      <header className={styles.panelHeader}>
        <div>
          <h2>{title}</h2>
          {description === undefined ? null : <p>{description}</p>}
        </div>
        {actions === undefined ? null : <div className={styles.panelActions}>{actions}</div>}
      </header>
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}

export function ActionButton({
  className,
  type = "button",
  variant = "secondary",
  ...buttonProps
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "quiet";
}) {
  const classes = className === undefined
    ? styles.button
    : `${styles.button} ${className}`;
  return <button className={classes} data-variant={variant} type={type} {...buttonProps} />;
}

export function StatusBadge({ status, label }: Readonly<{ status: string; label?: string }>) {
  return (
    <span className={styles.status} data-tone={statusTone(status)}>
      <i aria-hidden="true" />
      {label ?? status}
    </span>
  );
}

export function Tabs<T extends string>({ items, value, onChange, label }: TabsProps<T>) {
  return (
    <div className={styles.tabs} aria-label={label} role="tablist">
      {items.map((item) => (
        <button
          aria-selected={item.id === value}
          data-active={item.id === value || undefined}
          key={item.id}
          onClick={() => onChange(item.id)}
          role="tab"
          type="button"
        >
          {item.label}
          {item.count === undefined ? null : <span>{item.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function InlineNotice({ title, children, tone = "info" }: NoticeProps) {
  return (
    <aside className={styles.notice} data-tone={tone}>
      <span aria-hidden="true" />
      <div>
        {title === undefined ? null : <strong>{title}</strong>}
        <p>{children}</p>
      </div>
    </aside>
  );
}

export function Dialog({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  width = "medium",
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }
  return createPortal(
    <div className={styles.dialogBackdrop} onMouseDown={(event) => {
      if (event.currentTarget === event.target) {
        onClose();
      }
    }}>
      <section
        aria-describedby={description === undefined ? undefined : descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className={styles.dialog}
        data-width={width}
        role="dialog"
      >
        <header className={styles.dialogHeader}>
          <div>
            <h2 id={titleId}>{title}</h2>
            {description === undefined ? null : <p id={descriptionId}>{description}</p>}
          </div>
          <button aria-label="关闭弹窗" onClick={onClose} type="button">×</button>
        </header>
        <div className={styles.dialogBody}>{children}</div>
        {footer === undefined ? null : <footer className={styles.dialogFooter}>{footer}</footer>}
      </section>
    </div>,
    document.body,
  );
}

export function DataTimestamp({ value }: Readonly<{ value: string | null }>) {
  return (
    <span className={styles.timestamp}>
      数据截至 {value === null ? "未提供" : formatDateTime(value)}
    </span>
  );
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function statusTone(status: string): string {
  if (["READY", "APPROVED", "SUCCEEDED", "CONFIRMED", "DRAWN", "OPEN"].includes(status)) {
    return "good";
  }
  if (["REJECTED", "FAILED", "CONFLICT", "CANCELLED", "UNAVAILABLE"].includes(status)) {
    return "danger";
  }
  if (["DEGRADED", "PENDING_REVIEW", "PENDING", "RUNNING", "RETRY_WAIT", "CLOSED"].includes(status)) {
    return "warning";
  }
  return "neutral";
}
