import type { Metadata } from "next";
import { OrdersPage } from "@/features/order-management/orders-page";

export const metadata: Metadata = {
  title: "普通积分参与订单｜数字彩积分平台运营后台",
};

export default function OrdersRoute() {
  return <OrdersPage />;
}
