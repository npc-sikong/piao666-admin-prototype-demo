import type { Metadata } from "next";
import { AiPoolDetailPage } from "@/features/ai-management/ai-pool-detail-page";

export const metadata: Metadata = {
  title: "AI 合买期次｜数字彩积分平台运营后台",
};

export default async function AdminAiPoolDetailRoute({ params }: Readonly<{
  params: Promise<{ poolIssueId: string }>;
}>) {
  const { poolIssueId } = await params;
  return <AiPoolDetailPage poolIssueId={poolIssueId} />;
}
