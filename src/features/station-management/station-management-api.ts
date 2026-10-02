import {
  ApiError,
  ApiTransportError,
  createIdempotencyKey,
  type ApiResponse,
} from "@piao777/api-client";
import { adminApi } from "@/lib/api";
import {
  readBudgetPage,
  readCommandResult,
  readExportStatus,
  readLedgerPage,
  readPointChangeReceipt,
  readStation,
  readStationMaster,
  readStationMasterPage,
  readStationMasterReport,
  readStationPage,
  readTaskAccepted,
  type BudgetAccount,
  type CommandResult,
  type CursorPage,
  type ExportStatus,
  type LedgerView,
  type PointChangeReceipt,
  type ReportFilter,
  type Station,
  type StationLimits,
  type StationMaster,
  type StationMasterReport,
  type TaskAccepted,
  type ToggleStatus,
} from "./station-management-models";

export interface StationFilters {
  keyword?: string;
  status?: ToggleStatus;
  cursor?: string;
}

export interface StationMasterFilters extends StationFilters {
  stationId?: string;
}

export interface LedgerFilters {
  stationMasterId?: string;
  memberId?: string;
  from?: string;
  to?: string;
  cursor?: string;
}

export interface StationWrite {
  name: string;
  regionLabel: string;
  remark: string;
}

export interface StationMasterCreate {
  clientIntentId: string;
  name: string;
  account: string;
  initialPassword: string;
  stationId: string;
  status: ToggleStatus;
  limits: StationLimits;
  initialDisposablePoints: string;
  remark: string;
}

export interface PendingCommand {
  operationId: string;
  idempotencyKey: string;
  label: string;
}

export async function listStations(
  filters: StationFilters = {},
): Promise<CursorPage<Station>> {
  const response = await adminApi.request<unknown>("/api/admin/v1/stations", {
    query: {
      limit: 100,
      cursor: filters.cursor,
      keyword: clean(filters.keyword),
      status: filters.status,
    },
  });
  return readStationPage(response.data);
}

export async function createStation(
  input: StationWrite,
  idempotencyKey: string,
): Promise<Station> {
  const response = await adminApi.request<unknown>("/api/admin/v1/stations", {
    method: "POST",
    idempotencyKey,
    body: input,
  });
  return readStation(response.data);
}

export async function getStation(
  stationId: string,
): Promise<{ value: Station; etag: string }> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/stations/${encodeURIComponent(stationId)}`,
  );
  return { value: readStation(response.data), etag: requireEtag(response) };
}

export async function updateStation(
  stationId: string,
  input: StationWrite,
  etag: string,
  idempotencyKey: string,
): Promise<Station> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/stations/${encodeURIComponent(stationId)}`,
    {
      method: "PUT",
      ifMatch: etag,
      idempotencyKey,
      body: input,
    },
  );
  return readStation(response.data);
}

export async function changeStationStatus(
  stationId: string,
  status: ToggleStatus,
  reason: string,
  etag: string,
  idempotencyKey: string,
): Promise<Station> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/stations/${encodeURIComponent(stationId)}/status`,
    {
      method: "POST",
      ifMatch: etag,
      idempotencyKey,
      body: { status, reason },
    },
  );
  return readStation(response.data);
}

export async function listStationMasters(
  filters: StationMasterFilters = {},
): Promise<CursorPage<StationMaster>> {
  const response = await adminApi.request<unknown>("/api/admin/v1/station-masters", {
    query: {
      limit: 100,
      cursor: filters.cursor,
      stationId: clean(filters.stationId),
      keyword: clean(filters.keyword),
      status: filters.status,
    },
  });
  return readStationMasterPage(response.data);
}

export async function getStationMaster(
  stationMasterId: string,
): Promise<{ value: StationMaster; etag: string }> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/station-masters/${encodeURIComponent(stationMasterId)}`,
  );
  return { value: readStationMaster(response.data), etag: requireEtag(response) };
}

export async function createStationMaster(
  input: StationMasterCreate,
  idempotencyKey: string,
): Promise<StationMaster> {
  const response = await adminApi.request<unknown>("/api/admin/v1/station-masters", {
    method: "POST",
    idempotencyKey,
    body: input,
  });
  return readStationMaster(response.data);
}

export async function updateStationMaster(
  stationMasterId: string,
  input: Partial<Pick<StationMaster, "name" | "account" | "limits" | "remark">>,
  etag: string,
  idempotencyKey: string,
): Promise<StationMaster> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/station-masters/${encodeURIComponent(stationMasterId)}`,
    {
      method: "PATCH",
      ifMatch: etag,
      idempotencyKey,
      body: input,
    },
  );
  return readStationMaster(response.data);
}

export async function changeStationMasterStatus(
  stationMaster: StationMaster,
  status: ToggleStatus,
  reason: string,
  etag: string,
  idempotencyKey: string,
): Promise<StationMaster> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/station-masters/${encodeURIComponent(stationMaster.id)}/status`,
    {
      method: "POST",
      ifMatch: etag,
      idempotencyKey,
      body: { status, reason },
    },
  );
  return readStationMaster(response.data);
}

export async function resetStationMasterPassword(input: {
  stationMaster: StationMaster;
  newPassword: string;
  reason: string;
  proofCode: string;
  idempotencyKey: string;
}): Promise<void> {
  const expectedHash = await canonicalDigest([
    "PASSWORD_RESET",
    input.stationMaster.id,
    input.stationMaster.identityVersion,
    input.reason,
  ]);
  const actionToken = await authorizeAction({
    purpose: "PASSWORD_RESET",
    targetType: "EXISTING_RESOURCE",
    resourceId: input.stationMaster.id,
    expectedHash,
    expectedAmount: null,
    finalIdempotencyKey: input.idempotencyKey,
    proofCode: input.proofCode,
  });
  await adminApi.request<void>(
    `/api/admin/v1/station-masters/${encodeURIComponent(input.stationMaster.id)}/password`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      actionToken,
      body: { newPassword: input.newPassword, reason: input.reason },
    },
  );
}

export async function migrateStationMaster(input: {
  stationMaster: StationMaster;
  targetStationId: string;
  moveOwnedMembers: boolean;
  reason: string;
  proofCode: string;
  etag: string;
  idempotencyKey: string;
}): Promise<TaskAccepted> {
  const expectedHash = await canonicalDigest([
    "STATION_MASTER_MIGRATE",
    input.stationMaster.id,
    input.stationMaster.version,
    input.targetStationId,
    String(input.moveOwnedMembers),
    input.reason,
  ]);
  const actionToken = await authorizeAction({
    purpose: "STATION_MASTER_MIGRATE",
    targetType: "EXISTING_RESOURCE",
    resourceId: input.stationMaster.id,
    expectedHash,
    expectedAmount: null,
    finalIdempotencyKey: input.idempotencyKey,
    proofCode: input.proofCode,
  });
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/station-masters/${encodeURIComponent(input.stationMaster.id)}/migrations`,
    {
      method: "POST",
      ifMatch: input.etag,
      idempotencyKey: input.idempotencyKey,
      actionToken,
      body: {
        targetStationId: input.targetStationId,
        reason: input.reason,
        moveOwnedMembers: input.moveOwnedMembers,
      },
    },
  );
  return readTaskAccepted(response.data);
}

export async function adjustStationMasterPoints(input: {
  stationMaster: StationMaster;
  type: "ADMIN_GRANT" | "ADMIN_DEDUCT";
  points: string;
  reason: string;
  proofCode: string;
  idempotencyKey: string;
}): Promise<PointChangeReceipt> {
  const expectedHash = await canonicalDigest([
    "STATION_BUDGET_ADJUST",
    input.stationMaster.id,
    input.stationMaster.version,
    input.type,
    input.points,
    input.reason,
  ]);
  const actionToken = await authorizeAction({
    purpose: "STATION_BUDGET_ADJUST",
    targetType: "EXISTING_RESOURCE",
    resourceId: input.stationMaster.id,
    expectedHash,
    expectedAmount: input.points,
    finalIdempotencyKey: input.idempotencyKey,
    proofCode: input.proofCode,
  });
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/station-masters/${encodeURIComponent(input.stationMaster.id)}/points/adjustments`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      actionToken,
      body: { type: input.type, points: input.points, reason: input.reason },
    },
  );
  return readPointChangeReceipt(response.data);
}

export async function listAdminStationLedgers(
  filters: LedgerFilters = {},
): Promise<CursorPage<LedgerView>> {
  const response = await adminApi.request<unknown>(
    "/api/admin/v1/station-master-point-ledgers",
    {
      query: {
        limit: 100,
        cursor: filters.cursor,
        stationMasterId: clean(filters.stationMasterId),
        memberId: clean(filters.memberId),
        from: filters.from,
        to: filters.to,
      },
    },
  );
  return readLedgerPage(response.data);
}

export async function listBudgets(): Promise<CursorPage<BudgetAccount>> {
  const response = await adminApi.request<unknown>("/api/admin/v1/budget-accounts", {
    query: { limit: 100 },
  });
  return readBudgetPage(response.data);
}

export async function getStationMasterReport(input: {
  filters: ReportFilter;
  cursor?: string;
}): Promise<StationMasterReport> {
  const response = await adminApi.request<unknown>(
    "/api/admin/v1/reports/STATION_MASTERS",
    {
      query: {
        ...input.filters,
        asOf: input.filters.asOf ?? undefined,
        cursor: input.cursor,
        limit: 100,
      },
    },
  );
  return readStationMasterReport(response.data);
}

export async function createReportExport(input: {
  report: StationMasterReport;
  format: "CSV" | "XLSX";
  idempotencyKey: string;
}): Promise<TaskAccepted> {
  const response = await adminApi.request<unknown>("/api/admin/v1/report-exports", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: {
      reportType: "STATION_MASTERS",
      filters: input.report.filters,
      snapshotId: input.report.snapshotId,
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

export async function getAdminCommandResult(
  pending: PendingCommand,
): Promise<CommandResult> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/command-results/${encodeURIComponent(pending.idempotencyKey)}`,
    { query: { operationId: pending.operationId } },
  );
  return readCommandResult(response.data);
}

export function newIntentKey(operationId: string): string {
  return createIdempotencyKey(operationId);
}

export function newClientIntentId(): string {
  return crypto.randomUUID();
}

export function wholePoints(value: string): string | null {
  const normalized = value.trim();
  if (!/^[1-9][0-9]{0,15}$/.test(normalized)) {
    return null;
  }
  return `${normalized}.00`;
}

export function nonNegativeWholePoints(value: string): string | null {
  const normalized = value.trim();
  if (!/^(0|[1-9][0-9]{0,15})$/.test(normalized)) {
    return null;
  }
  return `${normalized}.00`;
}

export function formatPoints(value: string): string {
  const match = /^(-?)([0-9]+)\.([0-9]{2})$/.exec(value);
  if (match === null) {
    return value;
  }
  const [, sign, integer, decimal] = match;
  if (sign === undefined || integer === undefined || decimal === undefined) {
    return value;
  }
  return `${sign}${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${decimal}`;
}

export function subtractPoints(left: string, right: string): string {
  const result = parseMinor(left) - parseMinor(right);
  const sign = result < 0n ? "-" : "";
  const absolute = result < 0n ? -result : result;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}

export function shanghaiDayStart(value: string): string {
  return `${value}T00:00:00+08:00`;
}

export function shanghaiDayEnd(value: string): string {
  return `${value}T23:59:59.999+08:00`;
}

export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.submissionOutcome === "UNKNOWN") {
      return `提交结果未知（${error.problem.code}），请查询原命令，勿更换幂等键重复提交。`;
    }
    if (error.problem.status === 403) {
      return `当前员工权限或站点范围不足（${error.problem.code}）。`;
    }
    if (error.problem.status === 412 || error.problem.status === 428) {
      return `资料版本已失效（${error.problem.code}），请重新加载后再操作。`;
    }
    if (error.problem.status === 409) {
      return `当前状态或余额已变化（${error.problem.code}），请读取服务端最新事实。`;
    }
    return `${error.problem.title}（${error.problem.code}）`;
  }
  if (error instanceof ApiTransportError) {
    return error.submissionOutcome === "UNKNOWN"
      ? "网络中断，提交结果未知；请查询原命令，勿创建新的提交意图。"
      : "无法连接服务，请保留当前筛选条件后重试。";
  }
  return "服务返回了当前界面无法识别的结果。";
}

export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.problem.status === 403;
}

export function isNotReadyError(error: unknown): boolean {
  return error instanceof ApiError && (
    error.problem.code.includes("NOT_READY")
      || error.problem.code.includes("NOT_CONFIGURED")
      || error.problem.code.includes("UNAVAILABLE")
  );
}

export function isUnknownSubmission(error: unknown): boolean {
  return (error instanceof ApiError || error instanceof ApiTransportError)
    && error.submissionOutcome === "UNKNOWN";
}

function clean(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized === undefined || normalized === "" ? undefined : normalized;
}

function requireEtag(response: ApiResponse<unknown>): string {
  if (response.etag === null) {
    throw new TypeError("REQUIRED_ETAG_MISSING");
  }
  return response.etag;
}

async function authorizeAction(input: {
  purpose: "STATION_BUDGET_ADJUST" | "PASSWORD_RESET" | "STATION_MASTER_MIGRATE";
  targetType: "EXISTING_RESOURCE" | "CREATE_INTENT";
  resourceId: string;
  expectedHash: string;
  expectedAmount: string | null;
  finalIdempotencyKey: string;
  proofCode: string;
}): Promise<string> {
  const response = await adminApi.request<unknown>("/api/admin/v1/action-authorizations", {
    method: "POST",
    body: {
      purpose: input.purpose,
      targetType: input.targetType,
      resourceId: input.resourceId,
      expectedInputVersionSetHash: input.expectedHash,
      expectedAmount: input.expectedAmount,
      finalIdempotencyKey: input.finalIdempotencyKey,
      proofCode: input.proofCode,
    },
  });
  if (typeof response.data !== "object" || response.data === null || Array.isArray(response.data)) {
    throw new TypeError("ACTION_AUTHORIZATION_MISMATCH");
  }
  const actionToken = (response.data as Record<string, unknown>).actionToken;
  if (typeof actionToken !== "string") {
    throw new TypeError("ACTION_AUTHORIZATION_MISMATCH");
  }
  return actionToken;
}

async function canonicalDigest(fields: readonly string[]): Promise<string> {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (const field of fields) {
    const value = encoder.encode(field);
    const prefix = encoder.encode(`${value.length}:`);
    const suffix = encoder.encode(";");
    chunks.push(prefix, value, suffix);
    total += prefix.length + value.length + suffix.length;
  }
  const canonical = new Uint8Array(total);
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

function parseMinor(value: string): bigint {
  const match = /^(-?)([0-9]+)\.([0-9]{2})$/.exec(value);
  if (match === null) {
    throw new TypeError("POINTS_FORMAT_MISMATCH");
  }
  const signText = match[1];
  const integer = match[2];
  const decimal = match[3];
  if (signText === undefined || integer === undefined || decimal === undefined) {
    throw new TypeError("POINTS_FORMAT_MISMATCH");
  }
  const sign = signText === "-" ? -1n : 1n;
  return sign * (BigInt(integer) * 100n + BigInt(decimal));
}
