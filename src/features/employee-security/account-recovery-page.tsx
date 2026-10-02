import Link from "next/link";
import { InlineNotice } from "@/components/admin-workspace/admin-workspace";
import styles from "./employee-security.module.css";

export function AccountRecoveryPage() {
  return (
    <main className={styles.recoveryPage}>
      <section className={styles.recoveryPanel}>
        <span className={styles.realmTag}>A24 · EMPLOYEE SECURITY</span>
        <h1>员工账号恢复</h1>
        <p>员工端不提供匿名自助重置，也不使用手机号或短信找回。无法登录时，请联系具备账号恢复权限的员工完成身份核验。</p>
        <InlineNotice title="受控恢复方式" tone="warning">
          授权员工须在后台提交私有证据、恢复原因和本人 MFA 审批。成功后旧密码、旧 MFA 和全部旧会话失效；本页不收集账号、密码、证件或 MFA 秘密。
        </InlineNotice>
        <Link className={styles.primaryLink} href="/login">返回员工登录</Link>
      </section>
    </main>
  );
}
