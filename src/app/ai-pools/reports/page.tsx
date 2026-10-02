import type { Metadata } from "next";
import { AiReportPage } from "@/features/ai-management/ai-report-page";

export const metadata: Metadata = {
  title: "AI 每期报表｜数字彩积分平台运营后台",
};

export default function AdminAiReportRoute() {
  return <AiReportPage />;
}
