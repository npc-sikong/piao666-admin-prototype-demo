"use client";

import { useState } from "react";
import { ActionButton, Dialog, InlineNotice } from "@/components/admin-workspace/admin-workspace";
import { errorView, newIntent, recalculateAllocation } from "./ai-management-api";
import type { Allocation } from "./ai-management-models";
import styles from "./ai-management.module.css";

export function AiAllocationPreviewDialog({ allocation, etag, onSaved }: Readonly<{
  allocation: Allocation;
  etag: string;
  onSaved(result: Allocation): Promise<void>;
}>) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(allocation.requestedTargetNetReturnPercent);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<string | null>(null);

  async function save() {
    if (!Number.isInteger(target) || target < 0 || target > 100) {
      setError("目标净收益率必须是 0%—100% 的整数。");
      return;
    }
    if (reason.trim().length < 2) {
      setError("请填写调整原因。");
      return;
    }
    const key = intent ?? newIntent("recalculateAllocationPreview");
    setIntent(key);
    setPending(true);
    setError(null);
    try {
      const result = await recalculateAllocation({
        allocation,
        targetNetReturnPercent: target,
        reason: reason.trim(),
        etag,
        idempotencyKey: key,
      });
      setIntent(null);
      setOpen(false);
      await onSaved(result);
    } catch (cause) {
      const view = errorView(cause);
      setError(view.message);
      if (view.kind !== "unknown-submit") setIntent(null);
    } finally {
      setPending(false);
    }
  }

  const locked = pending || intent !== null;
  return <>
    <ActionButton onClick={() => {
      setTarget(allocation.requestedTargetNetReturnPercent);
      setReason("");
      setIntent(null);
      setError(null);
      setOpen(true);
    }}>选择用户目标收益率</ActionButton>
    <Dialog
      description="系统保持本期总池不变，自动计算命中组与其余49组额度；管理员不能逐组修改。"
      footer={<>
        <ActionButton disabled={locked} onClick={() => setOpen(false)}>取消</ActionButton>
        <ActionButton disabled={pending} onClick={() => void save()} variant="primary">
          {pending ? "计算中…" : intent === null ? "自动计算新预览" : "重试原请求"}
        </ActionButton>
      </>}
      onClose={() => { if (!locked) setOpen(false); }}
      open={open}
      title="选择用户目标净收益率"
    >
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>目标净收益率（整数%）</span>
          <input
            disabled={locked}
            inputMode="numeric"
            max={100}
            min={0}
            onChange={(event) => setTarget(Number(event.target.value))}
            step={1}
            type="number"
            value={target}
          />
        </label>
        <label className={`${styles.field} ${styles.span2}`}>
          <span>调整原因</span>
          <textarea
            disabled={locked}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            value={reason}
          />
        </label>
      </div>
      <InlineNotice title="当前规则">
        {allocation.ruleSetCode === "FC3D_50X20_POST_DRAW_V3"
          ? "按本期本金与目标计算总应返，再分配50组额度。保存成功后旧预览立即失效，只按最新确认版本发放，历史金额不累加。"
          : "本期保留旧规则：按整数倍数选择最接近方案，同距取较低收益率；会员返还四舍五入。"}
      </InlineNotice>
      {error === null ? null : <p role="alert">{error}</p>}
    </Dialog>
  </>;
}
