export type ToggleStatus = "ENABLED" | "DISABLED";

export interface NameRef {
  id: string;
  code: string;
  name: string;
}

export interface CursorPage<T> {
  items: readonly T[];
  nextCursor: string | null;
  hasMore: boolean;
  snapshotId: string | null;
}

export interface Station {
  id: string;
  code: string;
  name: string;
  regionLabel: string;
  status: ToggleStatus;
  remark: string;
  stationMasterCount: number;
  memberCount: number;
  version: string;
}

export interface StationLimits {
  singleGrantLimit: string;
  singleDeductLimit: string;
  dailyOperationLimit: string;
}

export interface StationMaster {
  id: string;
  code: string;
  userId: string;
  name: string;
  account: string;
  station: NameRef;
  status: ToggleStatus;
  limits: StationLimits;
  remark: string;
  disposablePoints: string;
  operationCredentialConfigured: boolean;
  memberCount: number;
  grantedMemberPoints: string;
  deductedMemberPoints: string;
  identityVersion: string;
  version: string;
}

export interface LedgerView {
  id: string;
  transactionId: string;
  type: string;
  bucket: "AVAILABLE" | "RESERVED" | "DISPOSABLE";
  changePoints: string;
  balanceBefore: string;
  balanceAfter: string;
  sourceType: string;
  sourceId: string;
  remark: string;
  createdAt: string;
}

export interface BudgetAccount {
  id: string;
  type: "DISTRIBUTION_BUDGET" | "ORDINARY_AWARD_BUDGET" | "AI_BUDGET" | "REFERRAL_BUDGET";
  availablePoints: string;
  reservedPoints: string;
  version: string;
}

export interface PointChangeReceipt {
  transactionId: string;
  operationType: "STATION_VIP_CREDIT" | "STATION_DEBIT" | "ADMIN_GRANT" | "ADMIN_DEDUCT";
  points: string;
  memberId: string | null;
  stationMasterId: string;
  stationMasterBalanceBefore: string;
  stationMasterBalanceAfter: string;
  memberBalanceBefore: string | null;
  memberBalanceAfter: string | null;
  createdAt: string;
}

export interface TaskAccepted {
  taskId: string;
  status: "PENDING" | "RUNNING" | "RETRY_WAIT";
  statusUrl: string;
  pollAfterSeconds: number;
}

export interface CommandResult {
  operationId: string;
  resourceId: string | null;
  taskId: string | null;
  status: "PROCESSING" | "SUCCEEDED" | "FAILED";
  httpStatus: number;
  resultUrl: string | null;
  failureCode: string | null;
}

export interface ReportFilter {
  from: string;
  to: string;
  asOf?: string | null;
  stationId?: string;
  stationMasterId?: string;
  memberId?: string;
  vipLevelId?: string;
  referralLevelId?: string;
  projectId?: string;
  lotteryId?: string;
  issueCode?: string;
  status?: string;
  affiliationMode?: "CURRENT_COHORT" | "EVENT_AFFILIATION";
  groupBy?: "DAY" | "STATION_MASTER";
}

export interface ReportRow {
  dimensions: Readonly<Record<string, unknown>>;
  metrics: Readonly<Record<string, unknown>>;
}

export interface StationMasterReport {
  reportType: "STATION_MASTERS";
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

export interface ExportStatus {
  id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "EXPIRED";
  rowCount: string;
  downloadUrl: string | null;
  expiresAt: string | null;
}

export function readStationPage(value: unknown): CursorPage<Station> {
  return readPage(value, readStation, "STATION_PAGE_MISMATCH");
}

export function readStation(value: unknown): Station {
  const item = record(value, "STATION_MISMATCH");
  return {
    id: text(item.id, "STATION_ID_MISMATCH"),
    code: text(item.code, "STATION_CODE_MISMATCH"),
    name: text(item.name, "STATION_NAME_MISMATCH"),
    regionLabel: text(item.regionLabel, "STATION_REGION_MISMATCH"),
    status: toggle(item.status, "STATION_STATUS_MISMATCH"),
    remark: text(item.remark, "STATION_REMARK_MISMATCH"),
    stationMasterCount: integer(item.stationMasterCount, "STATION_MASTER_COUNT_MISMATCH"),
    memberCount: integer(item.memberCount, "STATION_MEMBER_COUNT_MISMATCH"),
    version: text(item.version, "STATION_VERSION_MISMATCH"),
  };
}

export function readStationMasterPage(value: unknown): CursorPage<StationMaster> {
  return readPage(value, readStationMaster, "STATION_MASTER_PAGE_MISMATCH");
}

export function readStationMaster(value: unknown): StationMaster {
  const item = record(value, "STATION_MASTER_MISMATCH");
  const limits = record(item.limits, "STATION_LIMITS_MISMATCH");
  return {
    id: text(item.id, "STATION_MASTER_ID_MISMATCH"),
    code: text(item.code, "STATION_MASTER_CODE_MISMATCH"),
    userId: text(item.userId, "STATION_MASTER_USER_MISMATCH"),
    name: text(item.name, "STATION_MASTER_NAME_MISMATCH"),
    account: text(item.account, "STATION_MASTER_ACCOUNT_MISMATCH"),
    station: readNameRef(item.station),
    status: toggle(item.status, "STATION_MASTER_STATUS_MISMATCH"),
    limits: {
      singleGrantLimit: points(limits.singleGrantLimit, "STATION_GRANT_LIMIT_MISMATCH"),
      singleDeductLimit: points(limits.singleDeductLimit, "STATION_DEDUCT_LIMIT_MISMATCH"),
      dailyOperationLimit: points(limits.dailyOperationLimit, "STATION_DAILY_LIMIT_MISMATCH"),
    },
    remark: text(item.remark, "STATION_MASTER_REMARK_MISMATCH"),
    disposablePoints: points(item.disposablePoints, "STATION_MASTER_POINTS_MISMATCH"),
    operationCredentialConfigured: bool(item.operationCredentialConfigured, "STATION_CREDENTIAL_MISMATCH"),
    memberCount: integer(item.memberCount, "STATION_MASTER_MEMBER_COUNT_MISMATCH"),
    grantedMemberPoints: points(item.grantedMemberPoints, "STATION_GRANTED_POINTS_MISMATCH"),
    deductedMemberPoints: points(item.deductedMemberPoints, "STATION_DEDUCTED_POINTS_MISMATCH"),
    identityVersion: text(item.identityVersion, "STATION_MASTER_IDENTITY_VERSION_MISMATCH"),
    version: text(item.version, "STATION_MASTER_VERSION_MISMATCH"),
  };
}

export function readLedgerPage(value: unknown): CursorPage<LedgerView> {
  return readPage(value, (entry) => {
    const item = record(entry, "LEDGER_ITEM_MISMATCH");
    return {
      id: text(item.id, "LEDGER_ID_MISMATCH"),
      transactionId: text(item.transactionId, "LEDGER_TRANSACTION_MISMATCH"),
      type: text(item.type, "LEDGER_TYPE_MISMATCH"),
      bucket: oneOf(text(item.bucket, "LEDGER_BUCKET_MISMATCH"), ["AVAILABLE", "RESERVED", "DISPOSABLE"] as const, "LEDGER_BUCKET_MISMATCH"),
      changePoints: signedPoints(item.changePoints, "LEDGER_CHANGE_MISMATCH"),
      balanceBefore: points(item.balanceBefore, "LEDGER_BEFORE_MISMATCH"),
      balanceAfter: points(item.balanceAfter, "LEDGER_AFTER_MISMATCH"),
      sourceType: text(item.sourceType, "LEDGER_SOURCE_TYPE_MISMATCH"),
      sourceId: text(item.sourceId, "LEDGER_SOURCE_ID_MISMATCH"),
      remark: text(item.remark, "LEDGER_REMARK_MISMATCH"),
      createdAt: text(item.createdAt, "LEDGER_CREATED_MISMATCH"),
    };
  }, "LEDGER_PAGE_MISMATCH");
}

export function readBudgetPage(value: unknown): CursorPage<BudgetAccount> {
  return readPage(value, (entry) => {
    const item = record(entry, "BUDGET_ITEM_MISMATCH");
    return {
      id: text(item.id, "BUDGET_ID_MISMATCH"),
      type: oneOf(text(item.type, "BUDGET_TYPE_MISMATCH"), [
        "DISTRIBUTION_BUDGET", "ORDINARY_AWARD_BUDGET", "AI_BUDGET", "REFERRAL_BUDGET",
      ] as const, "BUDGET_TYPE_MISMATCH"),
      availablePoints: points(item.availablePoints, "BUDGET_AVAILABLE_MISMATCH"),
      reservedPoints: points(item.reservedPoints, "BUDGET_RESERVED_MISMATCH"),
      version: text(item.version, "BUDGET_VERSION_MISMATCH"),
    };
  }, "BUDGET_PAGE_MISMATCH");
}

export function readPointChangeReceipt(value: unknown): PointChangeReceipt {
  const item = record(value, "POINT_RECEIPT_MISMATCH");
  return {
    transactionId: text(item.transactionId, "POINT_RECEIPT_TRANSACTION_MISMATCH"),
    operationType: oneOf(text(item.operationType, "POINT_RECEIPT_TYPE_MISMATCH"), [
      "STATION_VIP_CREDIT", "STATION_DEBIT", "ADMIN_GRANT", "ADMIN_DEDUCT",
    ] as const, "POINT_RECEIPT_TYPE_MISMATCH"),
    points: points(item.points, "POINT_RECEIPT_POINTS_MISMATCH"),
    memberId: nullableText(item.memberId, "POINT_RECEIPT_MEMBER_MISMATCH"),
    stationMasterId: text(item.stationMasterId, "POINT_RECEIPT_MASTER_MISMATCH"),
    stationMasterBalanceBefore: points(item.stationMasterBalanceBefore, "POINT_RECEIPT_BEFORE_MISMATCH"),
    stationMasterBalanceAfter: points(item.stationMasterBalanceAfter, "POINT_RECEIPT_AFTER_MISMATCH"),
    memberBalanceBefore: nullablePoints(item.memberBalanceBefore, "POINT_RECEIPT_MEMBER_BEFORE_MISMATCH"),
    memberBalanceAfter: nullablePoints(item.memberBalanceAfter, "POINT_RECEIPT_MEMBER_AFTER_MISMATCH"),
    createdAt: text(item.createdAt, "POINT_RECEIPT_CREATED_MISMATCH"),
  };
}

export function readTaskAccepted(value: unknown): TaskAccepted {
  const item = record(value, "TASK_ACCEPTED_MISMATCH");
  return {
    taskId: text(item.taskId, "TASK_ID_MISMATCH"),
    status: oneOf(text(item.status, "TASK_STATUS_MISMATCH"), ["PENDING", "RUNNING", "RETRY_WAIT"] as const, "TASK_STATUS_MISMATCH"),
    statusUrl: text(item.statusUrl, "TASK_URL_MISMATCH"),
    pollAfterSeconds: integer(item.pollAfterSeconds, "TASK_POLL_MISMATCH"),
  };
}

export function readCommandResult(value: unknown): CommandResult {
  const item = record(value, "COMMAND_RESULT_MISMATCH");
  return {
    operationId: text(item.operationId, "COMMAND_OPERATION_MISMATCH"),
    resourceId: nullableText(item.resourceId, "COMMAND_RESOURCE_MISMATCH"),
    taskId: nullableText(item.taskId, "COMMAND_TASK_MISMATCH"),
    status: oneOf(text(item.status, "COMMAND_STATUS_MISMATCH"), ["PROCESSING", "SUCCEEDED", "FAILED"] as const, "COMMAND_STATUS_MISMATCH"),
    httpStatus: integer(item.httpStatus, "COMMAND_HTTP_STATUS_MISMATCH"),
    resultUrl: nullableText(item.resultUrl, "COMMAND_RESULT_URL_MISMATCH"),
    failureCode: nullableText(item.failureCode, "COMMAND_FAILURE_MISMATCH"),
  };
}

export function readStationMasterReport(value: unknown): StationMasterReport {
  const root = record(value, "REPORT_MISMATCH");
  if (text(root.reportType, "REPORT_TYPE_MISMATCH") !== "STATION_MASTERS") {
    throw new TypeError("REPORT_TYPE_MISMATCH");
  }
  const filter = record(root.filters, "REPORT_FILTER_MISMATCH");
  return {
    reportType: "STATION_MASTERS",
    metricDictionaryVersion: text(root.metricDictionaryVersion, "REPORT_DICTIONARY_MISMATCH"),
    snapshotId: text(root.snapshotId, "REPORT_SNAPSHOT_MISMATCH"),
    filters: readReportFilter(filter),
    asOf: text(root.asOf, "REPORT_AS_OF_MISMATCH"),
    projectionVersion: text(root.projectionVersion, "REPORT_PROJECTION_MISMATCH"),
    sourceWatermark: text(root.sourceWatermark, "REPORT_WATERMARK_MISMATCH"),
    items: array(root.items, "REPORT_ITEMS_MISMATCH").map((entry) => {
      const row = record(entry, "REPORT_ROW_MISMATCH");
      return {
        dimensions: objectMap(row.dimensions, "REPORT_DIMENSIONS_MISMATCH"),
        metrics: objectMap(row.metrics, "REPORT_METRICS_MISMATCH"),
      };
    }),
    totals: objectMap(root.totals, "REPORT_TOTALS_MISMATCH"),
    totalScope: oneOf(text(root.totalScope, "REPORT_TOTAL_SCOPE_MISMATCH"), ["FULL_FILTER"] as const, "REPORT_TOTAL_SCOPE_MISMATCH"),
    nextCursor: nullableText(root.nextCursor, "REPORT_CURSOR_MISMATCH"),
    hasMore: bool(root.hasMore, "REPORT_HAS_MORE_MISMATCH"),
    complete: bool(root.complete, "REPORT_COMPLETE_MISMATCH"),
  };
}

export function readExportStatus(value: unknown): ExportStatus {
  const item = record(value, "EXPORT_STATUS_MISMATCH");
  return {
    id: text(item.id, "EXPORT_ID_MISMATCH"),
    status: oneOf(text(item.status, "EXPORT_STATE_MISMATCH"), ["PENDING", "RUNNING", "COMPLETED", "FAILED", "EXPIRED"] as const, "EXPORT_STATE_MISMATCH"),
    rowCount: text(item.rowCount, "EXPORT_ROWS_MISMATCH"),
    downloadUrl: nullableText(item.downloadUrl, "EXPORT_URL_MISMATCH"),
    expiresAt: nullableText(item.expiresAt, "EXPORT_EXPIRES_MISMATCH"),
  };
}

export function reportMetric(metrics: Readonly<Record<string, unknown>>, key: string): string {
  const value = metrics[key];
  return typeof value === "string" ? value : "—";
}

export function reportDimensionName(
  dimensions: Readonly<Record<string, unknown>>,
  key: "station" | "stationMaster",
): string {
  const value = dimensions[key];
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "—";
  }
  const name = (value as Record<string, unknown>).name;
  return typeof name === "string" ? name : "—";
}

function readNameRef(value: unknown): NameRef {
  const item = record(value, "NAME_REF_MISMATCH");
  return {
    id: text(item.id, "NAME_REF_ID_MISMATCH"),
    code: text(item.code, "NAME_REF_CODE_MISMATCH"),
    name: text(item.name, "NAME_REF_NAME_MISMATCH"),
  };
}

function readReportFilter(value: Readonly<Record<string, unknown>>): ReportFilter {
  const asOf = optionalNullableTextValue(value.asOf, "REPORT_FILTER_ASOF_MISMATCH");
  const stationId = optionalTextValue(value.stationId, "REPORT_FILTER_STATIONID_MISMATCH");
  const stationMasterId = optionalTextValue(value.stationMasterId, "REPORT_FILTER_STATIONMASTERID_MISMATCH");
  const memberId = optionalTextValue(value.memberId, "REPORT_FILTER_MEMBERID_MISMATCH");
  const vipLevelId = optionalTextValue(value.vipLevelId, "REPORT_FILTER_VIPLEVELID_MISMATCH");
  const referralLevelId = optionalTextValue(value.referralLevelId, "REPORT_FILTER_REFERRALLEVELID_MISMATCH");
  const projectId = optionalTextValue(value.projectId, "REPORT_FILTER_PROJECTID_MISMATCH");
  const lotteryId = optionalTextValue(value.lotteryId, "REPORT_FILTER_LOTTERYID_MISMATCH");
  const issueCode = optionalTextValue(value.issueCode, "REPORT_FILTER_ISSUECODE_MISMATCH");
  const status = optionalTextValue(value.status, "REPORT_FILTER_STATUS_MISMATCH");
  const affiliationMode = value.affiliationMode === undefined || value.affiliationMode === null
    ? undefined
    : oneOf(text(value.affiliationMode, "REPORT_FILTER_AFFILIATION_MISMATCH"), ["CURRENT_COHORT", "EVENT_AFFILIATION"] as const, "REPORT_FILTER_AFFILIATION_MISMATCH");
  const groupBy = value.groupBy === undefined || value.groupBy === null
    ? undefined
    : oneOf(text(value.groupBy, "REPORT_FILTER_GROUP_MISMATCH"), ["DAY", "STATION_MASTER"] as const, "REPORT_FILTER_GROUP_MISMATCH");
  return {
    from: text(value.from, "REPORT_FILTER_FROM_MISMATCH"),
    to: text(value.to, "REPORT_FILTER_TO_MISMATCH"),
    ...(asOf === undefined ? {} : { asOf }),
    ...(stationId === undefined ? {} : { stationId }),
    ...(stationMasterId === undefined ? {} : { stationMasterId }),
    ...(memberId === undefined ? {} : { memberId }),
    ...(vipLevelId === undefined ? {} : { vipLevelId }),
    ...(referralLevelId === undefined ? {} : { referralLevelId }),
    ...(projectId === undefined ? {} : { projectId }),
    ...(lotteryId === undefined ? {} : { lotteryId }),
    ...(issueCode === undefined ? {} : { issueCode }),
    ...(status === undefined ? {} : { status }),
    ...(affiliationMode === undefined ? {} : { affiliationMode }),
    ...(groupBy === undefined ? {} : { groupBy }),
  };
}

function optionalTextValue(value: unknown, code: string): string | undefined {
  return value === undefined || value === null ? undefined : text(value, code);
}

function optionalNullableTextValue(value: unknown, code: string): string | null | undefined {
  return value === undefined ? undefined : nullableText(value, code);
}

function readPage<T>(
  value: unknown,
  readItem: (entry: unknown) => T,
  code: string,
): CursorPage<T> {
  const root = record(value, code);
  return {
    items: array(root.items, code).map(readItem),
    nextCursor: nullableText(root.nextCursor, code),
    hasMore: bool(root.hasMore, code),
    snapshotId: nullableText(root.snapshotId, code),
  };
}

function toggle(value: unknown, code: string): ToggleStatus {
  return oneOf(text(value, code), ["ENABLED", "DISABLED"] as const, code);
}

function record(value: unknown, code: string): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(code);
  }
  return value as Readonly<Record<string, unknown>>;
}

function objectMap(value: unknown, code: string): Readonly<Record<string, unknown>> {
  return record(value, code);
}

function array(value: unknown, code: string): readonly unknown[] {
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

function points(value: unknown, code: string): string {
  const result = text(value, code);
  if (!/^(0|[1-9][0-9]{0,15})\.[0-9]{2}$/.test(result)) {
    throw new TypeError(code);
  }
  return result;
}

function signedPoints(value: unknown, code: string): string {
  const result = text(value, code);
  if (!/^-?(0|[1-9][0-9]{0,15})\.[0-9]{2}$/.test(result)) {
    throw new TypeError(code);
  }
  return result;
}

function nullablePoints(value: unknown, code: string): string | null {
  return value === null ? null : points(value, code);
}

function nullableText(value: unknown, code: string): string | null {
  return value === null ? null : text(value, code);
}

function integer(value: unknown, code: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new TypeError(code);
  }
  return value;
}

function bool(value: unknown, code: string): boolean {
  if (typeof value !== "boolean") {
    throw new TypeError(code);
  }
  return value;
}

function oneOf<const T extends readonly string[]>(
  value: string,
  values: T,
  code: string,
): T[number] {
  if (!values.includes(value as T[number])) {
    throw new TypeError(code);
  }
  return value as T[number];
}
