import type { Metadata } from "next";
import { AiAllocationPage } from "@/features/ai-management/ai-allocation-page";

export const metadata: Metadata = {
  title: "AI 分配与公示｜数字彩积分平台运营后台",
};

export default async function AdminAiAllocationRoute({ params }: Readonly<{
  params: Promise<{ poolIssueId: string }>;
}>) {
  const { poolIssueId } = await params;
  return <AiAllocationPage poolIssueId={poolIssueId} />;
}
