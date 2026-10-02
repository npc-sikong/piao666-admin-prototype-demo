import type { Metadata } from "next";
import { MembersPage } from "@/features/member-management/members-page";

export const metadata: Metadata = {
  title: "会员列表(修改)｜数字彩积分平台运营后台",
};

export default function AdminMembersRoute() {
  return <MembersPage />;
}
