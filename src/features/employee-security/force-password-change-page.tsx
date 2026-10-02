"use client";

import { useState } from "react";
import { ActionButton } from "@/components/admin-workspace/admin-workspace";
import { useAdminSession } from "@/session/admin-session";
import { changeOwnPassword, employeeFailure } from "./employee-api";
import styles from "./employee-security.module.css";

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*[0-9]).{8,20}$/;

export function ForcePasswordChangePage() {
  const session = useAdminSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!PASSWORD_PATTERN.test(currentPassword)) {
      setError("请输入当前登录密码。");
      return;
    }
    if (!PASSWORD_PATTERN.test(newPassword)) {
      setError("新密码需为 8—20 位，且同时包含字母和数字。");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致。");
      return;
    }
    if (newPassword === currentPassword) {
      setError("新密码不能与当前密码相同。");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await changeOwnPassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await session.refresh();
    } catch (cause) {
      setCurrentPassword("");
      setError(employeeFailure(cause).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.loginPage}>
      <section className={styles.loginIntro}>
        <span className={styles.realmTag}>EMPLOYEE REALM</span>
        <h1>首次登录<br />必须修改密码</h1>
        <p>该账号仍在使用初始密码，完成修改后才能继续使用运营后台。</p>
        <div className={styles.securityFacts}>
          <span>初始密码只允许登录本页</span>
          <span>修改成功后原会话自动续期</span>
          <span>密码不会被记录进日志或工单</span>
        </div>
      </section>

      <section className={styles.loginPanel} aria-labelledby="force-password-title">
        <header>
          <span>01</span>
          <h2 id="force-password-title">修改初始密码</h2>
          <p>请输入当前密码与新密码，新密码需 8—20 位并同时包含字母和数字。</p>
        </header>

        <form className={styles.loginForm} onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <label>
            <span>当前密码</span>
            <input autoComplete="current-password" autoFocus onChange={(event) => setCurrentPassword(event.target.value)} type="password" value={currentPassword} />
          </label>
          <label>
            <span>新密码</span>
            <input autoComplete="new-password" onChange={(event) => setNewPassword(event.target.value)} type="password" value={newPassword} />
          </label>
          <label>
            <span>确认新密码</span>
            <input autoComplete="new-password" onChange={(event) => setConfirmPassword(event.target.value)} type="password" value={confirmPassword} />
          </label>
          <ActionButton disabled={submitting} type="submit" variant="primary">
            {submitting ? "提交中" : "修改密码并继续"}
          </ActionButton>
        </form>

        {error === null ? null : <p className={styles.feedback} role="alert">{error}</p>}
      </section>
    </main>
  );
}
