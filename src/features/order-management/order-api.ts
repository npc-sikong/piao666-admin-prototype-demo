import { ApiError, ApiTransportError, createIdempotencyKey } from "@piao777/api-client";
import { adminApi } from "@/lib/api";
import {
  readOrderDetail,
  readOrderPage,
  readTaskAccepted,
  type AdminOrderDetail,
  type AdminOrderPage,
  type TaskAccepted,
} from "./order-models";

export interface AdminOrderQuery {
  memberId?: string | undefined;
  lotteryId?: string | undefined;
  issueCode?: string | undefined;
  status?: string | undefined;
  cursor?: string | undefined;
}

export async function listAdminOrders(query: AdminOrderQuery): Promise<AdminOrderPage> {
  const response = await adminApi.request<unknown>("/api/admin/v1/ordinary-orders", {
    query: { ...query, limit: 50 },
  });
  return readOrderPage(response.data);
}

export async function listAdminMemberOrders(
  memberId: string,
  cursor?: string,
): Promise<AdminOrderPage> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/members/${encodeURIComponent(memberId)}/orders`,
    { query: { cursor, limit: 50 } },
  );
  return readOrderPage(response.data);
}

export async function getAdminOrder(orderId: string): Promise<AdminOrderDetail> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/ordinary-orders/${encodeURIComponent(orderId)}`,
  );
  return readOrderDetail(response.data);
}

export async function retryOrdinarySettlement(input: {
  orderId: string;
  reason: string;
  idempotencyKey: string;
}): Promise<TaskAccepted> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/ordinary-orders/${encodeURIComponent(input.orderId)}/settlement-retries`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: { reason: input.reason },
    },
  );
  return readTaskAccepted(response.data);
}

export function newOrderIntent(): string {
  return createIdempotencyKey("retryOrdinarySettlement");
}

export type OrderFailureKind = "forbidden" | "not-ready" | "version" | "error";

export function orderFailure(error: unknown): { kind: OrderFailureKind; message: string } {
  if (error instanceof ApiError) {
    if (error.problem.status === 403) {
      return { kind: "forbidden", message: `当前员工权限或站点范围不足（${error.problem.code}）。` };
    }
    if (
      error.problem.code.includes("UNCONFIRMED")
      || error.problem.code.includes("RULE_NOT_READY")
      || error.problem.code.includes("DATA_UNAVAILABLE")
    ) {
      return { kind: "not-ready", message: `结算规则或数据尚未就绪（${error.problem.code}）。` };
    }
    if ([409, 412, 428].includes(error.problem.status)) {
      return { kind: "version", message: `订单或结算版本已经变化（${error.problem.code}），请重新加载。` };
    }
    if (error.submissionOutcome === "UNKNOWN") {
      return { kind: "error", message: `提交结果未知（${error.problem.code}）；请保留当前任务号或幂等意图，不要换键重试。` };
    }
    return { kind: "error", message: `${error.problem.title}（${error.problem.code}）` };
  }
  if (error instanceof ApiTransportError) {
    return {
      kind: "error",
      message: error.submissionOutcome === "UNKNOWN"
        ? "网络中断，提交结果未知；请保留当前幂等意图并查询原任务。"
        : "无法连接服务，请保留筛选条件后重试。",
    };
  }
  return { kind: "error", message: "服务返回了当前页面无法识别的结果。" };
}
