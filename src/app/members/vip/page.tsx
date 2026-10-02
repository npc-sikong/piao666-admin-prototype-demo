import type { Metadata } from "next";
import { VipConfigurationPage } from "@/features/member-management/configuration-pages";

export const metadata: Metadata = {
  title: "VIP 等级配置｜数字彩积分平台运营后台",
};

export default function AdminVipConfigurationRoute() {
  return <VipConfigurationPage />;
}
