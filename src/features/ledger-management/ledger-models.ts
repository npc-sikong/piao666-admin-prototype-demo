export interface ReportFilter {
  from: string;
  to: string;
  asOf?: string | null;
  status?: string | null;
  groupBy?: string | null;
  [key: string]: unknown;
}

export interface ReportRow {
  dimensions: Readonly<Record<string, unknown>>;
  metrics: Readonly<Record<string, unknown>>;
}

export interface LedgerReport {
  reportType: "LEDGER_RECONCILIATION";
  metricDictionaryVersion: string;
  snapshotId: string;
  filters: ReportFilter;
  asOf: string;
  projectionVersion: string;
  sourceWatermark: string;
  items: readonly ReportRow[];
  totals: Readonly<Record<string, unknown>>;
  totalScope: "FULL_FILTER";
  nextCursor: string | null;
  hasMore: boolean;
  complete: boolean;
}

export interface BudgetAccount {
  id: string;
  type: "DISTRIBUTION_BUDGET" | "ORDINARY_AWARD_BUDGET" | "AI_BUDGET" | "REFERRAL_BUDGET";
  availablePoints: string;
  reservedPoints: string;
  version: string;
}

export interface BudgetAccountPage {
  items: readonly BudgetAccount[];
  nextCursor: string | null;
  hasMore: boolean;
  snapshotId: string | null;
}

export type LedgerAssetType = "POINTS";
export type LedgerEntryDirection = "CREDIT" | "DEBIT";

export interface AdminLedgerEntry {
  id: string;
  entryNo: number;
  accountId: string;
  ownerType: string;
  ownerId: string;
  ownerAccount: string | null;
  ownerName: string | null;
  assetType: LedgerAssetType;
  bucket: string;
  direction: LedgerEntryDirection;
  changePoints: string;
  balanceBefore: string;
  balanceAfter: string;
}

export interface AdminLedgerTransaction {
  id: string;
  sequence: string;
  businessNumber: string;
  assetType: LedgerAssetType;
  sourceType: string;
  sourceId: string;
  type: string;
  status: string;
  economicPoints: string;
  reversedPoints: string;
  referenceTransactionId: string | null;
  stationId: string | null;
  stationCode: string | null;
  stationName: string | null;
  stationMasterId: string | null;
  stationMasterCode: string | null;
  stationMasterName: string | null;
  memberId: string | null;
  issueCode: string | null;
  operatorRealm: string;
  operatorId: string;
  reason: string;
  createdAt: string;
  entries: readonly AdminLedgerEntry[];
}

export interface AdminLedgerTransactionPage {
  items: readonly AdminLedgerTransaction[];
  nextCursor: string | null;
  hasMore: boolean;
  snapshotId: string | null;
}

export interface TaskAccepted {
  taskId: string;
  status: string;
  statusUrl: string;
  pollAfterSeconds: number;
}

export interface TaskStatus {
  id: string;
  taskType: string;
  status: string;
  progress: number;
  resultUrl: string | null;
  resultCode: string | null;
  failureCode: string | null;
  updatedAt: string;
}

export interface ExportStatus {
  id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "EXPIRED";
  rowCount: string;
  downloadUrl: string | null;
  expiresAt: string | null;
}

export interface Reconciliation {
  id: string;
  status: "PENDING" | "RUNNING" | "MATCHED" | "MISMATCH";
  expectedPoints: string | null;
  actualPoints: string | null;
  differencePoints: string | null;
  asOf: string | null;
}

export interface CommandReceipt {
  commandId: string;
  operationId: string;
  resourceId: string;
  status: "ACCEPTED" | "COMPLETED";
  createdAt: string;
}

export function readLedgerReport(value: unknown): LedgerReport {
  const root = object(value, "LEDGER_REPORT_MISMATCH");
  if (text(root.reportType, "LEDGER_REPORT_TYPE_MISMATCH") !== "LEDGER_RECONCILIATION") {
    throw new TypeError("LEDGER_REPORT_TYPE_MISMATCH");
  }
  const totalScope = text(root.totalScope, "LEDGER_REPORT_SCOPE_MISMATCH");
  if (totalScope !== "FULL_FILTER") {
    throw new TypeError("LEDGER_REPORT_SCOPE_MISMATCH");
  }
  const rawFilters = object(root.filters, "LEDGER_REPORT_FILTERS_MISMATCH");
  const filters: ReportFilter = {
    ...rawFilters,
    from: text(rawFilters.from, "LEDGER_REPORT_FILTER_FROM_MISMATCH"),
    to: text(rawFilters.to, "LEDGER_REPORT_FILTER_TO_MISMATCH"),
  };
  return {
    reportType: "LEDGER_RECONCILIATION",
    metricDictionaryVersion: text(root.metricDictionaryVersion, "LEDGER_REPORT_DICTIONARY_MISMATCH"),
    snapshotId: text(root.snapshotId, "LEDGER_REPORT_SNAPSHOT_MISMATCH"),
    filters,
    asOf: text(root.asOf, "LEDGER_REPORT_TIME_MISMATCH"),
    projectionVersion: text(root.projectionVersion, "LEDGER_REPORT_PROJECTION_MISMATCH"),
    sourceWatermark: text(root.sourceWatermark, "LEDGER_REPORT_WATERMARK_MISMATCH"),
    items: list(root.items, "LEDGER_REPORT_ITEMS_MISMATCH").map((value) => {
      const item = object(value, "LEDGER_REPORT_ROW_MISMATCH");
      return {
        dimensions: object(item.dimensions, "LEDGER_REPORT_DIMENSIONS_MISMATCH"),
        metrics: object(item.metrics, "LEDGER_REPORT_METRICS_MISMATCH"),
      };
    }),
    totals: object(root.totals, "LEDGER_REPORT_TOTALS_MISMATCH"),
    totalScope,
    nextCursor: nullableText(root.nextCursor, "LEDGER_REPORT_CURSOR_MISMATCH"),
    hasMore: boolean(root.hasMore, "LEDGER_REPORT_MORE_MISMATCH"),
    complete: boolean(root.complete, "LEDGER_REPORT_COMPLETE_MISMATCH"),
  };
}

export function readBudgetPage(value: unknown): BudgetAccountPage {
  const root = object(value, "BUDGET_PAGE_MISMATCH");
  return {
    items: list(root.items, "BUDGET_ITEMS_MISMATCH").map((value) => {
      const item = object(value, "BUDGET_MISMATCH");
      const type = text(item.type, "BUDGET_TYPE_MISMATCH") as BudgetAccount["type"];
      if (!["DISTRIBUTION_BUDGET", "ORDINARY_AWARD_BUDGET", "AI_BUDGET", "REFERRAL_BUDGET"].includes(type)) {
        throw new TypeError("BUDGET_TYPE_MISMATCH");
      }
      return {
        id: text(item.id, "BUDGET_ID_MISMATCH"),
        type,
        availablePoints: text(item.availablePoints, "BUDGET_AVAILABLE_MISMATCH"),
        reservedPoints: text(item.reservedPoints, "BUDGET_RESERVED_MISMATCH"),
        version: text(item.version, "BUDGET_VERSION_MISMATCH"),
      };
    }),
    nextCursor: nullableText(root.nextCursor, "BUDGET_CURSOR_MISMATCH"),
    hasMore: boolean(root.hasMore, "BUDGET_MORE_MISMATCH"),
    snapshotId: nullableText(root.snapshotId, "BUDGET_SNAPSHOT_MISMATCH"),
  };
}

export function readAdminLedgerTransactionPage(value: unknown): AdminLedgerTransactionPage {
  const root = object(value, "ADMIN_LEDGER_PAGE_MISMATCH");
  return {
    items: list(root.items, "ADMIN_LEDGER_ITEMS_MISMATCH").map(readAdminLedgerTransaction),
    nextCursor: nullableText(root.nextCursor, "ADMIN_LEDGER_CURSOR_MISMATCH"),
    hasMore: boolean(root.hasMore, "ADMIN_LEDGER_MORE_MISMATCH"),
    snapshotId: nullableText(root.snapshotId, "ADMIN_LEDGER_SNAPSHOT_MISMATCH"),
  };
}

function readAdminLedgerTransaction(value: unknown): AdminLedgerTransaction {
  const item = object(value, "ADMIN_LEDGER_TRANSACTION_MISMATCH");
  const assetType = text(item.assetType, "ADMIN_LEDGER_ASSET_MISMATCH");
  if (assetType !== "POINTS") throw new TypeError("ADMIN_LEDGER_ASSET_MISMATCH");
  return {
    id: text(item.id, "ADMIN_LEDGER_ID_MISMATCH"),
    sequence: text(item.sequence, "ADMIN_LEDGER_SEQUENCE_MISMATCH"),
    businessNumber: text(item.businessNumber, "ADMIN_LEDGER_BUSINESS_MISMATCH"),
    assetType,
    sourceType: text(item.sourceType, "ADMIN_LEDGER_SOURCE_TYPE_MISMATCH"),
    sourceId: text(item.sourceId, "ADMIN_LEDGER_SOURCE_ID_MISMATCH"),
    type: text(item.type, "ADMIN_LEDGER_TYPE_MISMATCH"),
    status: text(item.status, "ADMIN_LEDGER_STATUS_MISMATCH"),
    economicPoints: text(item.economicPoints, "ADMIN_LEDGER_AMOUNT_MISMATCH"),
    reversedPoints: text(item.reversedPoints, "ADMIN_LEDGER_REVERSED_MISMATCH"),
    referenceTransactionId: nullableText(item.referenceTransactionId, "ADMIN_LEDGER_REFERENCE_MISMATCH"),
    stationId: nullableText(item.stationId, "ADMIN_LEDGER_STATION_MISMATCH"),
    stationCode: nullableText(item.stationCode, "ADMIN_LEDGER_STATION_CODE_MISMATCH"),
    stationName: nullableText(item.stationName, "ADMIN_LEDGER_STATION_NAME_MISMATCH"),
    stationMasterId: nullableText(item.stationMasterId, "ADMIN_LEDGER_MASTER_MISMATCH"),
    stationMasterCode: nullableText(item.stationMasterCode, "ADMIN_LEDGER_MASTER_CODE_MISMATCH"),
    stationMasterName: nullableText(item.stationMasterName, "ADMIN_LEDGER_MASTER_NAME_MISMATCH"),
    memberId: nullableText(item.memberId, "ADMIN_LEDGER_MEMBER_MISMATCH"),
    issueCode: nullableText(item.issueCode, "ADMIN_LEDGER_ISSUE_MISMATCH"),
    operatorRealm: text(item.operatorRealm, "ADMIN_LEDGER_OPERATOR_REALM_MISMATCH"),
    operatorId: text(item.operatorId, "ADMIN_LEDGER_OPERATOR_MISMATCH"),
    reason: text(item.reason, "ADMIN_LEDGER_REASON_MISMATCH"),
    createdAt: text(item.createdAt, "ADMIN_LEDGER_TIME_MISMATCH"),
    entries: list(item.entries, "ADMIN_LEDGER_ENTRIES_MISMATCH").map(readAdminLedgerEntry),
  };
}

function readAdminLedgerEntry(value: unknown): AdminLedgerEntry {
  const item = object(value, "ADMIN_LEDGER_ENTRY_MISMATCH");
  const assetType = text(item.assetType, "ADMIN_LEDGER_ENTRY_ASSET_MISMATCH");
  const direction = text(item.direction, "ADMIN_LEDGER_DIRECTION_MISMATCH");
  if (assetType !== "POINTS") throw new TypeError("ADMIN_LEDGER_ENTRY_ASSET_MISMATCH");
  if (direction !== "CREDIT" && direction !== "DEBIT") {
    throw new TypeError("ADMIN_LEDGER_DIRECTION_MISMATCH");
  }
  return {
    id: text(item.id, "ADMIN_LEDGER_ENTRY_ID_MISMATCH"),
    entryNo: integer(item.entryNo, "ADMIN_LEDGER_ENTRY_NO_MISMATCH"),
    accountId: text(item.accountId, "ADMIN_LEDGER_ACCOUNT_ID_MISMATCH"),
    ownerType: text(item.ownerType, "ADMIN_LEDGER_OWNER_TYPE_MISMATCH"),
    ownerId: text(item.ownerId, "ADMIN_LEDGER_OWNER_ID_MISMATCH"),
    ownerAccount: nullableText(item.ownerAccount, "ADMIN_LEDGER_OWNER_ACCOUNT_MISMATCH"),
    ownerName: nullableText(item.ownerName, "ADMIN_LEDGER_OWNER_NAME_MISMATCH"),
    assetType,
    bucket: text(item.bucket, "ADMIN_LEDGER_BUCKET_MISMATCH"),
    direction,
    changePoints: text(item.changePoints, "ADMIN_LEDGER_CHANGE_MISMATCH"),
    balanceBefore: text(item.balanceBefore, "ADMIN_LEDGER_BEFORE_MISMATCH"),
    balanceAfter: text(item.balanceAfter, "ADMIN_LEDGER_AFTER_MISMATCH"),
  };
}

export function readTaskAccepted(value: unknown): TaskAccepted {
  const root = object(value, "TASK_ACCEPTED_MISMATCH");
  return {
    taskId: text(root.taskId, "TASK_ID_MISMATCH"),
    status: text(root.status, "TASK_STATUS_MISMATCH"),
    statusUrl: text(root.statusUrl, "TASK_URL_MISMATCH"),
    pollAfterSeconds: integer(root.pollAfterSeconds, "TASK_POLL_MISMATCH"),
  };
}

export function readTaskStatus(value: unknown): TaskStatus {
  const root = object(value, "TASK_STATUS_MISMATCH");
  return {
    id: text(root.id, "TASK_STATUS_ID_MISMATCH"),
    taskType: text(root.taskType, "TASK_TYPE_MISMATCH"),
    status: text(root.status, "TASK_STATE_MISMATCH"),
    progress: number(root.progress, "TASK_PROGRESS_MISMATCH"),
    resultUrl: nullableText(root.resultUrl, "TASK_RESULT_URL_MISMATCH"),
    resultCode: nullableText(root.resultCode, "TASK_RESULT_CODE_MISMATCH"),
    failureCode: nullableText(root.failureCode, "TASK_FAILURE_MISMATCH"),
    updatedAt: text(root.updatedAt, "TASK_UPDATED_MISMATCH"),
  };
}

export function readExportStatus(value: unknown): ExportStatus {
  const root = object(value, "EXPORT_STATUS_MISMATCH");
  const status = text(root.status, "EXPORT_STATE_MISMATCH") as ExportStatus["status"];
  if (!["PENDING", "RUNNING", "COMPLETED", "FAILED", "EXPIRED"].includes(status)) {
    throw new TypeError("EXPORT_STATE_MISMATCH");
  }
  return {
    id: text(root.id, "EXPORT_ID_MISMATCH"),
    status,
    rowCount: text(root.rowCount, "EXPORT_ROWS_MISMATCH"),
    downloadUrl: nullableText(root.downloadUrl, "EXPORT_URL_MISMATCH"),
    expiresAt: nullableText(root.expiresAt, "EXPORT_EXPIRY_MISMATCH"),
  };
}

export function readReconciliation(value: unknown): Reconciliation {
  const root = object(value, "RECONCILIATION_MISMATCH");
  const status = text(root.status, "RECONCILIATION_STATUS_MISMATCH") as Reconciliation["status"];
  if (!["PENDING", "RUNNING", "MATCHED", "MISMATCH"].includes(status)) {
    throw new TypeError("RECONCILIATION_STATUS_MISMATCH");
  }
  return {
    id: text(root.id, "RECONCILIATION_ID_MISMATCH"),
    status,
    expectedPoints: nullableText(root.expectedPoints, "RECONCILIATION_EXPECTED_MISMATCH"),
    actualPoints: nullableText(root.actualPoints, "RECONCILIATION_ACTUAL_MISMATCH"),
    differencePoints: nullableText(root.differencePoints, "RECONCILIATION_DIFFERENCE_MISMATCH"),
    asOf: nullableText(root.asOf, "RECONCILIATION_TIME_MISMATCH"),
  };
}

export function readCommandReceipt(value: unknown): CommandReceipt {
  const root = object(value, "COMMAND_RECEIPT_MISMATCH");
  const status = text(root.status, "COMMAND_STATUS_MISMATCH");
  if (status !== "ACCEPTED" && status !== "COMPLETED") {
    throw new TypeError("COMMAND_STATUS_MISMATCH");
  }
  return {
    commandId: text(root.commandId, "COMMAND_ID_MISMATCH"),
    operationId: text(root.operationId, "COMMAND_OPERATION_MISMATCH"),
    resourceId: text(root.resourceId, "COMMAND_RESOURCE_MISMATCH"),
    status,
    createdAt: text(root.createdAt, "COMMAND_TIME_MISMATCH"),
  };
}

export function metric(value: Readonly<Record<string, unknown>>, key: string): string | null {
  const found = value[key];
  return typeof found === "string" || typeof found === "number" ? String(found) : null;
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

function integer(value: unknown, code: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new TypeError(code);
  }
  return value;
}

function number(value: unknown, code: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(code);
  }
  return value;
}
