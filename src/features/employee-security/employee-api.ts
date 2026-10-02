import { ApiError, ApiTransportError, createIdempotencyKey } from "@piao777/api-client";
import { adminApi } from "@/lib/api";
import { uploadEvidence } from "@/features/operations/operations-api";
import type { EvidenceUpload } from "@/features/operations/operations-models";
import {
  readAuditPage,
  readEmployee,
  readEmployeePage,
  readMfaEnrollment,
  readRolePage,
  type AuditView,
  type CursorPage,
  type Employee,
  type MfaEnrollment,
  type Role,
} from "./employee-models";

export async function adminLogin(account: string, password: string): Promise<void> {
  await adminApi.request<unknown>("/api/admin/v1/auth/login", {
    method: "POST",
    body: { account, password },
  });
}

export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
  await adminApi.request<void>("/api/v1/me/password", {
    method: "POST",
    body: { currentPassword, newPassword },
  });
}

export async function beginAdminMfaEnrollment(currentPassword: string): Promise<MfaEnrollment> {
  const response = await adminApi.request<unknown>("/api/admin/v1/auth/mfa/enrollments", {
    method: "POST",
    body: { currentPassword },
  });
  return readMfaEnrollment(response.data);
}

export async function confirmAdminMfaEnrollment(enrollmentId: string, code: string): Promise<void> {
  await adminApi.request<unknown>("/api/admin/v1/auth/mfa/enrollments/confirm", {
    method: "POST",
    body: { enrollmentId, code },
  });
}

export async function listEmployees(cursor?: string): Promise<CursorPage<Employee>> {
  const response = await adminApi.request<unknown>("/api/admin/v1/employees", {
    query: { cursor, limit: 50 },
  });
  return readEmployeePage(response.data);
}

export async function listRoles(cursor?: string): Promise<CursorPage<Role>> {
  const response = await adminApi.request<unknown>("/api/admin/v1/roles", {
    query: { cursor, limit: 100 },
  });
  return readRolePage(response.data);
}

export async function listAudits(query: {
  actorId?: string | undefined;
  resourceId?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  cursor?: string | undefined;
}): Promise<CursorPage<AuditView>> {
  const response = await adminApi.request<unknown>("/api/admin/v1/audit-events", {
    query: { ...query, limit: 50 },
  });
  return readAuditPage(response.data);
}

export async function createEmployee(input: {
  clientIntentId: string;
  account: string;
  initialPassword: string;
  name: string;
  roleIds: readonly string[];
  scopeStationIds: readonly string[];
  reason: string;
  proofCode: string;
  idempotencyKey: string;
}): Promise<Employee> {
  const actionHash = await canonicalDigest([
    "EMPLOYEE_CREATE",
    input.account.toLowerCase(),
    input.name,
    sortedValues(input.roleIds),
    sortedValues(input.scopeStationIds),
    input.reason,
  ]);
  const token = await adminAuthorizeAction({
    purpose: "EMPLOYEE_CREATE",
    targetType: "CREATE_INTENT",
    resourceId: input.clientIntentId,
    expectedHash: actionHash,
    finalIdempotencyKey: input.idempotencyKey,
    proofCode: input.proofCode,
  });
  const response = await adminApi.request<unknown>("/api/admin/v1/employees", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    actionToken: token,
    body: {
      clientIntentId: input.clientIntentId,
      account: input.account,
      initialPassword: input.initialPassword,
      name: input.name,
      roleIds: input.roleIds,
      scopeStationIds: input.scopeStationIds,
      reason: input.reason,
    },
  });
  return readEmployee(response.data);
}

export async function updateEmployeePermissions(input: {
  employee: Employee;
  roleIds: readonly string[];
  scopeStationIds: readonly string[];
  reason: string;
  proofCode: string;
  idempotencyKey: string;
}): Promise<Employee> {
  const actionHash = await canonicalDigest([
    "EMPLOYEE_PERMISSION_CHANGE",
    input.employee.id,
    input.employee.version,
    sortedValues(input.roleIds),
    sortedValues(input.scopeStationIds),
    input.reason,
  ]);
  const token = await adminAuthorizeAction({
    purpose: "EMPLOYEE_PERMISSION_CHANGE",
    targetType: "EXISTING_RESOURCE",
    resourceId: input.employee.id,
    expectedHash: actionHash,
    finalIdempotencyKey: input.idempotencyKey,
    proofCode: input.proofCode,
  });
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/employees/${encodeURIComponent(input.employee.id)}/permissions`,
    {
      method: "PUT",
      idempotencyKey: input.idempotencyKey,
      actionToken: token,
      ifMatch: `"${input.employee.version}"`,
      body: {
        roleIds: input.roleIds,
        scopeStationIds: input.scopeStationIds,
        reason: input.reason,
      },
    },
  );
  return readEmployee(response.data);
}

export async function changeEmployeeStatus(input: {
  employee: Employee;
  status: "ENABLED" | "DISABLED";
  reason: string;
  idempotencyKey: string;
}): Promise<Employee> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/employees/${encodeURIComponent(input.employee.id)}/status`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      ifMatch: `"${input.employee.version}"`,
      body: { status: input.status, reason: input.reason },
    },
  );
  return readEmployee(response.data);
}

export async function uploadEmployeeRecoveryEvidence(
  file: File,
  keys: Readonly<{ prepare: string; commit: string }>,
): Promise<EvidenceUpload> {
  return uploadEvidence(file, "ACCOUNT_RECOVERY", keys);
}

export async function recoverEmployeeAccount(input: {
  employee: Employee;
  newPassword: string;
  evidenceId: string;
  reason: string;
  proofCode: string;
  idempotencyKey: string;
}): Promise<Employee> {
  const actionHash = await canonicalDigest([
    "EMPLOYEE_ACCOUNT_RECOVERY",
    input.employee.id,
    input.employee.version,
    input.evidenceId,
    input.reason,
  ]);
  const token = await adminAuthorizeAction({
    purpose: "EMPLOYEE_ACCOUNT_RECOVERY",
    targetType: "EXISTING_RESOURCE",
    resourceId: input.employee.id,
    expectedHash: actionHash,
    finalIdempotencyKey: input.idempotencyKey,
    proofCode: input.proofCode,
  });
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/employees/${encodeURIComponent(input.employee.id)}/recovery`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      actionToken: token,
      ifMatch: `"${input.employee.version}"`,
      body: {
        newPassword: input.newPassword,
        evidenceId: input.evidenceId,
        reason: input.reason,
      },
    },
  );
  return readEmployee(response.data);
}

export function newEmployeeIntent(operationId: string): string {
  return createIdempotencyKey(operationId);
}

export function newClientIntentId(): string {
  return crypto.randomUUID();
}

export type EmployeeFailureKind = "forbidden" | "not-ready" | "version" | "error";

export function employeeFailure(error: unknown): { kind: EmployeeFailureKind; message: string } {
  if (error instanceof ApiError) {
    if (error.problem.status === 401) {
      return { kind: "forbidden", message: "员工会话或 MFA 挑战已失效，请重新登录。" };
    }
    if (error.problem.status === 403) {
      return { kind: "forbidden", message: `当前员工权限或数据范围不足（${error.problem.code}）。` };
    }
    if (error.problem.code.includes("NOT_READY") || error.problem.code.includes("UNAVAILABLE")) {
      return { kind: "not-ready", message: `员工安全配置尚未就绪（${error.problem.code}）。` };
    }
    if ([409, 412, 428].includes(error.problem.status)) {
      return { kind: "version", message: `员工权限版本已经变化（${error.problem.code}），请重新加载后再操作。` };
    }
    if (error.submissionOutcome === "UNKNOWN") {
      return { kind: "error", message: `提交结果未知（${error.problem.code}）；请保留当前幂等意图并重新查询员工。` };
    }
    return { kind: "error", message: `${error.problem.title}（${error.problem.code}）` };
  }
  if (error instanceof ApiTransportError) {
    return {
      kind: "error",
      message: error.submissionOutcome === "UNKNOWN"
        ? "网络中断，提交结果未知；请不要换键重复提交。"
        : "无法连接员工域服务，请稍后重试。",
    };
  }
  return { kind: "error", message: "服务返回了当前页面无法识别的结果。" };
}

export async function adminAuthorizeAction(input: {
  purpose: "EMPLOYEE_CREATE" | "EMPLOYEE_PERMISSION_CHANGE" | "EMPLOYEE_ACCOUNT_RECOVERY";
  targetType: "CREATE_INTENT" | "EXISTING_RESOURCE";
  resourceId: string;
  expectedHash: string;
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
      expectedAmount: null,
      finalIdempotencyKey: input.finalIdempotencyKey,
      proofCode: input.proofCode,
    },
  });
  if (typeof response.data !== "object" || response.data === null || Array.isArray(response.data)) {
    throw new TypeError("ACTION_AUTHORIZATION_MISMATCH");
  }
  const token = (response.data as Record<string, unknown>).actionToken;
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
