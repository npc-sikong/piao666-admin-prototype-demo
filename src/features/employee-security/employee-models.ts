export interface MfaEnrollment {
  enrollmentId: string;
  provisioningUri: string;
  expiresAt: string;
}

export interface Employee {
  id: string;
  account: string;
  name: string;
  status: "ENABLED" | "DISABLED";
  roleIds: readonly string[];
  scopeStationIds: readonly string[];
  version: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: readonly string[];
}

export interface AuditView {
  id: string;
  actorId: string;
  operationId: string;
  resourceId: string;
  reason: string;
  beforeVersion: string | null;
  afterVersion: string | null;
  resultCode: string;
  createdAt: string;
  traceId: string;
}

export interface CursorPage<T> {
  items: readonly T[];
  nextCursor: string | null;
  hasMore: boolean;
  snapshotId: string | null;
}

export function readMfaEnrollment(value: unknown): MfaEnrollment {
  const root = object(value, "MFA_ENROLLMENT_MISMATCH");
  return {
    enrollmentId: text(root.enrollmentId, "MFA_ENROLLMENT_ID_MISMATCH"),
    provisioningUri: text(root.provisioningUri, "MFA_ENROLLMENT_URI_MISMATCH"),
    expiresAt: text(root.expiresAt, "MFA_ENROLLMENT_EXPIRY_MISMATCH"),
  };
}

export function readEmployeePage(value: unknown): CursorPage<Employee> {
  return readPage(value, readEmployee, "EMPLOYEE_PAGE_MISMATCH");
}

export function readEmployee(value: unknown): Employee {
  const root = object(value, "EMPLOYEE_MISMATCH");
  const status = text(root.status, "EMPLOYEE_STATUS_MISMATCH");
  if (status !== "ENABLED" && status !== "DISABLED") {
    throw new TypeError("EMPLOYEE_STATUS_MISMATCH");
  }
  return {
    id: text(root.id, "EMPLOYEE_ID_MISMATCH"),
    account: text(root.account, "EMPLOYEE_ACCOUNT_MISMATCH"),
    name: text(root.name, "EMPLOYEE_NAME_MISMATCH"),
    status,
    roleIds: strings(root.roleIds, "EMPLOYEE_ROLES_MISMATCH"),
    scopeStationIds: strings(root.scopeStationIds, "EMPLOYEE_SCOPE_MISMATCH"),
    version: text(root.version, "EMPLOYEE_VERSION_MISMATCH"),
  };
}

export function readRolePage(value: unknown): CursorPage<Role> {
  return readPage(value, (item) => {
    const root = object(item, "ROLE_MISMATCH");
    return {
      id: text(root.id, "ROLE_ID_MISMATCH"),
      name: text(root.name, "ROLE_NAME_MISMATCH"),
      permissions: strings(root.permissions, "ROLE_PERMISSIONS_MISMATCH"),
    };
  }, "ROLE_PAGE_MISMATCH");
}

export function readAuditPage(value: unknown): CursorPage<AuditView> {
  return readPage(value, (item) => {
    const root = object(item, "AUDIT_MISMATCH");
    return {
      id: text(root.id, "AUDIT_ID_MISMATCH"),
      actorId: text(root.actorId, "AUDIT_ACTOR_MISMATCH"),
      operationId: text(root.operationId, "AUDIT_OPERATION_MISMATCH"),
      resourceId: text(root.resourceId, "AUDIT_RESOURCE_MISMATCH"),
      reason: text(root.reason, "AUDIT_REASON_MISMATCH"),
      beforeVersion: nullableText(root.beforeVersion, "AUDIT_BEFORE_MISMATCH"),
      afterVersion: nullableText(root.afterVersion, "AUDIT_AFTER_MISMATCH"),
      resultCode: text(root.resultCode, "AUDIT_RESULT_MISMATCH"),
      createdAt: text(root.createdAt, "AUDIT_TIME_MISMATCH"),
      traceId: text(root.traceId, "AUDIT_TRACE_MISMATCH"),
    };
  }, "AUDIT_PAGE_MISMATCH");
}

function readPage<T>(value: unknown, reader: (item: unknown) => T, code: string): CursorPage<T> {
  const root = object(value, code);
  return {
    items: list(root.items, code).map(reader),
    nextCursor: nullableText(root.nextCursor, code),
    hasMore: boolean(root.hasMore, code),
    snapshotId: nullableText(root.snapshotId, code),
  };
}

function object(value: unknown, code: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(code);
  }
  return value as Record<string, unknown>;
}

function list(value: unknown, code: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError(code);
  }
  return value;
}

function strings(value: unknown, code: string): readonly string[] {
  return list(value, code).map((item) => text(item, code));
}

function text(value: unknown, code: string): string {
  if (typeof value !== "string") {
    throw new TypeError(code);
  }
  return value;
}

function nullableText(value: unknown, code: string): string | null {
  return value === null ? null : text(value, code);
}

function boolean(value: unknown, code: string): boolean {
  if (typeof value !== "boolean") {
    throw new TypeError(code);
  }
  return value;
}
