import type { Metadata } from "next";
import { MemberReportsPage } from "@/features/member-management/member-reports-page";

export const metadata: Metadata = {
  title: "会员数据报表｜数字彩积分平台运营后台",
};

export default function AdminMemberReportsRoute() {
  return <MemberReportsPage />;
}
