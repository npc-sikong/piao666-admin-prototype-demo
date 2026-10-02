import type { Metadata } from "next";
import { EmployeesPage } from "@/features/employee-security/employees-page";

export const metadata: Metadata = {
  title: "员工权限与审计｜数字彩积分平台运营后台",
};

export default function EmployeesRoute() {
  return <EmployeesPage />;
}
