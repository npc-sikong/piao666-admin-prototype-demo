import {
  ApiError,
  ApiTransportError,
  createIdempotencyKey,
} from "@piao777/api-client";
import { adminApi } from "@/lib/api";
import {
  readActionAuthorization,
  readCommandReceipt,
  readCommandResult,
  readExportStatus,
  readLedgerPage,
  readMemberAdmin,
  readMemberAdminPage,
  readOrderPage,
  readReferralConfig,
  readReferralConfigPage,
  readReportResult,
  readTaskAccepted,
  readTaskStatus,
  readVipConfig,
  readVipConfigPage,
  type CommandReceipt,
  type CommandResult,
  type ExportStatus,
  type LedgerViewPage,
  type MemberAdmin,
  type MemberAdminPage,
  type MemberOrderPage,
  type MemberReportType,
  type ReferralConfig,
  type ReferralConfigPage,
  type ReferralLevel,
  type ReportFilter,
  type ReportResult,
  type StatusToggle,
  type TaskAccepted,
  type TaskStatusSummary,
  type VipConfig,
  type VipConfigPage,
  type VipLevel,
} from "./member-models";

export interface MemberListQuery {
  stationId?: string | undefined;
  stationMasterId?: string | undefined;
  vipLevelId?: string | undefined;
  referralLevelId?: string | undefined;
  keyword?: string | undefined;
  cursor?: string | undefined;
  limit?: number | undefined;
}

export interface MemberReportQuery extends ReportFilter {
  snapshotId?: string | undefined;
  cursor?: string | undefined;
  limit?: number | undefined;
}

export interface Versioned<T> {
  data: T;
  etag: string;
}

export interface PresentedError {
  kind: "forbidden" | "not-ready" | "conflict" | "error";
  message: string;
  code: string;
  submissionUnknown: boolean;
}

export async function listAdminMembers(query: MemberListQuery): Promise<MemberAdminPage> {
  const response = await adminApi.request<unknown>("/api/admin/v1/members", {
    query: {
      stationId: clean(query.stationId),
      stationMasterId: clean(query.stationMasterId),
      vipLevelId: clean(query.vipLevelId),
      referralLevelId: clean(query.referralLevelId),
      keyword: clean(query.keyword),
      cursor: query.cursor,
      limit: query.limit ?? 20,
    },
  });
  return readMemberAdminPage(response.data);
}

export async function getAdminMember(memberId: string): Promise<Versioned<MemberAdmin>> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/members/${encodeURIComponent(memberId)}`,
  );
  return { data: readMemberAdmin(response.data), etag: requireEtag(response.etag) };
}

export async function setMemberStatus(input: {
  memberId: string;
  status: StatusToggle;
  reason: string;
  etag: string;
  idempotencyKey: string;
}): Promise<Versioned<MemberAdmin>> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/members/${encodeURIComponent(input.memberId)}/status`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      ifMatch: input.etag,
      body: { status: input.status, reason: input.reason },
    },
  );
  return { data: readMemberAdmin(response.data), etag: requireEtag(response.etag) };
}

export async function migrateMembership(input: {
  member: MemberAdmin;
  stationId: string;
  stationMasterId: string;
  referrerMemberId: string | null;
  reason: string;
  proofCode: string;
  etag: string;
  idempotencyKey: string;
}): Promise<CommandReceipt> {
  const hash = await canonicalDigest([
    "MEMBERSHIP_MIGRATE",
    input.member.id,
    input.member.version,
    input.stationId,
    input.stationMasterId,
    input.referrerMemberId,
    input.reason,
  ]);
  const authorizationResponse = await adminApi.request<unknown>(
    "/api/admin/v1/action-authorizations",
    {
      method: "POST",
      body: {
        purpose: "MEMBERSHIP_MIGRATE",
        targetType: "EXISTING_RESOURCE",
        resourceId: input.member.id,
        expectedInputVersionSetHash: hash,
        expectedAmount: null,
        finalIdempotencyKey: input.idempotencyKey,
        proofCode: input.proofCode,
      },
    },
  );
  const authorization = readActionAuthorization(authorizationResponse.data);
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/members/${encodeURIComponent(input.member.id)}/membership-migrations`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      ifMatch: input.etag,
      actionToken: authorization.actionToken,
      body: {
        stationId: input.stationId,
        stationMasterId: input.stationMasterId,
        referrerMemberId: input.referrerMemberId,
        reason: input.reason,
      },
    },
  );
  return readCommandReceipt(response.data);
}

export async function listAdminMemberLedgers(
  memberId: string,
  cursor?: string,
): Promise<LedgerViewPage> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/members/${encodeURIComponent(memberId)}/point-ledgers`,
    { query: { cursor, limit: 30 } },
  );
  return readLedgerPage(response.data);
}

export async function listAdminMemberOrders(
  memberId: string,
  cursor?: string,
): Promise<MemberOrderPage> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/members/${encodeURIComponent(memberId)}/orders`,
    { query: { cursor, limit: 30 } },
  );
  return readOrderPage(response.data);
}

export async function getVipConfig(): Promise<Versioned<VipConfig>> {
  const response = await adminApi.request<unknown>(
    "/api/admin/v1/vip-level-configurations/current",
  );
  return { data: readVipConfig(response.data), etag: requireEtag(response.etag) };
}

export async function saveVipConfig(input: {
  levels: readonly VipLevel[];
  reason: string;
  etag: string;
  idempotencyKey: string;
}): Promise<Versioned<VipConfig>> {
  const response = await adminApi.request<unknown>(
    "/api/admin/v1/vip-level-configurations/current",
    {
      method: "PUT",
      idempotencyKey: input.idempotencyKey,
      ifMatch: input.etag,
      body: { levels: input.levels, reason: input.reason },
    },
  );
  return { data: readVipConfig(response.data), etag: requireEtag(response.etag) };
}

export async function listVipConfigHistory(): Promise<VipConfigPage> {
  const response = await adminApi.request<unknown>(
    "/api/admin/v1/vip-level-configurations",
    { query: { limit: 20 } },
  );
  return readVipConfigPage(response.data);
}

export async function getReferralConfig(): Promise<Versioned<ReferralConfig>> {
  const response = await adminApi.request<unknown>(
    "/api/admin/v1/referral-level-configurations/current",
  );
  return { data: readReferralConfig(response.data), etag: requireEtag(response.etag) };
}

export async function saveReferralConfig(input: {
  levels: readonly ReferralLevel[];
  fixedRewardPolicyVersion: string;
  aiSharePolicyVersion: string;
  reason: string;
  etag: string;
  idempotencyKey: string;
}): Promise<Versioned<ReferralConfig>> {
  const response = await adminApi.request<unknown>(
    "/api/admin/v1/referral-level-configurations/current",
    {
      method: "PUT",
      idempotencyKey: input.idempotencyKey,
      ifMatch: input.etag,
      body: {
        levels: input.levels,
        fixedRewardPolicyVersion: input.fixedRewardPolicyVersion,
        aiSharePolicyVersion: input.aiSharePolicyVersion,
        reason: input.reason,
      },
    },
  );
  return { data: readReferralConfig(response.data), etag: requireEtag(response.etag) };
}

export async function listReferralConfigHistory(): Promise<ReferralConfigPage> {
  const response = await adminApi.request<unknown>(
    "/api/admin/v1/referral-level-configurations",
    { query: { limit: 20 } },
  );
  return readReferralConfigPage(response.data);
}

export async function rebuildQualifications(input: {
  reason: string;
  idempotencyKey: string;
}): Promise<TaskAccepted> {
  const response = await adminApi.request<unknown>(
    "/api/admin/v1/qualification-rebuilds",
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: { reason: input.reason },
    },
  );
  return readTaskAccepted(response.data);
}

export async function getAdminCommandResult(
  idempotencyKey: string,
  operationId: "saveVipConfig" | "saveReferralConfig",
): Promise<CommandResult> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/command-results/${encodeURIComponent(idempotencyKey)}`,
    { query: { operationId } },
  );
  return readCommandResult(response.data);
}

export async function getMemberReport(
  reportType: MemberReportType,
  query: MemberReportQuery,
): Promise<ReportResult> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/reports/${encodeURIComponent(reportType)}`,
    {
      query: {
        from: query.from,
        to: query.to,
        asOf: query.asOf,
        snapshotId: query.snapshotId,
        stationId: query.stationId,
        stationMasterId: query.stationMasterId,
        memberId: query.memberId,
        vipLevelId: query.vipLevelId,
        referralLevelId: query.referralLevelId,
        groupBy: query.groupBy,
        cursor: query.cursor,
        limit: query.limit ?? 40,
      },
    },
  );
  return readReportResult(response.data);
}

export async function createReportExport(input: {
  reportType: MemberReportType;
  filters: ReportFilter;
  snapshotId: string;
  format: "CSV" | "XLSX";
  idempotencyKey: string;
}): Promise<TaskAccepted> {
  const response = await adminApi.request<unknown>("/api/admin/v1/report-exports", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: {
      reportType: input.reportType,
      filters: input.filters,
      snapshotId: input.snapshotId,
      format: input.format,
    },
  });
  return readTaskAccepted(response.data);
}

export async function getReportExport(resultUrl: string): Promise<ExportStatus> {
  const response = await adminApi.request<unknown>(resultUrl);
  return readExportStatus(response.data);
}

export async function getAdminTask(statusUrl: string): Promise<TaskStatusSummary> {
  const response = await adminApi.request<unknown>(statusUrl);
  return readTaskStatus(response.data);
}

export function newIntentKey(operationId: string): string {
  return createIdempotencyKey(operationId);
}

export function presentApiError(error: unknown): PresentedError {
  if (error instanceof ApiError) {
    const code = error.problem.code;
    const submissionUnknown = error.submissionOutcome === "UNKNOWN";
    if (error.problem.status === 403) {
      return { kind: "forbidden", message: `当前员工权限或数据范围不足（${code}）。`, code, submissionUnknown };
    }
    if (code === "AI_POOL_QUOTA_CONFIG_UNAVAILABLE" || code.includes("POLICY_NOT_READY")) {
      return { kind: "not-ready", message: `${error.problem.title}（${code}）。`, code, submissionUnknown };
    }
    if (error.problem.status === 412 || code === "CONFIG_VERSION_CONFLICT" || code === "REPORT_SNAPSHOT_MISMATCH") {
      return { kind: "conflict", message: `${error.problem.title}（${code}），请重新加载当前版本。`, code, submissionUnknown };
    }
    if (submissionUnknown) {
      return { kind: "error", message: `提交结果未知（${code}）；请保留当前幂等意图并查询原命令。`, code, submissionUnknown };
    }
    return { kind: "error", message: `${error.problem.title}（${code}）。`, code, submissionUnknown };
  }
  if (error instanceof ApiTransportError) {
    const submissionUnknown = error.submissionOutcome === "UNKNOWN";
    return {
      kind: "error",
      message: submissionUnknown
        ? "网络中断，提交结果未知；请保留当前幂等意图并查询原命令。"
        : "无法连接服务，请保留当前筛选后重试。",
      code: "TRANSPORT_UNAVAILABLE",
      submissionUnknown,
    };
  }
  return {
    kind: "error",
    message: "服务返回了当前界面无法识别的结果。",
    code: "RESPONSE_MISMATCH",
    submissionUnknown: false,
  };
}

export function shanghaiDayStart(day: string): string {
  return `${day}T00:00:00+08:00`;
}

export function shanghaiNextDayStart(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  const next = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (date ?? 1) + 1));
  const nextDay = [
    next.getUTCFullYear().toString().padStart(4, "0"),
    (next.getUTCMonth() + 1).toString().padStart(2, "0"),
    next.getUTCDate().toString().padStart(2, "0"),
  ].join("-");
  const endOfDay = `${nextDay}T00:00:00+08:00`;
  // 结束日期选到"今天"时，字面上界在今天结束前一直晚于服务端的 asOf（未显式传时默认取
  // 当前时刻），会被后端 "to不能晚于asOf" 拒掉，整页固定报 REPORT_FILTER_INVALID。
  // 与 ledger-api.ts 的 shanghaiRangeEndInclusive、overview-page.tsx 的 reportRangeEnd 一致。
  const now = new Date().toISOString();
  return new Date(endOfDay).getTime() > new Date(now).getTime() ? now : endOfDay;
}

function requireEtag(value: string | null): string {
  if (value === null || value.length === 0) {
    throw new TypeError("ETAG_REQUIRED");
  }
  return value;
}

function clean(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized === "" ? undefined : normalized;
}

async function canonicalDigest(fields: readonly (string | null)[]): Promise<string> {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (const field of fields) {
    const value = encoder.encode(field === null ? "<null>" : field);
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
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
