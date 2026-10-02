import type { Metadata } from "next";
import { MemberDetailPage } from "@/features/member-management/member-detail-page";

export const metadata: Metadata = {
  title: "会员详情｜数字彩积分平台运营后台",
};

export default async function AdminMemberDetailRoute({ params }: Readonly<{
  params: Promise<{ memberId: string }>;
}>) {
  const { memberId } = await params;
  return <MemberDetailPage memberId={memberId} />;
}
