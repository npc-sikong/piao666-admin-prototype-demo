import type { Metadata } from "next";
import { AccountRecoveryPage } from "@/features/employee-security/account-recovery-page";

export const metadata: Metadata = {
  title: "员工账号恢复｜数字彩积分平台运营后台",
};

export default function AccountRecoveryRoute() {
  return <AccountRecoveryPage />;
}
