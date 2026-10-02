import type { Metadata } from "next";
import { AdminLoginPage } from "@/features/employee-security/login-page";

export const metadata: Metadata = {
  title: "员工登录｜数字彩积分平台运营后台",
};

export default function LoginRoute() {
  return <AdminLoginPage />;
}
