import { ApiError, ApiTransportError, createIdempotencyKey } from "@piao777/api-client";
import { adminApi } from "@/lib/api";
import {
  readBudgetPage,
  readAdminLedgerTransactionPage,
  readCommandReceipt,
  readExportStatus,
  readLedgerReport,
  readReconciliation,
  readTaskAccepted,
  readTaskStatus,
  type BudgetAccountPage,
  type AdminLedgerTransactionPage,
  type LedgerAssetType,
  type LedgerEntryDirection,
  type CommandReceipt,
  type ExportStatus,
  type LedgerReport,
  type Reconciliation,
  type ReportFilter,
  type TaskAccepted,
  type TaskStatus,
} from "./ledger-models";

export interface LedgerReportQuery {
  from: string;
  to: string;
  status?: string | undefined;
  cursor?: string | undefined;
  snapshotId?: string | undefined;
}

export interface AdminLedgerTransactionQuery {
  businessNumber?: string | undefined;
  account?: string | undefined;
  stationMaster?: string | undefined;
  issueCode?: string | undefined;
  assetType?: LedgerAssetType | undefined;
  direction?: LedgerEntryDirection | undefined;
  from?: string | undefined;
  to?: string | undefined;
  cursor?: string | undefined;
}

export async function listAdminLedgerTransactions(
  query: AdminLedgerTransactionQuery,
): Promise<AdminLedgerTransactionPage> {
  const response = await adminApi.request<unknown>("/api/admin/v1/ledger-transactions", {
    query: { ...query, limit: 20 },
  });
  return readAdminLedgerTransactionPage(response.data);
}

export async function getAdminReport(query: LedgerReportQuery): Promise<LedgerReport> {
  const response = await adminApi.request<unknown>("/api/admin/v1/reports/LEDGER_RECONCILIATION", {
    query: {
      ...query,
      groupBy: "DAY",
      limit: 50,
    },
  });
  return readLedgerReport(response.data);
}

export async function listBudgets(cursor?: string): Promise<BudgetAccountPage> {
  const response = await adminApi.request<unknown>("/api/admin/v1/budget-accounts", {
    query: { cursor, limit: 100 },
  });
  return readBudgetPage(response.data);
}

export async function createReportExport(input: {
  filters: ReportFilter;
  snapshotId: string;
  format: "CSV" | "XLSX";
  idempotencyKey: string;
}): Promise<TaskAccepted> {
  const response = await adminApi.request<unknown>("/api/admin/v1/report-exports", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: {
      reportType: "LEDGER_RECONCILIATION",
      filters: input.filters,
      snapshotId: input.snapshotId,
      format: input.format,
    },
  });
  return readTaskAccepted(response.data);
}

export async function getReportExport(exportId: string): Promise<ExportStatus> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/report-exports/${encodeURIComponent(exportId)}`,
  );
  return readExportStatus(response.data);
}

export async function createReconciliation(input: {
  reason: string;
  idempotencyKey: string;
}): Promise<TaskAccepted> {
  const response = await adminApi.request<unknown>("/api/admin/v1/reconciliations", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: { reason: input.reason },
  });
  return readTaskAccepted(response.data);
}

export async function getReconciliation(reconciliationId: string): Promise<Reconciliation> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/reconciliations/${encodeURIComponent(reconciliationId)}`,
  );
  return readReconciliation(response.data);
}

export async function getAdminTask(taskId: string): Promise<TaskStatus> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/tasks/${encodeURIComponent(taskId)}`,
  );
  return readTaskStatus(response.data);
}

export async function createLedgerReversal(input: {
  originalTransactionId: string;
  points: string;
  reason: string;
  evidenceIds: readonly string[];
  proofCode: string;
  idempotencyKey: string;
}): Promise<CommandReceipt> {
  const expectedHash = await canonicalDigest([
    "LEDGER_REVERSAL",
    input.originalTransactionId,
    input.points,
    sortedValues(input.evidenceIds),
    input.reason,
  ]);
  const authorization = await adminApi.request<unknown>("/api/admin/v1/action-authorizations", {
    method: "POST",
    body: {
      purpose: "LEDGER_REVERSAL",
      targetType: "EXISTING_RESOURCE",
      resourceId: input.originalTransactionId,
      expectedInputVersionSetHash: expectedHash,
      expectedAmount: input.points,
      finalIdempotencyKey: input.idempotencyKey,
      proofCode: input.proofCode,
    },
  });
  const actionToken = readActionToken(authorization.data);
  const response = await adminApi.request<unknown>("/api/admin/v1/ledger-reversals", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    actionToken,
    body: {
      originalTransactionId: input.originalTransactionId,
      points: input.points,
      reason: input.reason,
      evidenceIds: input.evidenceIds,
    },
  });
  return readCommandReceipt(response.data);
}

export function newLedgerIntent(operationId: string): string {
  return createIdempotencyKey(operationId);
}

export type LedgerFailureKind = "forbidden" | "not-ready" | "version" | "error";

export function ledgerFailure(error: unknown): { kind: LedgerFailureKind; message: string } {
  if (error instanceof ApiError) {
    if (error.problem.status === 403 || error.problem.status === 404) {
      return { kind: "forbidden", message: `当前员工权限或财务范围不足（${error.problem.code}）。` };
    }
    if (error.problem.code.includes("NOT_READY") || error.problem.code.includes("UNCONFIRMED")) {
      return { kind: "not-ready", message: `账本、预算或报表投影尚未就绪（${error.problem.code}）。` };
    }
    if ([409, 412, 428].includes(error.problem.status)) {
      return { kind: "version", message: `账本事实或权限版本已经变化（${error.problem.code}），请重新加载。` };
    }
    if (error.submissionOutcome === "UNKNOWN") {
      return { kind: "error", message: `提交结果未知（${error.problem.code}）；保留当前幂等意图并查询原任务。` };
    }
    return { kind: "error", message: `${error.problem.title}（${error.problem.code}）` };
  }
  if (error instanceof ApiTransportError) {
    return {
      kind: "error",
      message: error.submissionOutcome === "UNKNOWN"
        ? "网络中断，提交结果未知；请保留当前幂等意图并查询原任务。"
        : "无法连接服务，请保留当前筛选条件后重试。",
    };
  }
  return { kind: "error", message: "服务返回了当前页面无法识别的结果。" };
}

export function shanghaiRangeStart(date: string): string {
  return `${date}T00:00:00+08:00`;
}

export function shanghaiRangeEndInclusive(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) + 1));
  const nextDate = [next.getUTCFullYear(), String(next.getUTCMonth() + 1).padStart(2, "0"), String(next.getUTCDate()).padStart(2, "0")].join("-");
  const endOfDay = `${nextDate}T00:00:00+08:00`;
  // 选到"今天"时，含义应该是"到现在为止"，而不是字面的"到今天24:00"——字面值在今天结束前
  // 一直晚于服务端的 asOf（默认取当前时刻），会被后端 "to不能晚于asOf" 的校验拒绝。
  const now = new Date().toISOString();
  return new Date(endOfDay).getTime() > new Date(now).getTime() ? now : endOfDay;
}

function readActionToken(value: unknown): string {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("ACTION_AUTHORIZATION_MISMATCH");
  }
  const token = (value as Record<string, unknown>).actionToken;
  if (typeof token !== "string") {
    throw new TypeError("ACTION_AUTHORIZATION_MISMATCH");
  }
  return token;
}

function sortedValues(values: readonly string[]): string {
  return [...values].sort().reduce((result, value) => `${result}|${value}`, "");
}

async function canonicalDigest(fields: readonly string[]): Promise<string> {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (const field of fields) {
    const value = encoder.encode(field);
    const prefix = encoder.encode(`${value.length}:`);
    const suffix = encoder.encode(";");
    chunks.push(prefix, value, suffix);
    length += prefix.length + value.length + suffix.length;
  }
  const canonical = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    canonical.set(chunk, offset);
    offset += chunk.length;
  }
  const digest = await crypto.subtle.digest("SHA-256", canonical);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
