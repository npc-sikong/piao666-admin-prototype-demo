"use client";

import { useState } from "react";
import { ApiError } from "@piao777/api-client";
import { ActionButton, Dialog, InlineNotice } from "@/components/admin-workspace/admin-workspace";
import { adminApi } from "@/lib/api";
import { apiErrorMessage, createPolicyVersion, newIntentKey, uploadEvidence } from "./operations-api";
import type { AdminCatalog, EvidenceUpload, PolicyView } from "./operations-models";
import styles from "./operations-pages.module.css";

interface AwardRow {
  playCode: string;
  playRuleVersion: number;
  awardCode: string;
  rank: number;
  points: string;
  outcomes: string[];
}
interface AwardArtifact extends Record<string, unknown> {
  decisionId: "D02";
  selection: Record<string, unknown> & { awardRows: AwardRow[] };
}
interface Intent {
  file: File;
  reason: string;
  key: string;
  uploadKeys: { prepare: string; commit: string };
  evidence: EvidenceUpload | null;
}

/** 复用政策版本/私有证据/独立复核；编辑奖额不会改写旧政策。 */
export function FixedAwardDialog({ catalog, policies, onSaved }: Readonly<{
  catalog: AdminCatalog | null;
  policies: readonly PolicyView[];
  onSaved(): Promise<void>;
}>) {
  const [open, setOpen] = useState(false);
  const [artifact, setArtifact] = useState<AwardArtifact | null>(null);
  const [policyId, setPolicyId] = useState("");
  const [lotteryId, setLotteryId] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [saved, setSaved] = useState(false);
  const locked = pending || intent !== null;
  const plays = catalog?.lotteries.flatMap((lottery) => lottery.plays.map((play) => ({
    ...play, lotteryId: lottery.id, lotteryName: lottery.name,
  }))) ?? [];

  async function load(read: () => Promise<unknown>) {
    setPending(true); setError(null); setArtifact(null);
    try { setArtifact(readArtifact(await read())); }
    catch (cause) { setError(cause instanceof Error && cause.message.startsWith("奖表") ? cause.message : apiErrorMessage(cause)); }
    finally { setPending(false); }
  }

  async function save() {
    if (artifact === null) return;
    let current = intent;
    if (current === null) {
      if (artifact.selection.awardRows.some((row) => !/^[0-9]+(\.[0-9]{1,2})?$/.test(row.points))) {
        setError("奖额必须为非负积分，最多两位小数。"); return;
      }
      if (reason.trim().length < 2) { setError("请填写调整原因。"); return; }
      current = { file: new File([JSON.stringify(artifact)], "fixed-awards.json", { type: "application/json" }),
        reason: reason.trim(), key: newIntentKey("createPolicyVersion"),
        uploadKeys: { prepare: newIntentKey("prepareAdminUpload"), commit: newIntentKey("commitAdminUpload") }, evidence: null };
      setIntent(current);
    }
    setPending(true); setError(null);
    try {
      const evidence = current.evidence ?? await uploadEvidence(current.file, "POLICY_ARTIFACT", current.uploadKeys);
      current = { ...current, evidence }; setIntent(current);
      await createPolicyVersion({ code: "SIMULATION_AWARD", artifact: evidence, reason: current.reason, idempotencyKey: current.key });
      setIntent(null); setOpen(false); setSaved(true); await onSaved();
    } catch (cause) {
      // 上传和政策写入结果均可能未知；保留原文件、原参数和原键供重试。
      setError(apiErrorMessage(cause));
      if (cause instanceof ApiError && cause.submissionOutcome !== "UNKNOWN") setIntent(null);
    } finally { setPending(false); }
  }

  return <>
    <ActionButton onClick={() => { setOpen(true); setSaved(false); }}>固定积分奖表</ActionButton>
    {saved ? <span role="status">奖表已提交，待独立复核</span> : null}
    <Dialog open={open} title="固定积分奖表" width="wide" onClose={() => { if (!locked) setOpen(false); }}
      description="按彩种、玩法和奖级调整固定积分。保存生成新的待复核政策版本。"
      footer={<><ActionButton disabled={locked} onClick={() => setOpen(false)}>取消</ActionButton>
        <ActionButton disabled={pending || artifact === null} onClick={() => void save()} variant="primary">
          {pending ? "提交中" : intent === null ? "提交待复核" : "按原请求重试"}</ActionButton></>}>
      <div className={styles.stack}>
        <InlineNotice title="奖表生效范围">无订单且未开奖的期次使用新批准版本；已有订单保留原版本。一等奖初值为500万，其他浮动奖须有官方期次证据。下表只修改积分金额。</InlineNotice>
        <div className={styles.filterBar}>
          <label className={styles.field}><span>已有奖表版本</span>
            <select disabled={locked} value={policyId} onChange={(event) => setPolicyId(event.target.value)}>
              <option value="">请选择</option>{policies.filter((policy) => policy.code === "SIMULATION_AWARD").map((policy) =>
                <option key={policy.id} value={policy.id}>v{policy.version} · {policy.status}</option>)}
            </select></label>
          <ActionButton disabled={locked || policyId === ""} onClick={() => void load(async () =>
            (await adminApi.request<unknown>(`/api/admin/v1/simulation-policy-versions/${encodeURIComponent(policyId)}/artifact`)).data)}>读取奖表</ActionButton>
          <label className={styles.field}><span>导入正式奖表制品</span><input disabled={locked} type="file" accept="application/json"
            onChange={(event) => { const file = event.target.files?.[0]; if (file) void load(async () => JSON.parse(await file.text()) as unknown); }} /></label>
        </div>
        {artifact === null ? <p>请选择已有版本或导入带奖级、命中条件和来源证据的奖表。</p> : <>
          <label className={styles.field}><span>彩种筛选</span><select value={lotteryId} onChange={(event) => setLotteryId(event.target.value)}>
            <option value="">全部彩种</option>{catalog?.lotteries.map((lottery) => <option key={lottery.id} value={lottery.id}>{lottery.name}</option>)}
          </select></label>
          <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>彩种 / 玩法</th><th>规则版本</th><th>奖级</th><th>固定积分</th></tr></thead>
            <tbody>{artifact.selection.awardRows.map((row, index) => {
              const play = plays.find((item) => item.code === row.playCode);
              if (lotteryId !== "" && play?.lotteryId !== lotteryId) return null;
              return <tr key={`${row.playCode}-${row.playRuleVersion}-${row.awardCode}`}><td>{play ? `${play.lotteryName} · ${play.name}` : row.playCode}</td>
                <td>v{row.playRuleVersion}</td><td>{row.rank}等奖 · {row.awardCode}</td><td>
                  <input aria-label={`${row.playCode} ${row.awardCode}固定积分`} className={styles.compactInput} disabled={locked} inputMode="decimal" value={row.points}
                    onChange={(event) => setArtifact({ ...artifact, selection: { ...artifact.selection,
                      awardRows: artifact.selection.awardRows.map((value, rowIndex) => rowIndex === index ? { ...value, points: event.target.value } : value),
                    } })} /></td></tr>;
            })}</tbody></table></div>
          <label className={styles.field}><span>调整原因</span><textarea disabled={locked} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        </>}
        {error === null ? null : <p role="alert" className={styles.feedback}>{error}</p>}
      </div>
    </Dialog>
  </>;
}

function readArtifact(value: unknown): AwardArtifact {
  if (typeof value !== "object" || value === null || !("decisionId" in value) || value.decisionId !== "D02"
    || !("selection" in value) || typeof value.selection !== "object" || value.selection === null
    || !("awardRows" in value.selection) || !Array.isArray(value.selection.awardRows) || value.selection.awardRows.length === 0) {
    throw new Error("奖表缺少正式奖级数据；选择记录不能作为完整奖表提交。");
  }
  for (const row of value.selection.awardRows as unknown[]) {
    if (typeof row !== "object" || row === null || !("playCode" in row) || typeof row.playCode !== "string"
      || !("playRuleVersion" in row) || !Number.isSafeInteger(row.playRuleVersion)
      || !("awardCode" in row) || typeof row.awardCode !== "string" || !("rank" in row) || !Number.isSafeInteger(row.rank)
      || !("points" in row) || typeof row.points !== "string" || !("outcomes" in row) || !Array.isArray(row.outcomes)) {
      throw new Error("奖表行缺少玩法、规则版本、奖级、金额或命中条件。");
    }
  }
  return value as AwardArtifact;
}
