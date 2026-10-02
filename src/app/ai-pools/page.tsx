import type { Metadata } from "next";
import { AiProjectsPage } from "@/features/ai-management/ai-projects-page";

export const metadata: Metadata = {
  title: "AI 合买项目｜数字彩积分平台运营后台",
};

export default function AdminAiProjectsRoute() {
  return <AiProjectsPage />;
}
