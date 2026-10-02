"use client";

import { useState } from "react";
import { ActionButton, Dialog, InlineNotice } from "@/components/admin-workspace/admin-workspace";
import { adminApi } from "@/lib/api";
import { errorView, newIntent } from "./ai-management-api";
import type { AiPool } from "./ai-management-models";
import styles from "./ai-management.module.css";

interface Budget {
  poolIssueId: string;
  officialLimitPoints: string | null;
  rewardLimitPoints: string | null;
  usedOfficialPoints: string;
  version: string;
}
interface Write {
  items: {
    poolIssueId: string;
    officialLimitPoints: string;
    rewardLimitPoints: string;
    version: string;
  }[];
  reason: string;
}

function readBudgets(value: unknown): Budget[] {
  if (typeof value !== "object" || value === null || !("items" in value) || !Array.isArray(value.items)) {
    throw new TypeError("AI_BUDGET_RESPONSE_INVALID");
  }
  return value.items.map((item: unknown) => {
    if (typeof item !== "object" || item === null) throw new TypeError("AI_BUDGET_RESPONSE_INVALID");
    const row = item as Record<string, unknown>;
    if (typeof row.poolIssueId !== "string" || typeof row.version !== "string"
      || typeof row.usedOfficialPoints !== "string"
      || (row.officialLimitPoints !== null && typeof row.officialLimitPoints !== "string")
      || (row.rewardLimitPoints !== null && typeof row.rewardLimitPoints !== "string")) {
      throw new TypeError("AI_BUDGET_RESPONSE_INVALID");
    }
    return {
      poolIssueId: row.poolIssueId,
      version: row.version,
      usedOfficialPoints: row.usedOfficialPoints,
      officialLimitPoints: row.officialLimitPoints,
      rewardLimitPoints: row.rewardLimitPoints,
    };
  });
}

export function AiBudgetDialog({ pools }: Readonly<{ pools: readonly AiPool[] }>) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Budget[]>([]);
  const [officialValues, setOfficialValues] = useState<Record<string, string>>({});
  const [rewardValues, setRewardValues] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [uniformReward, setUniformReward] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [intent, setIntent] = useState<{ body: Write; key: string } | null>(null);

  async function load() {
    setOpen(true); setPending(true); setError(null); setSuccess(false); setRows([]); setIntent(null);
    try {
      const result = await adminApi.request<unknown>("/api/admin/v1/ai-pool-budgets", {
        query: { poolIssueIds: pools.map((pool) => pool.id).join(",") },
      });
      const budgets = readBudgets(result.data);
      setRows(budgets);
      setOfficialValues(Object.fromEntries(budgets.map((row) => [row.poolIssueId, row.officialLimitPoints ?? ""])));
      setRewardValues(Object.fromEntries(budgets.map((row) => [row.poolIssueId, row.rewardLimitPoints ?? ""])));
      setSelected(pools.filter((pool) => !["DISTRIBUTING", "SETTLED", "CANCELLING", "CANCELLED", "CORRECTED", "NO_PARTICIPATION"].includes(pool.status)).map((pool) => pool.id));
      setReason(""); setUniformReward("");
    } catch (cause) { setError(errorView(cause).message); }
    finally { setPending(false); }
  }

  async function save() {
    let current = intent;
    if (current === null) {
      if (!selected.length || reason.trim().length < 2) { setError("请选择期次并填写至少两个字的原因。"); return; }
      const items = rows.filter((row) => selected.includes(row.poolIssueId)).map((row) => ({
        poolIssueId: row.poolIssueId,
        officialLimitPoints: officialValues[row.poolIssueId] ?? "",
        rewardLimitPoints: rewardValues[row.poolIssueId] ?? "",
        version: row.version,
      }));
      if (items.some((row) => !/^(0|[1-9][0-9]{0,15})\.[0-9]{2}$/.test(row.officialLimitPoints)
        || !/^(0|[1-9][0-9]{0,15})\.[0-9]{2}$/.test(row.rewardLimitPoints))) {
        setError("平台投入与奖励预算均须输入非负、两位小数的积分，例如20000.00。"); return;
      }
      current = { body: { items, reason: reason.trim() }, key: newIntent("saveAiIssueBudgets") };
      setIntent(current);
    }
    setPending(true); setError(null); setSuccess(false);
    try {
      const result = await adminApi.request<unknown>("/api/admin/v1/ai-pool-budgets", {
        method: "PUT", body: current.body, idempotencyKey: current.key,
      });
      const saved = new Map(readBudgets(result.data).map((row) => [row.poolIssueId, row]));
      setRows((previous) => previous.map((row) => saved.get(row.poolIssueId) ?? row));
      setIntent(null); setSuccess(true);
    } catch (cause) {
      const view = errorView(cause);
      setError(view.message);
      if (view.kind !== "unknown-submit") setIntent(null);
    } finally { setPending(false); }
  }

  const locked = pending || intent !== null;
  return <>
    <ActionButton disabled={!pools.length} onClick={() => void load()}>设置期次资金上限</ActionButton>
    <Dialog open={open} onClose={() => { if (!locked) setOpen(false); }} title="期次资金上限 · 批量设置" width="wide"
      description="平台总投入在认购开始后锁定；奖励预算在发放或退款进入终态前仍可补充。设置上限不会增加平台账本余额。"
      footer={<><ActionButton disabled={locked} onClick={() => setOpen(false)}>关闭</ActionButton><ActionButton disabled={pending || !rows.length} onClick={() => void save()} variant="primary">{pending ? "处理中…" : intent ? "重试原提交" : "保存选中期次"}</ActionButton></>}>
      {pending && !rows.length ? <p>正在读取期次预算…</p> : null}
      {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}
      {success ? <InlineNotice tone="success">选中期次预算已保存。</InlineNotice> : null}
      {rows.length ? <div className={styles.stack}>
        <div className={styles.filterBar}><label className={styles.field}><span>统一奖励预算（积分）</span><input disabled={locked} inputMode="decimal" placeholder="例如20000.00" value={uniformReward} onChange={(e) => setUniformReward(e.target.value)} /></label>
          <ActionButton disabled={locked} onClick={() => setRewardValues((old) => ({ ...old, ...Object.fromEntries(selected.map((id) => [id, uniformReward])) }))}>填入选中期次</ActionButton></div>
        <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>选择</th><th>期次</th><th>已投入</th><th>平台总投入上限</th><th>奖励预算上限</th></tr></thead>
          <tbody>{rows.map((row) => {
            const pool = pools.find((value) => value.id === row.poolIssueId);
            const terminal = pool === undefined || ["DISTRIBUTING", "SETTLED", "CANCELLING", "CANCELLED", "CORRECTED", "NO_PARTICIPATION"].includes(pool.status);
            const officialEditable = pool?.status === "OPEN" && pool.userPurchasePoints === "0.00";
            return <tr key={row.poolIssueId}><td><input type="checkbox" aria-label={`选择期次${pool?.issueCode ?? row.poolIssueId}`} disabled={locked || terminal} checked={selected.includes(row.poolIssueId)} onChange={(e) => setSelected((old) => e.target.checked ? [...old, row.poolIssueId] : old.filter((id) => id !== row.poolIssueId))} /></td>
              <td>{pool?.issueCode ?? row.poolIssueId}{terminal ? <small> 已进入不可调整状态</small> : null}</td><td>{row.usedOfficialPoints}</td>
              <td><input aria-label={`期次${pool?.issueCode ?? row.poolIssueId}平台投入上限`} disabled={locked || !officialEditable} inputMode="decimal" placeholder="未配置" value={officialValues[row.poolIssueId] ?? ""} onChange={(e) => setOfficialValues((old) => ({ ...old, [row.poolIssueId]: e.target.value }))} /></td>
              <td><input aria-label={`期次${pool?.issueCode ?? row.poolIssueId}奖励预算上限`} disabled={locked || terminal} inputMode="decimal" placeholder="未配置" value={rewardValues[row.poolIssueId] ?? ""} onChange={(e) => setRewardValues((old) => ({ ...old, [row.poolIssueId]: e.target.value }))} /></td></tr>;
          })}</tbody></table></div>
        <label className={styles.field}><span>设置原因</span><textarea disabled={locked} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
      </div> : !pending && !error ? <p>暂无可配置期次。</p> : null}
    </Dialog>
  </>;
}
