"use client";

import { useState } from "react";
import {
  ActionButton,
  Dialog,
} from "@/components/admin-workspace/admin-workspace";
import {
  newOrderIntent,
  orderFailure,
  retryOrdinarySettlement,
} from "./order-api";
import type { TaskAccepted } from "./order-models";
import styles from "./order-management.module.css";

interface RetryDialogProps {
  orderId: string | null;
  onClose(): void;
  onAccepted(task: TaskAccepted): void;
}

export function OrderRetryDialog({ orderId, onClose, onAccepted }: RetryDialogProps) {
  const [reason, setReason] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(newOrderIntent);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (submitting) {
      return;
    }
    setReason("");
    setError(null);
    setIdempotencyKey(newOrderIntent());
    onClose();
  }

  async function submit() {
    if (orderId === null || reason.trim().length < 2) {
      setError("请填写至少 2 个字符的恢复原因。");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const task = await retryOrdinarySettlement({
        orderId,
        reason: reason.trim(),
        idempotencyKey,
      });
      onAccepted(task);
      setReason("");
      setError(null);
      setIdempotencyKey(newOrderIntent());
      onClose();
    } catch (cause) {
      setError(orderFailure(cause).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      description="此操作只恢复原订单尚未完成的结算义务，不会创建第二笔全额返奖。"
      footer={(
        <>
          <ActionButton disabled={submitting} onClick={close}>取消</ActionButton>
          <ActionButton
            disabled={submitting || reason.trim().length < 2}
            onClick={() => void submit()}
            variant="primary"
          >{submitting ? "提交中" : "提交恢复任务"}</ActionButton>
        </>
      )}
      onClose={close}
      open={orderId !== null}
      title="恢复普通订单结算"
    >
      <div className={styles.formStack}>
        <label className={styles.field}>
          <span>订单编号</span>
          <input disabled value={orderId ?? ""} />
        </label>
        <label className={styles.field}>
          <span>恢复原因</span>
          <textarea
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            placeholder="说明原任务未完成的原因和本次恢复依据"
            value={reason}
          />
        </label>
        <p className={styles.intentNote}>同一操作意图会固定复用当前幂等键；网络未知结果不会自动换键重发。</p>
        {error === null ? null : <p className={styles.feedback} role="alert">{error}</p>}
      </div>
    </Dialog>
  );
}
