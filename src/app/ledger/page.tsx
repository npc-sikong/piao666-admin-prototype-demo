import type { Metadata } from "next";
import { LedgerPage } from "@/features/ledger-management/ledger-page";

export const metadata: Metadata = {
  title: "积分账本与对账｜数字彩积分平台运营后台",
};

export default function LedgerRoute() {
  return <LedgerPage />;
}
