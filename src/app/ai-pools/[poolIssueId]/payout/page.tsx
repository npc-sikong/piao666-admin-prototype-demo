import type { Metadata } from "next";
import { AiPayoutPage } from "@/features/ai-management/ai-payout-page";

export const metadata: Metadata = {
  title: "AI 发放中心｜数字彩积分平台运营后台",
};

export default async function AdminAiPayoutRoute({ params }: Readonly<{
  params: Promise<{ poolIssueId: string }>;
}>) {
  const { poolIssueId } = await params;
  return <AiPayoutPage poolIssueId={poolIssueId} />;
}
