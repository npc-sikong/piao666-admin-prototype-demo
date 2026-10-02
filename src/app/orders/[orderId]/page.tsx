import type { Metadata } from "next";
import { OrderDetailPage } from "@/features/order-management/order-detail-page";

export const metadata: Metadata = {
  title: "普通订单详情｜数字彩积分平台运营后台",
};

export default async function OrderDetailRoute({
  params,
}: Readonly<{ params: Promise<{ orderId: string }> }>) {
  const { orderId } = await params;
  return <OrderDetailPage orderId={orderId} />;
}
