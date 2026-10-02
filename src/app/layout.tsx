import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@piao777/ui-tokens/tokens.css";
import "./globals.css";
import { AdminShell } from "@/components/admin-shell/admin-shell";
import { AppProviders } from "./providers";

export const metadata: Metadata = {
  title: "数字彩积分平台运营后台",
  description: "员工 PC 运营后台入口",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body><AppProviders><AdminShell>{children}</AdminShell></AppProviders></body>
    </html>
  );
}
