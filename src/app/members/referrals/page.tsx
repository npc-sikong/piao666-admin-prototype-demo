import type { Metadata } from "next";
import { ReferralConfigurationPage } from "@/features/member-management/configuration-pages";

export const metadata: Metadata = {
  title: "推广等级配置｜数字彩积分平台运营后台",
};

export default function AdminReferralConfigurationRoute() {
  return <ReferralConfigurationPage />;
}
