"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ActionButton } from "@/components/admin-workspace/admin-workspace";
import { useAdminSession } from "@/session/admin-session";
import { adminLogin, employeeFailure } from "./employee-api";
import styles from "./employee-security.module.css";

export function AdminLoginPage() {
  const router = useRouter();
  const session = useAdminSession();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session.status === "authenticated") {
      router.replace("/");
    }
  }, [router, session.status]);

  async function submitCredentials() {
    if (!/^[A-Za-z0-9_-]{4,32}$/.test(account) || password.length < 8) {
      setError("请输入 4—32 位员工账号和有效密码。");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await adminLogin(account, password);
      setPassword("");
      await session.refresh();
      router.replace("/");
    } catch (cause) {
      setPassword("");
      setError(employeeFailure(cause).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.loginPage}>
      <section className={styles.loginIntro}>
        <span className={styles.realmTag}>EMPLOYEE REALM</span>
        <h1>数字彩积分<br />运营后台</h1>
        <p>独立员工安全域。账号密码验证成功后直接建立后台会话。</p>
        <div className={styles.securityFacts}>
          <span>员工域与会员域隔离</span>
          <span>权限与站点范围由服务端裁决</span>
          <span>敏感操作使用单用途动作凭据</span>
        </div>
      </section>

      <section className={styles.loginPanel} aria-labelledby="login-title">
        <header>
          <span>01</span>
          <h2 id="login-title">员工登录</h2>
          <p>请输入员工账号与密码，验证成功后直接进入运营后台。</p>
        </header>

        <form className={styles.loginForm} onSubmit={(event) => { event.preventDefault(); void submitCredentials(); }}>
          <label><span>员工账号</span><input autoComplete="username" autoFocus onChange={(event) => setAccount(event.target.value)} value={account} /></label>
          <label><span>密码</span><input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} type="password" value={password} /></label>
          <ActionButton disabled={submitting} type="submit" variant="primary">{submitting ? "登录中" : "登录后台"}</ActionButton>
        </form>

        {error === null ? null : <p className={styles.feedback} role="alert">{error}</p>}
        <footer><Link href="/account-recovery">员工账号无法登录？查看恢复说明</Link></footer>
      </section>
    </main>
  );
}
