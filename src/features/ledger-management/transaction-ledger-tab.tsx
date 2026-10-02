"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionButton, StatusBadge } from "@/components/admin-workspace/admin-workspace";
import { PageState } from "@/components/page-state/page-state";
import {
  ledgerFailure,
  listAdminLedgerTransactions,
  shanghaiRangeEndInclusive,
  shanghaiRangeStart,
  type AdminLedgerTransactionQuery,
  type LedgerFailureKind,
} from "./ledger-api";
import type {
  AdminLedgerEntry,
  AdminLedgerTransaction,
  AdminLedgerTransactionPage,
  LedgerAssetType,
  LedgerEntryDirection,
} from "./ledger-models";
import styles from "./ledger-management.module.css";

interface LedgerFilters {
  businessNumber: string;
  account: string;
  stationMaster: string;
  issueCode: string;
  assetType: "" | LedgerAssetType;
  direction: "" | LedgerEntryDirection;
  from: string;
  to: string;
}

export function TransactionLedgerTab({
  canView,
  refreshToken,
}: Readonly<{ canView: boolean; refreshToken: number }>) {
  const [draft, setDraft] = useState<LedgerFilters>(() => defaultFilters());
  const [applied, setApplied] = useState<LedgerFilters>(() => defaultFilters());
  const [page, setPage] = useState<AdminLedgerTransactionPage | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | LedgerFailureKind>("idle");
  const [error, setError] = useState<string | null>(null);

  // 结束日期选到"今天"时，shanghaiRangeEndInclusive 会把上界夹到**当前时刻**。
  // 后端的游标 scope 是对全部筛选值（含 from/to）取哈希算出来的，所以一旦每页都重新取一次
  // now，第二页的 scope 就和第一页不同，游标会被判成"不属于当前查询范围"，翻页报
  // INVALID_VALUE。这里对同一组已应用筛选只解析一次时间窗，翻页复用同一个值。
  const appliedRange = useMemo(() => ({
    from: applied.from ? shanghaiRangeStart(applied.from) : undefined,
    to: applied.to ? shanghaiRangeEndInclusive(applied.to) : undefined,
  }), [applied]);

  const load = useCallback(async (
    filters: LedgerFilters,
    range: ResolvedRange,
    cursor?: string,
    append = false,
  ) => {
    if (!canView) {
      setState("forbidden");
      return;
    }
    setState("loading");
    setError(null);
    try {
      const next = await listAdminLedgerTransactions(toQuery(filters, range, cursor));
      setPage((current) => append && current !== null
        ? { ...next, items: [...current.items, ...next.items] }
        : next);
      setState("ready");
    } catch (cause) {
      const failure = ledgerFailure(cause);
      setError(failure.message);
      setState(failure.kind);
    }
  }, [canView]);

  useEffect(() => {
    void load(applied, appliedRange);
  }, [applied, appliedRange, load, refreshToken]);

  if (!canView) {
    return <PageState description="需要 ledger:view 权限；服务端还会与员工授权站点范围取交集。" kind="forbidden" title="无全局账本查看权限" />;
  }

  return (
    <div className={styles.ledgerWorkspace}>
      <form
        className={styles.ledgerFilterRail}
        onSubmit={(event) => {
          event.preventDefault();
          setApplied(cleanFilters(draft));
        }}
      >
        <label className={styles.field}><span>业务号</span><input maxLength={180} onChange={(event) => setDraft((value) => ({ ...value, businessNumber: event.target.value }))} placeholder="交易 ID、业务键或来源号" value={draft.businessNumber} /></label>
        <label className={styles.field}><span>账号</span><input maxLength={100} onChange={(event) => setDraft((value) => ({ ...value, account: event.target.value }))} placeholder="登录账号、账户 ID 或主体 ID" value={draft.account} /></label>
        <label className={styles.field}><span>站长</span><input maxLength={100} onChange={(event) => setDraft((value) => ({ ...value, stationMaster: event.target.value }))} placeholder="编号、姓名、登录账号或 ID" value={draft.stationMaster} /></label>
        <label className={styles.field}><span>期次</span><input maxLength={32} onChange={(event) => setDraft((value) => ({ ...value, issueCode: event.target.value }))} placeholder="完整期号" value={draft.issueCode} /></label>
        <label className={styles.field}><span>资产类型</span><select onChange={(event) => setDraft((value) => ({ ...value, assetType: event.target.value as LedgerFilters["assetType"] }))} value={draft.assetType}><option value="">全部资产</option><option value="POINTS">积分</option></select></label>
        <label className={styles.field}><span>分录方向</span><select onChange={(event) => setDraft((value) => ({ ...value, direction: event.target.value as LedgerFilters["direction"] }))} value={draft.direction}><option value="">全部方向</option><option value="DEBIT">转出</option><option value="CREDIT">转入</option></select></label>
        <label className={styles.field}><span>开始日期</span><input onChange={(event) => setDraft((value) => ({ ...value, from: event.target.value }))} type="date" value={draft.from} /></label>
        <label className={styles.field}><span>结束日期（含）</span><input onChange={(event) => setDraft((value) => ({ ...value, to: event.target.value }))} type="date" value={draft.to} /></label>
        <div className={styles.filterActions}>
          <ActionButton type="submit" variant="primary">查询账本</ActionButton>
          <ActionButton onClick={() => { const next = defaultFilters(); setDraft(next); setApplied(next); }}>重置</ActionButton>
        </div>
      </form>

      <p className={styles.filterHint}>方向与账号组合时针对同一条分录；结果始终返回命中交易的全部分录，便于核对转出与转入是否成对守恒。</p>

      {state === "loading" && page === null ? <PageState kind="loading" title="正在读取双边账本" /> : null}
      {state === "forbidden" ? <PageState description={error ?? undefined} kind="forbidden" /> : null}
      {state === "not-ready" ? <PageState description={error ?? undefined} kind="not-ready" /> : null}
      {state === "version" || state === "error" ? <PageState action={<ActionButton onClick={() => void load(applied, appliedRange)}>重试</ActionButton>} description={error ?? undefined} kind="error" title={state === "version" ? "查询版本已失效" : undefined} /> : null}
      {page !== null && page.items.length === 0 && state === "ready" ? <PageState kind="empty" title="当前筛选没有账本交易" /> : null}
      {page !== null && page.items.length > 0 && (state === "ready" || state === "loading") ? (
        <div className={styles.transactionList}>
          {page.items.map((transaction) => <TransactionGroup key={transaction.id} value={transaction} />)}
          <div className={styles.pagination}>
            <span>{page.hasMore ? `已显示 ${page.items.length} 笔交易，仍有后续记录` : `已显示全部 ${page.items.length} 笔交易`}</span>
            <ActionButton disabled={!page.hasMore || page.nextCursor === null || state === "loading"} onClick={() => void load(applied, appliedRange, page.nextCursor ?? undefined, true)}>{state === "loading" ? "加载中" : "加载更多"}</ActionButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TransactionGroup({ value }: Readonly<{ value: AdminLedgerTransaction }>) {
  return (
    <article className={styles.transactionGroup}>
      <header className={styles.transactionHeader}>
        <div className={styles.transactionIdentity}>
          <span>#{value.sequence}</span>
          <strong>{value.businessNumber}</strong>
          <code>{value.id}</code>
        </div>
        <div className={styles.transactionBadges}>
          <StatusBadge label={transactionTypeLabel(value.type)} status={value.type} />
          <StatusBadge label={value.status === "POSTED" ? "已入账" : value.status} status={value.status} />
        </div>
      </header>
      <dl className={styles.transactionMeta}>
        <Meta label="发生时间" value={formatDateTime(value.createdAt)} />
        <Meta label="业务来源" value={`${value.sourceType} · ${value.sourceId}`} mono />
        <Meta label="期次" value={value.issueCode ?? "非期次业务"} />
        <Meta label="站长" value={stationMasterLabel(value)} />
        <Meta label="交易积分" value={`${value.economicPoints} 积分`} />
        <Meta label="已冲正" value={`${value.reversedPoints} 积分`} />
        <Meta label="操作主体" value={`${value.operatorRealm} · ${value.operatorId}`} mono />
        <Meta label="原因" value={value.reason} />
      </dl>
      <div className={styles.entryLedger}>
        {value.entries.map((entry) => <LedgerEntryRow key={entry.id} value={entry} />)}
      </div>
      {value.referenceTransactionId === null ? null : <p className={styles.referenceLine}>引用原交易 <code>{value.referenceTransactionId}</code></p>}
    </article>
  );
}

function LedgerEntryRow({ value }: Readonly<{ value: AdminLedgerEntry }>) {
  const owner = [value.ownerName, value.ownerAccount].filter(Boolean).join(" · ") || value.ownerId;
  return (
    <div className={styles.entryRow} data-direction={value.direction}>
      <div className={styles.entryDirection}><span>{value.direction === "DEBIT" ? "转出" : "转入"}</span><strong>{value.changePoints} 积分</strong></div>
      <div className={styles.entryOwner}><strong>{owner}</strong><span>{ownerTypeLabel(value.ownerType)} · {bucketLabel(value.bucket)}</span><code>{value.accountId}</code></div>
      <div className={styles.entryBalance}><span>余额变化</span><strong>{value.balanceBefore} → {value.balanceAfter}</strong></div>
    </div>
  );
}

function Meta({ label, value, mono = false }: Readonly<{ label: string; value: string; mono?: boolean }>) {
  return <div><dt>{label}</dt><dd className={mono ? styles.mono : undefined}>{value}</dd></div>;
}

interface ResolvedRange {
  from: string | undefined;
  to: string | undefined;
}

function toQuery(
  value: LedgerFilters,
  range: ResolvedRange,
  cursor?: string,
): AdminLedgerTransactionQuery {
  return {
    businessNumber: optional(value.businessNumber),
    account: optional(value.account),
    stationMaster: optional(value.stationMaster),
    issueCode: optional(value.issueCode),
    assetType: value.assetType || undefined,
    direction: value.direction || undefined,
    // 时间窗由调用方一次性解析后传入，翻页期间必须保持不变（见 appliedRange 的说明）。
    from: range.from,
    to: range.to,
    cursor,
  };
}

function cleanFilters(value: LedgerFilters): LedgerFilters {
  return {
    ...value,
    businessNumber: value.businessNumber.trim(),
    account: value.account.trim(),
    stationMaster: value.stationMaster.trim(),
    issueCode: value.issueCode.trim(),
  };
}

function defaultFilters(): LedgerFilters {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" });
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  return { businessNumber: "", account: "", stationMaster: "", issueCode: "", assetType: "POINTS", direction: "", from: formatter.format(weekAgo), to: formatter.format(now) };
}

function optional(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length === 0 ? undefined : normalized;
}

function stationMasterLabel(value: AdminLedgerTransaction): string {
  if (value.stationMasterId === null) return "全局平台交易";
  const identity = [value.stationMasterName, value.stationMasterCode].filter(Boolean).join(" · ");
  return identity || value.stationMasterId;
}

function transactionTypeLabel(value: string): string {
  return ({ PLATFORM_BUDGET_INITIALIZE: "预算初始化", PLATFORM_BUDGET_TOPUP: "预算追加", STATION_VIP_CREDIT: "站长加分", STATION_DEBIT: "站长扣分", ADMIN_GRANT: "平台拨付", ADMIN_DEDUCT: "平台扣回", ORDINARY_RESERVE: "普通参与冻结", ORDINARY_LOCK: "普通参与锁定", ORDINARY_AWARD: "普通返奖", ORDINARY_REFUND: "普通退款", AI_SUBSCRIPTION_ACCEPTED: "AI 认购", AI_POOL_LOCK: "AI 池锁定", AI_POOL_CONSUMED: "AI 池消费", AI_PAYOUT_POSTED: "AI 发放", REFERRAL_FIXED_REWARD: "固定推广奖励", REFERRAL_AI_SHARE: "AI 推广分红" } as Readonly<Record<string, string>>)[value] ?? value;
}

function ownerTypeLabel(value: string): string {
  return ({ MEMBER: "会员", STATION_MASTER: "站长", PLATFORM: "平台", ORDINARY_ORDER: "普通订单", AI_POOL: "AI 池", PAYOUT_BATCH: "发放批次", SYSTEM: "系统" } as Readonly<Record<string, string>>)[value] ?? value;
}

function bucketLabel(value: string): string {
  return ({ AVAILABLE: "可用", RESERVED: "冻结", DISPOSABLE: "可支配额度", DISTRIBUTION_BUDGET: "分配预算", ORDINARY_AWARD_BUDGET: "普通返奖预算", AI_BUDGET: "AI 预算", REFERRAL_BUDGET: "推广预算", PENDING_SETTLEMENT: "待结算", PAYOUT_ESCROW: "发放托管", CONSUMPTION: "已消费", CORRECTION_DIFFERENCE: "更正差额" } as Readonly<Record<string, string>>)[value] ?? value;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(date);
}
