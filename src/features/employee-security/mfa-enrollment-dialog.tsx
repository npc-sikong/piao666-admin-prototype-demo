"use client";

import { useState } from "react";
import {
  ActionButton,
  Dialog,
  InlineNotice,
  formatDateTime,
} from "@/components/admin-workspace/admin-workspace";
import { useAdminSession } from "@/session/admin-session";
import {
  beginAdminMfaEnrollment,
  confirmAdminMfaEnrollment,
  employeeFailure,
} from "./employee-api";
import type { MfaEnrollment } from "./employee-models";
import styles from "./employee-security.module.css";

export function MfaEnrollmentDialog({
  open,
  onClose,
}: Readonly<{ open: boolean; onClose(): void }>) {
  const session = useAdminSession();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (submitting) return;
    setPassword("");
    setCode("");
    setEnrollment(null);
    setError(null);
    onClose();
  }

  async function begin() {
    if (!/^(?=.*[A-Za-z])(?=.*[0-9]).{8,20}$/.test(password)) {
      setError("请输入当前员工登录密码。");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      setEnrollment(await beginAdminMfaEnrollment(password));
      setPassword("");
    } catch (cause) {
      setPassword("");
      setError(employeeFailure(cause).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirm() {
    if (enrollment === null || !/^\d{6}$/.test(code)) {
      setError("请先加入认证器，再输入当前 6 位动态码。");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await confirmAdminMfaEnrollment(enrollment.enrollmentId, code);
      await session.refresh();
      setPassword("");
      setCode("");
      setEnrollment(null);
      onClose();
    } catch (cause) {
      setCode("");
      setError(employeeFailure(cause).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      description="登录仍只使用账号密码；此动态码仅用于开奖复核、政策批准、预算入账等敏感动作。"
      footer={<>
        <ActionButton disabled={submitting} onClick={close}>取消</ActionButton>
        <ActionButton
          disabled={submitting || (enrollment === null ? password.length < 8 : code.length !== 6)}
          onClick={() => void (enrollment === null ? begin() : confirm())}
          variant="primary"
        >
          {submitting ? "处理中…" : enrollment === null ? "生成绑定资料" : "确认绑定"}
        </ActionButton>
      </>}
      onClose={close}
      open={open}
      title="绑定敏感动作 MFA"
    >
      <div className={styles.mfaSetup}>
        {enrollment === null ? <>
          <InlineNotice title="需要当前密码">绑定资料只在本弹窗显示，不会写入日志或普通页面缓存。</InlineNotice>
          <label className={styles.field}>
            <span>当前员工登录密码</span>
            <input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
          </label>
        </> : <>
          <InlineNotice title="一次性初始化资料" tone="warning">
            请将下方 URI 加入认证器，并在 {formatDateTime(enrollment.expiresAt)} 前完成确认。请勿截图、转发或写入工单。
          </InlineNotice>
          <label className={styles.field}>
            <span>认证器配置 URI</span>
            <textarea readOnly value={enrollment.provisioningUri} />
          </label>
          <label className={styles.field}>
            <span>认证器当前 6 位动态码</span>
            <input autoComplete="one-time-code" inputMode="numeric" maxLength={6} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} value={code} />
          </label>
        </>}
        {error === null ? null : <p className={styles.feedback} role="alert">{error}</p>}
      </div>
    </Dialog>
  );
}
