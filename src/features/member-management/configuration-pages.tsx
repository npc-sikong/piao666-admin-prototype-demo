"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActionButton,
  Dialog,
  InlineNotice,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/admin-workspace/admin-workspace";
import { PageState } from "@/components/page-state/page-state";
import { TaskStatus } from "@/components/task-status/task-status";
import { useAdminSession } from "@/session/admin-session";
import {
  getAdminCommandResult,
  getReferralConfig,
  getVipConfig,
  listReferralConfigHistory,
  listVipConfigHistory,
  newIntentKey,
  presentApiError,
  rebuildQualifications,
  saveReferralConfig,
  saveVipConfig,
  type PresentedError,
  type Versioned,
} from "./member-api";
import { formatDateTime } from "./member-format";
import { MemberNavigation } from "./member-navigation";
import type {
  ReferralConfig,
  ReferralConfigPage,
  ReferralLevel,
  VipConfig,
  VipConfigPage,
  VipLevel,
} from "./member-models";
import { useMemberTask } from "./use-member-task";
import styles from "./member-management.module.css";
import confirmedDefaults from "@/demo/config-defaults.json";

type LoadStatus = "loading" | "ready" | "error" | "forbidden" | "not-ready";

interface VipSaveIntent {
  idempotencyKey: string;
  levels: readonly VipLevel[];
  reason: string;
}

interface ReferralDraft {
  levels: readonly ReferralLevel[];
  fixedRewardPolicyVersion: string;
  aiSharePolicyVersion: string;
}

interface ReferralSaveIntent extends ReferralDraft {
  idempotencyKey: string;
  reason: string;
}

export function VipConfigurationPage() {
  const session = useAdminSession();
  const permissions = session.identity?.permissions ?? [];
  const canView = permissions.includes("vip:config:view");
  const canWrite = permissions.includes("vip:config:write");
  const canRebuild = permissions.includes("qualification:rebuild");
  const [snapshot, setSnapshot] = useState<Versioned<VipConfig> | null>(null);
  const [draft, setDraft] = useState<readonly VipLevel[]>([]);
  const [history, setHistory] = useState<VipConfigPage | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [saveIntent, setSaveIntent] = useState<VipSaveIntent | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const rebuild = useMemberTask();
  const [rebuildOpen, setRebuildOpen] = useState(false);
  const [rebuildReason, setRebuildReason] = useState("");
  const [rebuildSubmitting, setRebuildSubmitting] = useState(false);
  const [rebuildError, setRebuildError] = useState<string | null>(null);
  const [rebuildIntentKey, setRebuildIntentKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canView) {
      setStatus("forbidden");
      return;
    }
    setStatus("loading");
    setError(null);
    setConflict(false);
    try {
      const current = await getVipConfig();
      setSnapshot(current);
      setDraft(cloneVipLevels(current.data.levels));
      setHistory(await listVipConfigHistory());
      setReason("");
      setSaveIntent(null);
      setStatus("ready");
    } catch (cause) {
      const presented = presentApiError(cause);
      setStatus(loadStatus(presented));
      setError(presented.message);
    }
  }, [canView]);

  useEffect(() => {
    if (session.status === "authenticated") void load();
  }, [load, session.status]);

  const validation = useMemo(() => validateVip(draft), [draft]);
  const dirty = snapshot !== null && JSON.stringify(draft) !== JSON.stringify(snapshot.data.levels);

  function updateLevel(index: number, patch: Partial<VipLevel>) {
    setDraft((current) => current.map((level, itemIndex) => (
      itemIndex === index ? { ...level, ...patch } : level
    )));
    setSaveMessage(null);
  }

  function addLevel() {
    const nextLevelNo = draft.reduce((maximum, level) => Math.max(maximum, level.levelNo), -1) + 1;
    setDraft((current) => [...current, {
      id: crypto.randomUUID(),
      levelNo: nextLevelNo,
      name: "",
      requiredRechargePoints: "",
      aiPoolBaseDailyLimit: "",
    }]);
  }

  async function save() {
    if (snapshot === null || validation !== null) return;
    const intent = saveIntent ?? {
      idempotencyKey: newIntentKey("saveVipConfig"),
      levels: cloneVipLevels(draft),
      reason: reason.trim(),
    };
    setSaveIntent(intent);
    setSaving(true);
    setSaveMessage(null);
    setConflict(false);
    try {
      const result = await saveVipConfig({ ...intent, etag: snapshot.etag });
      setSnapshot(result);
      setDraft(cloneVipLevels(result.data.levels));
      setReason("");
      setSaveIntent(null);
      setSaveMessage("服务端已保存 VIP 整表新版本；资格状态以回执为准。" );
      try {
        setHistory(await listVipConfigHistory());
      } catch {
        setSaveMessage("VIP 整表已保存，但历史列表刷新失败；可重新加载当前版本。" );
      }
    } catch (cause) {
      const presented = presentApiError(cause);
      setSaveMessage(presented.message);
      setConflict(presented.kind === "conflict");
      if (!presented.submissionUnknown) setSaveIntent(null);
    } finally {
      setSaving(false);
    }
  }

  async function recoverSave() {
    if (saveIntent === null) return;
    setSaving(true);
    try {
      const result = await getAdminCommandResult(saveIntent.idempotencyKey, "saveVipConfig");
      if (result.status === "SUCCEEDED") {
        setSaveMessage("原保存命令已成功，正在重新读取当前整表。" );
        await load();
      } else if (result.status === "FAILED") {
        setSaveMessage(`原保存命令失败（${result.failureCode ?? "未提供失败码"}）。`);
        setSaveIntent(null);
      } else {
        setSaveMessage("原保存命令仍在处理中，请稍后继续查询同一意图。" );
      }
    } catch (cause) {
      setSaveMessage(presentApiError(cause).message);
    } finally {
      setSaving(false);
    }
  }

  async function submitRebuild() {
    const idempotencyKey = rebuildIntentKey ?? newIntentKey("rebuildQualifications");
    setRebuildIntentKey(idempotencyKey);
    setRebuildSubmitting(true);
    setRebuildError(null);
    try {
      const accepted = await rebuildQualifications({
        reason: rebuildReason.trim(),
        idempotencyKey,
      });
      rebuild.start(accepted);
      setRebuildReason("");
    } catch (cause) {
      const presented = presentApiError(cause);
      setRebuildError(presented.message);
      if (!presented.submissionUnknown) setRebuildIntentKey(null);
    } finally {
      setRebuildSubmitting(false);
    }
  }

  return (
    <ConfigurationBoundary
      description="按累计充值积分匹配的横向整表配置；积分来源固定为站长加分 1:1，无状态列和二级编辑弹窗。"
      error={error}
      load={load}
      pageId="A19"
      status={status}
      title="VIP 等级配置"
    >
      {snapshot === null ? null : (
        <>
          <ConfigurationHeader
            canRebuild={canRebuild}
            onRebuild={() => setRebuildOpen(true)}
            qualificationStatus={snapshot.data.qualificationStatus}
            version={snapshot.data.version}
          />
          {conflict ? (
            <InlineNotice title="配置版本已失效" tone="warning">
              当前草稿基于旧 ETag，必须重新加载后比较，页面不会覆盖其他员工已保存的版本。
            </InlineNotice>
          ) : null}
          <Panel flush title="VIP 横向整表">
            <div className={styles.configToolbar}>
              <div><p>等级序号与升级门槛必须严格递增；至少保留一个 0 门槛基础等级。删除只改变新配置，历史资格和订单仍引用旧版本。</p></div>
              <ActionButton disabled={!canWrite || saveIntent !== null || draft.length !== 0} onClick={() => { setDraft(cloneVipLevels(confirmedDefaults.selection.vipLevels)); setSaveMessage("已载入业务确认的12级初值，尚未保存或生效。"); }}>载入12级初值</ActionButton>
              <ActionButton disabled={!canWrite || saveIntent !== null} onClick={addLevel} variant="primary">新增一行</ActionButton>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table} data-width="config-vip">
                <thead><tr><th>等级序号</th><th>等级名称</th><th>升级所需充值积分</th><th>积分来源</th><th>AI 基础额度 / 日</th><th>操作</th></tr></thead>
                <tbody>
                  {draft.map((level, index) => (
                    <tr key={level.id}>
                      <td><input className={styles.tableInput} disabled={!canWrite || saveIntent !== null} min={0} onChange={(event) => updateLevel(index, { levelNo: integerDraft(event.target.value) })} type="number" value={level.levelNo < 0 ? "" : level.levelNo} /></td>
                      <td><input className={styles.tableInput} data-size="name" disabled={!canWrite || saveIntent !== null} maxLength={40} onChange={(event) => updateLevel(index, { name: event.target.value })} value={level.name} /></td>
                      <td><input className={styles.tableInput} disabled={!canWrite || saveIntent !== null} inputMode="decimal" onChange={(event) => updateLevel(index, { requiredRechargePoints: event.target.value })} placeholder="0.00" value={level.requiredRechargePoints} /></td>
                      <td><span className={styles.sourceField}>站长增加积分 1:1</span></td>
                      <td><input className={styles.tableInput} disabled={!canWrite || saveIntent !== null} inputMode="decimal" onChange={(event) => updateLevel(index, { aiPoolBaseDailyLimit: event.target.value })} placeholder="0.00" value={level.aiPoolBaseDailyLimit} /></td>
                      <td><ActionButton disabled={!canWrite || index === 0 || saveIntent !== null} onClick={() => setDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))} variant="danger">删除</ActionButton></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ConfigFooter
              canWrite={canWrite}
              dirty={dirty}
              frozenReason={saveIntent?.reason ?? null}
              message={saveMessage}
              onRecover={saveIntent === null ? undefined : recoverSave}
              onReset={() => {
                setDraft(cloneVipLevels(snapshot.data.levels));
                setReason("");
                setSaveIntent(null);
                setSaveMessage(null);
              }}
              onSave={save}
              reason={reason}
              saving={saving}
              setReason={setReason}
              validation={conflict ? "配置版本已失效，必须先重新加载当前版本。" : validation}
            />
          </Panel>
          <VipHistory history={history} />
          <RebuildDialog
            error={rebuildError ?? rebuild.error}
            onClose={() => {
              setRebuildOpen(false);
              if (rebuild.status !== null && taskTerminal(rebuild.status.status)) {
                rebuild.clear();
                setRebuildIntentKey(null);
                setRebuildError(null);
              }
            }}
            onSubmit={submitRebuild}
            open={rebuildOpen}
            reason={rebuildReason}
            setReason={setRebuildReason}
            submitting={rebuildSubmitting}
            task={rebuild.status ?? rebuild.accepted}
          />
        </>
      )}
    </ConfigurationBoundary>
  );
}

export function ReferralConfigurationPage() {
  const session = useAdminSession();
  const permissions = session.identity?.permissions ?? [];
  const canView = permissions.includes("referral:config:view");
  const canWrite = permissions.includes("referral:config:write");
  const canRebuild = permissions.includes("qualification:rebuild");
  const [snapshot, setSnapshot] = useState<Versioned<ReferralConfig> | null>(null);
  const [draft, setDraft] = useState<ReferralDraft>({ levels: [], fixedRewardPolicyVersion: "", aiSharePolicyVersion: "" });
  const [history, setHistory] = useState<ReferralConfigPage | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [saveIntent, setSaveIntent] = useState<ReferralSaveIntent | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const rebuild = useMemberTask();
  const [rebuildOpen, setRebuildOpen] = useState(false);
  const [rebuildReason, setRebuildReason] = useState("");
  const [rebuildSubmitting, setRebuildSubmitting] = useState(false);
  const [rebuildError, setRebuildError] = useState<string | null>(null);
  const [rebuildIntentKey, setRebuildIntentKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canView) {
      setStatus("forbidden");
      return;
    }
    setStatus("loading");
    setError(null);
    setConflict(false);
    try {
      const current = await getReferralConfig();
      setSnapshot(current);
      setDraft(cloneReferralDraft(current.data));
      setHistory(await listReferralConfigHistory());
      setReason("");
      setSaveIntent(null);
      setStatus("ready");
    } catch (cause) {
      const presented = presentApiError(cause);
      setStatus(loadStatus(presented));
      setError(presented.message);
    }
  }, [canView]);

  useEffect(() => {
    if (session.status === "authenticated") void load();
  }, [load, session.status]);

  const validation = useMemo(() => validateReferral(draft), [draft]);
  const dirty = snapshot !== null && JSON.stringify(draft) !== JSON.stringify(cloneReferralDraft(snapshot.data));

  function updateLevel(index: number, patch: Partial<ReferralLevel>) {
    setDraft((current) => ({
      ...current,
      levels: current.levels.map((level, itemIndex) => itemIndex === index ? { ...level, ...patch } : level),
    }));
    setSaveMessage(null);
  }

  function addLevel() {
    const nextLevelNo = draft.levels.reduce((maximum, level) => Math.max(maximum, level.levelNo), -1) + 1;
    setDraft((current) => ({ ...current, levels: [...current.levels, {
      id: crypto.randomUUID(),
      levelNo: nextLevelNo,
      name: "",
      requiredDirectValidMembers: -1,
      validRechargePoints: "",
      fixedRewardPoints: "",
      directAiShareRate: "",
      aiExtraDailyLimit: "",
      status: "DISABLED",
    }] }));
  }

  async function save() {
    if (snapshot === null || validation !== null) return;
    const intent = saveIntent ?? {
      idempotencyKey: newIntentKey("saveReferralConfig"),
      ...cloneReferralDraft(draft),
      reason: reason.trim(),
    };
    setSaveIntent(intent);
    setSaving(true);
    setSaveMessage(null);
    setConflict(false);
    try {
      const result = await saveReferralConfig({ ...intent, etag: snapshot.etag });
      setSnapshot(result);
      setDraft(cloneReferralDraft(result.data));
      setReason("");
      setSaveIntent(null);
      setSaveMessage("服务端已保存推广整表新版本；奖励和分红仍按批准政策及资格水位执行。" );
      try {
        setHistory(await listReferralConfigHistory());
      } catch {
        setSaveMessage("推广整表已保存，但历史列表刷新失败；可重新加载当前版本。" );
      }
    } catch (cause) {
      const presented = presentApiError(cause);
      setSaveMessage(presented.message);
      setConflict(presented.kind === "conflict");
      if (!presented.submissionUnknown) setSaveIntent(null);
    } finally {
      setSaving(false);
    }
  }

  async function recoverSave() {
    if (saveIntent === null) return;
    setSaving(true);
    try {
      const result = await getAdminCommandResult(saveIntent.idempotencyKey, "saveReferralConfig");
      if (result.status === "SUCCEEDED") {
        setSaveMessage("原保存命令已成功，正在重新读取当前整表。" );
        await load();
      } else if (result.status === "FAILED") {
        setSaveMessage(`原保存命令失败（${result.failureCode ?? "未提供失败码"}）。`);
        setSaveIntent(null);
      } else {
        setSaveMessage("原保存命令仍在处理中，请稍后继续查询同一意图。" );
      }
    } catch (cause) {
      setSaveMessage(presentApiError(cause).message);
    } finally {
      setSaving(false);
    }
  }

  async function submitRebuild() {
    const idempotencyKey = rebuildIntentKey ?? newIntentKey("rebuildQualifications");
    setRebuildIntentKey(idempotencyKey);
    setRebuildSubmitting(true);
    setRebuildError(null);
    try {
      const accepted = await rebuildQualifications({
        reason: rebuildReason.trim(),
        idempotencyKey,
      });
      rebuild.start(accepted);
      setRebuildReason("");
    } catch (cause) {
      const presented = presentApiError(cause);
      setRebuildError(presented.message);
      if (!presented.submissionUnknown) setRebuildIntentKey(null);
    } finally {
      setRebuildSubmitting(false);
    }
  }

  return (
    <ConfigurationBoundary
      description="按直属有效会员门槛配置固定奖励、AI 分红率与附加额度；管理归属不参与推广关系计算。"
      error={error}
      load={load}
      pageId="A20"
      status={status}
      title="推广等级配置"
    >
      {snapshot === null ? null : (
        <>
          <ConfigurationHeader canRebuild={canRebuild} onRebuild={() => setRebuildOpen(true)} qualificationStatus={snapshot.data.qualificationStatus} version={snapshot.data.version} />
          <InlineNotice title="D06—D08 准入门控" tone="warning">
            页面只展示服务端当前配置与政策版本，不使用原型演示数值。未正式批准的奖励触发、分红基数或默认权益不会因保存页面而自动发放。
          </InlineNotice>
          {conflict ? <InlineNotice title="配置版本已失效" tone="warning">必须重新加载后比较当前版本，本页不会覆盖其他员工已保存的整表。</InlineNotice> : null}
          <Panel flush title="推广横向整表">
            <div className={styles.policyGrid}>
              <label className={styles.dialogField}>
                <span>固定奖励政策版本（D06）</span>
                <input disabled={!canWrite || saveIntent !== null} maxLength={128} onChange={(event) => setDraft((value) => ({ ...value, fixedRewardPolicyVersion: event.target.value }))} value={saveIntent?.fixedRewardPolicyVersion ?? draft.fixedRewardPolicyVersion} />
              </label>
              <label className={styles.dialogField}>
                <span>AI 分红政策版本（D07）</span>
                <input disabled={!canWrite || saveIntent !== null} maxLength={128} onChange={(event) => setDraft((value) => ({ ...value, aiSharePolicyVersion: event.target.value }))} value={saveIntent?.aiSharePolicyVersion ?? draft.aiSharePolicyVersion} />
              </label>
            </div>
            <div className={styles.configToolbar}>
              <div><p>每级有效充值门槛独立计算；固定奖励 F 与 AI 分红率 r 是不同字段。至少保留一个启用的 0 人门槛基础级。</p></div>
              <ActionButton disabled={!canWrite || saveIntent !== null || draft.levels.length !== 0} onClick={() => { setDraft((current) => ({ ...current, levels: confirmedDefaults.selection.referralLevels.map((level) => ({ ...level, status: "ENABLED" as const })) })); setSaveMessage("已载入业务确认的12级初值，尚未保存或生效；请绑定已批准的推广政策版本。"); }}>载入12级初值</ActionButton>
              <ActionButton disabled={!canWrite || saveIntent !== null} onClick={addLevel} variant="primary">新增一行</ActionButton>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table} data-width="config-referral">
                <thead><tr><th>序号</th><th>名称</th><th>直属有效人数</th><th>有效会员充值额度</th><th>固定推广奖励</th><th>直属会员 AI 分红率</th><th>AI 附加额度 / 日</th><th>状态</th><th>操作</th></tr></thead>
                <tbody>
                  {draft.levels.map((level, index) => (
                    <tr key={level.id}>
                      <td><input className={styles.tableInput} disabled={!canWrite || saveIntent !== null} min={0} onChange={(event) => updateLevel(index, { levelNo: integerDraft(event.target.value) })} type="number" value={level.levelNo < 0 ? "" : level.levelNo} /></td>
                      <td><input className={styles.tableInput} data-size="name" disabled={!canWrite || saveIntent !== null} maxLength={40} onChange={(event) => updateLevel(index, { name: event.target.value })} value={level.name} /></td>
                      <td><input className={styles.tableInput} disabled={!canWrite || saveIntent !== null} min={0} onChange={(event) => updateLevel(index, { requiredDirectValidMembers: integerDraft(event.target.value) })} type="number" value={level.requiredDirectValidMembers < 0 ? "" : level.requiredDirectValidMembers} /></td>
                      <td><input className={styles.tableInput} disabled={!canWrite || saveIntent !== null} inputMode="decimal" onChange={(event) => updateLevel(index, { validRechargePoints: event.target.value })} placeholder="0.00" value={level.validRechargePoints} /></td>
                      <td><input className={styles.tableInput} disabled={!canWrite || saveIntent !== null} inputMode="decimal" onChange={(event) => updateLevel(index, { fixedRewardPoints: event.target.value })} placeholder="0.00" value={level.fixedRewardPoints} /></td>
                      <td><input className={styles.tableInput} disabled={!canWrite || saveIntent !== null} inputMode="decimal" onChange={(event) => updateLevel(index, { directAiShareRate: event.target.value })} placeholder="输入 0 到 1 的小数" value={level.directAiShareRate} /></td>
                      <td><input className={styles.tableInput} disabled={!canWrite || saveIntent !== null} inputMode="decimal" onChange={(event) => updateLevel(index, { aiExtraDailyLimit: event.target.value })} placeholder="0.00" value={level.aiExtraDailyLimit} /></td>
                      <td><select className={styles.tableSelect} disabled={!canWrite || index === 0 || saveIntent !== null} onChange={(event) => updateLevel(index, { status: event.target.value as ReferralLevel["status"] })} value={level.status}><option value="ENABLED">启用</option><option value="DISABLED">停用</option></select></td>
                      <td><ActionButton disabled={!canWrite || index === 0 || saveIntent !== null} onClick={() => setDraft((current) => ({ ...current, levels: current.levels.filter((_, itemIndex) => itemIndex !== index) }))} variant="danger">删除</ActionButton></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ConfigFooter
              canWrite={canWrite}
              dirty={dirty}
              frozenReason={saveIntent?.reason ?? null}
              message={saveMessage}
              onRecover={saveIntent === null ? undefined : recoverSave}
              onReset={() => {
                setDraft(cloneReferralDraft(snapshot.data));
                setReason("");
                setSaveIntent(null);
                setSaveMessage(null);
              }}
              onSave={save}
              reason={reason}
              saving={saving}
              setReason={setReason}
              validation={conflict ? "配置版本已失效，必须先重新加载当前版本。" : validation}
            />
          </Panel>
          <ReferralHistory history={history} />
          <RebuildDialog error={rebuildError ?? rebuild.error} onClose={() => {
            setRebuildOpen(false);
            if (rebuild.status !== null && taskTerminal(rebuild.status.status)) {
              rebuild.clear();
              setRebuildIntentKey(null);
              setRebuildError(null);
            }
          }} onSubmit={submitRebuild} open={rebuildOpen} reason={rebuildReason} setReason={setRebuildReason} submitting={rebuildSubmitting} task={rebuild.status ?? rebuild.accepted} />
        </>
      )}
    </ConfigurationBoundary>
  );
}

function ConfigurationBoundary({ children, description, error, load, pageId, status, title }: Readonly<{
  children: ReactNode;
  description: string;
  error: string | null;
  load(): Promise<void>;
  pageId: string;
  status: LoadStatus;
  title: string;
}>) {
  return (
    <>
      <MemberNavigation />
      <PageHeader actions={<ActionButton onClick={() => void load()}>重新加载当前版本</ActionButton>} description={description} pageId={pageId} title={title} />
      {status === "loading" ? <PageState kind="loading" title="正在读取整表配置" /> : null}
      {status === "forbidden" ? <PageState description={error ?? undefined} kind="forbidden" /> : null}
      {status === "not-ready" ? <PageState action={<ActionButton onClick={() => void load()}>重新检查</ActionButton>} description="D08 正式等级与权益初值尚未形成可读取配置；页面不会用原型数字自动初始化。" kind="not-ready" /> : null}
      {status === "error" ? <PageState action={<ActionButton onClick={() => void load()}>重试</ActionButton>} description={error ?? undefined} kind="error" /> : null}
      {status === "ready" ? children : null}
    </>
  );
}

function ConfigurationHeader({ canRebuild, onRebuild, qualificationStatus, version }: Readonly<{
  canRebuild: boolean;
  onRebuild(): void;
  qualificationStatus: string;
  version: string;
}>) {
  return (
    <Panel
      actions={<ActionButton disabled={!canRebuild || qualificationStatus === "UNCONFIGURED"} onClick={onRebuild}>手工重建资格</ActionButton>}
      description="保存使用 If-Match 比较当前版本；配置发布与会员资格水位追平是两个状态。"
      title="当前配置版本"
    >
      <div className={styles.policyGrid}>
        <div className={styles.readOnlyField}><span>配置版本</span><strong>{version}</strong></div>
        <div className={styles.readOnlyField}><span>资格状态</span><StatusBadge status={qualificationStatus} label={qualificationStatus === "UNCONFIGURED" ? "尚未配置" : qualificationStatus === "READY" ? "已追平" : "重算中"} /></div>
      </div>
    </Panel>
  );
}

function ConfigFooter({ canWrite, dirty, frozenReason, message, onRecover, onReset, onSave, reason, saving, setReason, validation }: Readonly<{
  canWrite: boolean;
  dirty: boolean;
  frozenReason: string | null;
  message: string | null;
  onRecover?: (() => Promise<void>) | undefined;
  onReset(): void;
  onSave(): Promise<void>;
  reason: string;
  saving: boolean;
  setReason(value: string): void;
  validation: string | null;
}>) {
  return (
    <div className={styles.configFooter}>
      <label className={styles.reasonField}>
        <span>整表变更原因</span>
        <textarea disabled={!canWrite || frozenReason !== null} maxLength={500} onChange={(event) => setReason(event.target.value)} placeholder="至少 2 个字符；一次保存整张表" value={frozenReason ?? reason} />
        {validation === null ? null : <small className={styles.negative}>{validation}</small>}
        {message === null ? null : <small>{message}</small>}
      </label>
      <div className={styles.configActions}>
        {onRecover === undefined ? null : <ActionButton disabled={saving} onClick={() => void onRecover()}>查询原保存命令</ActionButton>}
        <ActionButton disabled={saving || !dirty} onClick={onReset}>撤销本地修改</ActionButton>
        <ActionButton disabled={!canWrite || !dirty || validation !== null || (frozenReason ?? reason).trim().length < 2 || saving} onClick={() => void onSave()} variant="primary">{saving ? "保存中" : frozenReason === null ? "保存全部配置" : "按原幂等意图重试"}</ActionButton>
      </div>
    </div>
  );
}

function VipHistory({ history }: Readonly<{ history: VipConfigPage | null }>) {
  return (
    <Panel description="历史配置只读保留；删除等级不会删除旧资格或订单引用。" title="VIP 配置历史">
      {history === null ? <PageState kind="loading" /> : history.items.length === 0 ? <PageState kind="empty" /> : (
        <div className={styles.historyList}>{history.items.map((item) => (
          <div className={styles.historyItem} key={item.version}><strong>版本 {item.version}</strong><span>{item.levels.length} 个等级 · {item.qualificationStatus}</span><small>{formatDateTime(item.createdAt)}</small></div>
        ))}</div>
      )}
    </Panel>
  );
}

function ReferralHistory({ history }: Readonly<{ history: ReferralConfigPage | null }>) {
  return (
    <Panel description="固定奖励与 AI 分红各自保留政策版本，历史义务不会随新配置重算为另一套规则。" title="推广配置历史">
      {history === null ? <PageState kind="loading" /> : history.items.length === 0 ? <PageState kind="empty" /> : (
        <div className={styles.historyList}>{history.items.map((item) => (
          <div className={styles.historyItem} key={item.version}><strong>版本 {item.version}</strong><span>{item.levels.length} 个等级 · D06 {item.fixedRewardPolicyVersion} · D07 {item.aiSharePolicyVersion}</span><small>{item.qualificationStatus}</small></div>
        ))}</div>
      )}
    </Panel>
  );
}

function RebuildDialog({ error, onClose, onSubmit, open, reason, setReason, submitting, task }: Readonly<{
  error: string | null;
  onClose(): void;
  onSubmit(): Promise<void>;
  open: boolean;
  reason: string;
  setReason(value: string): void;
  submitting: boolean;
  task: { status: string; progress?: number; resultCode?: string | null; failureCode?: string | null } | null;
}>) {
  return (
    <Dialog
      description="202 只表示任务已经持久化；资格切换以任务完成和配置回读为准。"
      footer={<div className={styles.dialogActions}><ActionButton onClick={onClose}>关闭</ActionButton><ActionButton disabled={submitting || reason.trim().length < 2 || task !== null} onClick={() => void onSubmit()} variant="primary">{submitting ? "受理中" : "提交重建任务"}</ActionButton></div>}
      onClose={onClose}
      open={open}
      title="重建会员资格"
    >
      <label className={styles.dialogField}><span>重建原因</span><textarea disabled={task !== null} maxLength={500} onChange={(event) => setReason(event.target.value)} value={reason} /></label>
      {task === null ? null : <TaskStatus failureCode={task.failureCode} progress={task.progress ?? 0} resultCode={task.resultCode} status={task.status} />}
      {error === null ? null : <p className={styles.inlineMessage} data-tone="danger">{error}</p>}
    </Dialog>
  );
}

function validateVip(levels: readonly VipLevel[]): string | null {
  if (levels.length === 0) return "至少保留一个 VIP 基础等级。";
  const ids = new Set<string>();
  const names = new Set<string>();
  let priorNo = -1;
  let priorThreshold: bigint | null = null;
  for (const [index, level] of levels.entries()) {
    const threshold = pointsMinor(level.requiredRechargePoints);
    const limit = pointsMinor(level.aiPoolBaseDailyLimit);
    if (level.id.trim() === "" || ids.has(level.id)) return `第 ${index + 1} 行等级 ID 无效或重复。`;
    if (level.name.trim() === "" || names.has(level.name.trim())) return `第 ${index + 1} 行等级名称为空或重复。`;
    if (!Number.isInteger(level.levelNo) || level.levelNo <= priorNo) return "等级序号必须按行严格递增。";
    if (threshold === null || limit === null) return `第 ${index + 1} 行积分必须使用两位小数字符串且不能为负。`;
    if (priorThreshold !== null && threshold <= priorThreshold) return "升级所需充值积分必须按行严格递增。";
    ids.add(level.id); names.add(level.name.trim()); priorNo = level.levelNo; priorThreshold = threshold;
  }
  return pointsMinor(levels[0]?.requiredRechargePoints ?? "") === 0n ? null : "第一个 VIP 基础等级必须为 0.00 门槛。";
}

function validateReferral(draft: ReferralDraft): string | null {
  if (draft.levels.length === 0) return "至少保留一个推广基础等级。";
  if (draft.fixedRewardPolicyVersion.trim() === "" || draft.aiSharePolicyVersion.trim() === "") return "D06 与 D07 政策版本必须来自服务端有效配置，不能留空或使用演示值。";
  const ids = new Set<string>();
  const names = new Set<string>();
  let priorNo = -1;
  let priorCount = -1;
  for (const [index, level] of draft.levels.entries()) {
    if (level.id.trim() === "" || ids.has(level.id)) return `第 ${index + 1} 行等级 ID 无效或重复。`;
    if (level.name.trim() === "" || names.has(level.name.trim())) return `第 ${index + 1} 行等级名称为空或重复。`;
    if (!Number.isInteger(level.levelNo) || level.levelNo <= priorNo) return "等级序号必须按行严格递增。";
    if (!Number.isInteger(level.requiredDirectValidMembers) || level.requiredDirectValidMembers <= priorCount) return "直属有效人数门槛必须按行严格递增。";
    if ([level.validRechargePoints, level.fixedRewardPoints, level.aiExtraDailyLimit].some((value) => pointsMinor(value) === null)) return `第 ${index + 1} 行积分必须使用两位小数字符串且不能为负。`;
    if (!/^(0(\.[0-9]{1,8})?|1(\.0{1,8})?)$/.test(level.directAiShareRate)) return `第 ${index + 1} 行 AI 分红率必须使用 0 到 1 的小数字符串。`;
    ids.add(level.id); names.add(level.name.trim()); priorNo = level.levelNo; priorCount = level.requiredDirectValidMembers;
  }
  const base = draft.levels[0];
  return base?.requiredDirectValidMembers === 0 && base.status === "ENABLED" ? null : "第一个推广基础等级必须为启用且直属有效人数门槛为 0。";
}

function pointsMinor(value: string): bigint | null {
  const match = /^(0|[1-9][0-9]{0,15})\.([0-9]{2})$/.exec(value);
  return match === null ? null : BigInt(`${match[1]}${match[2]}`);
}

function integerDraft(value: string): number {
  return value === "" ? -1 : Number(value);
}

function taskTerminal(status: string): boolean {
  return status === "SUCCEEDED" || status === "FAILED" || status === "CANCELLED";
}

function cloneVipLevels(levels: readonly VipLevel[]): readonly VipLevel[] {
  return levels.map((level) => ({ ...level }));
}

function cloneReferralDraft(config: ReferralConfig | ReferralDraft): ReferralDraft {
  return {
    levels: config.levels.map((level) => ({ ...level })),
    fixedRewardPolicyVersion: config.fixedRewardPolicyVersion ?? "",
    aiSharePolicyVersion: config.aiSharePolicyVersion ?? "",
  };
}

function loadStatus(error: PresentedError): LoadStatus {
  if (error.kind === "forbidden") return "forbidden";
  if (error.kind === "not-ready") return "not-ready";
  return "error";
}
