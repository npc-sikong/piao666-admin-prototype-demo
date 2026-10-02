export type StatusToggle = "ENABLED" | "DISABLED";
export type QualificationStatus = "READY" | "REBUILDING" | "UNCONFIGURED";
export type EligibilityStatus = "READY" | "UPDATING" | "UNAVAILABLE";

export interface NameRef {
  id: string;
  code: string;
  name: string;
}

export interface MemberScope {
  station: NameRef;
  stationMaster: NameRef;
  referrerMember: NameRef | null;
  version: string;
}

export interface MemberWallet {
  availablePoints: string;
  reservedPoints: string;
  asOf: string;
  ledgerWatermark: string;
}

export interface MemberQuota {
  businessDate: string;
  timeZone: string;
  vipBaseLimit: string;
  referralExtraLimit: string;
  totalLimit: string;
  usedPoints: string;
  remainingPoints: string;
  eligibilityStatus: EligibilityStatus;
  qualificationVersion: string;
  vipConfigVersion: string;
  referralConfigVersion: string;
  asOf: string;
}

export interface MemberAdmin {
  id: string;
  account: string;
  displayName: string;
  status: StatusToggle;
  scope: MemberScope;
  qualifiedRechargePoints: string;
  stationDeductedPoints: string;
  wallet: MemberWallet;
  vipName: string;
  referralName: string;
  quota: MemberQuota;
  totalBetPoints: string;
  netProfitPoints: string;
  aiDividendPoints: string;
  totalReferralPoints: string;
  directMemberCount: number;
  directMemberAvailableTotal: string;
  descendantMemberCount: number;
  descendantMemberAvailableTotal: string;
  inviteCode: string;
  version: string;
}

export interface CursorPage<T> {
  items: readonly T[];
  nextCursor: string | null;
  hasMore: boolean;
  snapshotId: string | null;
}

export type MemberAdminPage = CursorPage<MemberAdmin> & { totalCount: number };

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

export type LedgerViewPage = CursorPage<LedgerView>;

export interface MemberOrder {
  id: string;
  type: "ORDINARY" | "AI_POOL";
  projectId: string | null;
  projectName: string | null;
  lotteryId: string;
  playId: string;
  issueCode: string;
  status: string;
  purchasePoints: string;
  dueAwardPoints: string | null;
  netPostedAwardPoints: string;
  refundPoints: string;
  settlementVersion: string | null;
  createdAt: string;
  detailUrl: string;
}

export type MemberOrderPage = CursorPage<MemberOrder>;

export interface VipLevel {
  id: string;
  levelNo: number;
  name: string;
  requiredRechargePoints: string;
  aiPoolBaseDailyLimit: string;
}

export interface VipConfig {
  version: string;
  levels: readonly VipLevel[];
  createdAt: string | null;
  qualificationStatus: QualificationStatus;
}

export type VipConfigPage = CursorPage<VipConfig>;

export interface ReferralLevel {
  id: string;
  levelNo: number;
  name: string;
  requiredDirectValidMembers: number;
  validRechargePoints: string;
  fixedRewardPoints: string;
  directAiShareRate: string;
  aiExtraDailyLimit: string;
  status: StatusToggle;
}

export interface ReferralConfig {
  version: string;
  levels: readonly ReferralLevel[];
  fixedRewardPolicyVersion: string | null;
  aiSharePolicyVersion: string | null;
  qualificationStatus: QualificationStatus;
}

export type ReferralConfigPage = CursorPage<ReferralConfig>;

export interface CommandReceipt {
  commandId: string;
  operationId: string;
  resourceId: string;
  status: "ACCEPTED" | "COMPLETED";
  createdAt: string;
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

export interface TaskAccepted {
  taskId: string;
  status: "PENDING" | "RUNNING" | "RETRY_WAIT";
  statusUrl: string;
  pollAfterSeconds: number;
}

export interface TaskStatusSummary {
  id: string;
  taskType: string;
  status: "PENDING" | "RUNNING" | "RETRY_WAIT" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  progress: number;
  resultUrl: string | null;
  resultCode: string | null;
  failureCode: string | null;
  updatedAt: string;
}

export type MemberReportType =
  | "MEMBER_OVERVIEW"
  | "MEMBER_POINTS"
  | "VIP_LEVELS"
  | "REFERRAL_LEVELS"
  | "AI_QUOTA";

export interface ReportFilter {
  from: string;
  to: string;
  asOf?: string | undefined;
  stationId?: string | undefined;
  stationMasterId?: string | undefined;
  memberId?: string | undefined;
  vipLevelId?: string | undefined;
  referralLevelId?: string | undefined;
  groupBy?: string | undefined;
}

export interface ReportRow {
  dimensions: Readonly<Record<string, unknown>>;
  metrics: Readonly<Record<string, unknown>>;
}

export interface ReportResult {
  reportType: MemberReportType;
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

export interface ActionAuthorization {
  actionToken: string;
  expiresAt: string;
}

export function readMemberAdminPage(value: unknown): MemberAdminPage {
  const root = record(value, "MEMBER_PAGE_MISMATCH");
  return { ...readPage(value, readMemberAdmin, "MEMBER_PAGE_MISMATCH"), totalCount: integer(root.totalCount, "MEMBER_TOTAL_MISMATCH") };
}

export function readMemberAdmin(value: unknown): MemberAdmin {
  const root = record(value, "MEMBER_MISMATCH");
  return {
    id: text(root.id, "MEMBER_ID_MISMATCH"),
    account: text(root.account, "MEMBER_ACCOUNT_MISMATCH"),
    displayName: text(root.displayName, "MEMBER_NAME_MISMATCH"),
    status: oneOf(text(root.status, "MEMBER_STATUS_MISMATCH"), ["ENABLED", "DISABLED"] as const, "MEMBER_STATUS_MISMATCH"),
    scope: readScope(root.scope),
    qualifiedRechargePoints: text(root.qualifiedRechargePoints, "MEMBER_RECHARGE_MISMATCH"),
    stationDeductedPoints: text(root.stationDeductedPoints, "MEMBER_DEDUCT_MISMATCH"),
    wallet: readWallet(root.wallet),
    vipName: text(root.vipName, "MEMBER_VIP_MISMATCH"),
    referralName: text(root.referralName, "MEMBER_REFERRAL_MISMATCH"),
    quota: readQuota(root.quota),
    totalBetPoints: text(root.totalBetPoints, "MEMBER_BET_MISMATCH"),
    netProfitPoints: text(root.netProfitPoints, "MEMBER_PROFIT_MISMATCH"),
    aiDividendPoints: text(root.aiDividendPoints, "MEMBER_AI_DIVIDEND_MISMATCH"),
    totalReferralPoints: text(root.totalReferralPoints, "MEMBER_REFERRAL_POINTS_MISMATCH"),
    directMemberCount: integer(root.directMemberCount, "MEMBER_DIRECT_COUNT_MISMATCH"),
    directMemberAvailableTotal: text(root.directMemberAvailableTotal, "MEMBER_DIRECT_POINTS_MISMATCH"),
    descendantMemberCount: integer(root.descendantMemberCount, "MEMBER_DESCENDANT_COUNT_MISMATCH"),
    descendantMemberAvailableTotal: text(root.descendantMemberAvailableTotal, "MEMBER_DESCENDANT_POINTS_MISMATCH"),
    inviteCode: text(root.inviteCode, "MEMBER_INVITE_CODE_MISMATCH"),
    version: text(root.version, "MEMBER_VERSION_MISMATCH"),
  };
}

export function readLedgerPage(value: unknown): LedgerViewPage {
  return readPage(value, (item) => {
    const root = record(item, "LEDGER_MISMATCH");
    return {
      id: text(root.id, "LEDGER_ID_MISMATCH"),
      transactionId: text(root.transactionId, "LEDGER_TRANSACTION_MISMATCH"),
      type: text(root.type, "LEDGER_TYPE_MISMATCH"),
      bucket: oneOf(text(root.bucket, "LEDGER_BUCKET_MISMATCH"), ["AVAILABLE", "RESERVED", "DISPOSABLE"] as const, "LEDGER_BUCKET_MISMATCH"),
      changePoints: text(root.changePoints, "LEDGER_CHANGE_MISMATCH"),
      balanceBefore: text(root.balanceBefore, "LEDGER_BEFORE_MISMATCH"),
      balanceAfter: text(root.balanceAfter, "LEDGER_AFTER_MISMATCH"),
      sourceType: text(root.sourceType, "LEDGER_SOURCE_MISMATCH"),
      sourceId: text(root.sourceId, "LEDGER_SOURCE_ID_MISMATCH"),
      remark: text(root.remark, "LEDGER_REMARK_MISMATCH"),
      createdAt: text(root.createdAt, "LEDGER_TIME_MISMATCH"),
    };
  }, "LEDGER_PAGE_MISMATCH");
}

export function readOrderPage(value: unknown): MemberOrderPage {
  return readPage(value, (item) => {
    const root = record(item, "ORDER_MISMATCH");
    return {
      id: text(root.id, "ORDER_ID_MISMATCH"),
      type: oneOf(text(root.type, "ORDER_TYPE_MISMATCH"), ["ORDINARY", "AI_POOL"] as const, "ORDER_TYPE_MISMATCH"),
      projectId: nullableText(root.projectId, "ORDER_PROJECT_MISMATCH"),
      projectName: nullableText(root.projectName, "ORDER_PROJECT_NAME_MISMATCH"),
      lotteryId: text(root.lotteryId, "ORDER_LOTTERY_MISMATCH"),
      playId: text(root.playId, "ORDER_PLAY_MISMATCH"),
      issueCode: text(root.issueCode, "ORDER_ISSUE_MISMATCH"),
      status: text(root.status, "ORDER_STATUS_MISMATCH"),
      purchasePoints: text(root.purchasePoints, "ORDER_PURCHASE_MISMATCH"),
      dueAwardPoints: nullableText(root.dueAwardPoints, "ORDER_DUE_MISMATCH"),
      netPostedAwardPoints: text(root.netPostedAwardPoints, "ORDER_POSTED_MISMATCH"),
      refundPoints: text(root.refundPoints, "ORDER_REFUND_MISMATCH"),
      settlementVersion: nullableText(root.settlementVersion, "ORDER_SETTLEMENT_MISMATCH"),
      createdAt: text(root.createdAt, "ORDER_TIME_MISMATCH"),
      detailUrl: text(root.detailUrl, "ORDER_URL_MISMATCH"),
    };
  }, "ORDER_PAGE_MISMATCH");
}

export function readVipConfig(value: unknown): VipConfig {
  const root = record(value, "VIP_CONFIG_MISMATCH");
  return {
    version: text(root.version, "VIP_VERSION_MISMATCH"),
    levels: array(root.levels, "VIP_LEVELS_MISMATCH").map(readVipLevel),
    createdAt: nullableText(root.createdAt, "VIP_CREATED_MISMATCH"),
    qualificationStatus: qualificationStatus(root.qualificationStatus),
  };
}

export function readVipConfigPage(value: unknown): VipConfigPage {
  return readPage(value, readVipConfig, "VIP_HISTORY_MISMATCH");
}

export function readReferralConfig(value: unknown): ReferralConfig {
  const root = record(value, "REFERRAL_CONFIG_MISMATCH");
  return {
    version: text(root.version, "REFERRAL_VERSION_MISMATCH"),
    levels: array(root.levels, "REFERRAL_LEVELS_MISMATCH").map(readReferralLevel),
    fixedRewardPolicyVersion: nullableText(root.fixedRewardPolicyVersion, "REFERRAL_FIXED_POLICY_MISMATCH"),
    aiSharePolicyVersion: nullableText(root.aiSharePolicyVersion, "REFERRAL_SHARE_POLICY_MISMATCH"),
    qualificationStatus: qualificationStatus(root.qualificationStatus),
  };
}

export function readReferralConfigPage(value: unknown): ReferralConfigPage {
  return readPage(value, readReferralConfig, "REFERRAL_HISTORY_MISMATCH");
}

export function readCommandReceipt(value: unknown): CommandReceipt {
  const root = record(value, "COMMAND_RECEIPT_MISMATCH");
  return {
    commandId: text(root.commandId, "COMMAND_ID_MISMATCH"),
    operationId: text(root.operationId, "COMMAND_OPERATION_MISMATCH"),
    resourceId: text(root.resourceId, "COMMAND_RESOURCE_MISMATCH"),
    status: oneOf(text(root.status, "COMMAND_STATUS_MISMATCH"), ["ACCEPTED", "COMPLETED"] as const, "COMMAND_STATUS_MISMATCH"),
    createdAt: text(root.createdAt, "COMMAND_TIME_MISMATCH"),
  };
}

export function readCommandResult(value: unknown): CommandResult {
  const root = record(value, "COMMAND_RESULT_MISMATCH");
  return {
    operationId: text(root.operationId, "COMMAND_RESULT_OPERATION_MISMATCH"),
    resourceId: nullableText(root.resourceId, "COMMAND_RESULT_RESOURCE_MISMATCH"),
    taskId: nullableText(root.taskId, "COMMAND_RESULT_TASK_MISMATCH"),
    status: oneOf(text(root.status, "COMMAND_RESULT_STATUS_MISMATCH"), ["PROCESSING", "SUCCEEDED", "FAILED"] as const, "COMMAND_RESULT_STATUS_MISMATCH"),
    httpStatus: integer(root.httpStatus, "COMMAND_RESULT_HTTP_MISMATCH"),
    resultUrl: nullableText(root.resultUrl, "COMMAND_RESULT_URL_MISMATCH"),
    failureCode: nullableText(root.failureCode, "COMMAND_RESULT_FAILURE_MISMATCH"),
  };
}

export function readTaskAccepted(value: unknown): TaskAccepted {
  const root = record(value, "TASK_ACCEPTED_MISMATCH");
  return {
    taskId: text(root.taskId, "TASK_ID_MISMATCH"),
    status: oneOf(text(root.status, "TASK_STATUS_MISMATCH"), ["PENDING", "RUNNING", "RETRY_WAIT"] as const, "TASK_STATUS_MISMATCH"),
    statusUrl: text(root.statusUrl, "TASK_URL_MISMATCH"),
    pollAfterSeconds: integer(root.pollAfterSeconds, "TASK_POLL_MISMATCH"),
  };
}

export function readTaskStatus(value: unknown): TaskStatusSummary {
  const root = record(value, "TASK_STATUS_MISMATCH");
  return {
    id: text(root.id, "TASK_ID_MISMATCH"),
    taskType: text(root.taskType, "TASK_TYPE_MISMATCH"),
    status: oneOf(text(root.status, "TASK_STATUS_MISMATCH"), ["PENDING", "RUNNING", "RETRY_WAIT", "SUCCEEDED", "FAILED", "CANCELLED"] as const, "TASK_STATUS_MISMATCH"),
    progress: finiteNumber(root.progress, "TASK_PROGRESS_MISMATCH"),
    resultUrl: nullableText(root.resultUrl, "TASK_RESULT_URL_MISMATCH"),
    resultCode: nullableText(root.resultCode, "TASK_RESULT_CODE_MISMATCH"),
    failureCode: nullableText(root.failureCode, "TASK_FAILURE_CODE_MISMATCH"),
    updatedAt: text(root.updatedAt, "TASK_UPDATED_MISMATCH"),
  };
}

export function readReportResult(value: unknown): ReportResult {
  const root = record(value, "REPORT_MISMATCH");
  const reportType = oneOf(text(root.reportType, "REPORT_TYPE_MISMATCH"), ["MEMBER_OVERVIEW", "MEMBER_POINTS", "VIP_LEVELS", "REFERRAL_LEVELS", "AI_QUOTA"] as const, "REPORT_TYPE_MISMATCH");
  return {
    reportType,
    metricDictionaryVersion: text(root.metricDictionaryVersion, "REPORT_DICTIONARY_MISMATCH"),
    snapshotId: text(root.snapshotId, "REPORT_SNAPSHOT_MISMATCH"),
    filters: readReportFilter(root.filters),
    asOf: text(root.asOf, "REPORT_AS_OF_MISMATCH"),
    projectionVersion: text(root.projectionVersion, "REPORT_PROJECTION_MISMATCH"),
    sourceWatermark: text(root.sourceWatermark, "REPORT_WATERMARK_MISMATCH"),
    items: array(root.items, "REPORT_ROWS_MISMATCH").map((item) => {
      const row = record(item, "REPORT_ROW_MISMATCH");
      return {
        dimensions: record(row.dimensions, "REPORT_DIMENSIONS_MISMATCH"),
        metrics: record(row.metrics, "REPORT_METRICS_MISMATCH"),
      };
    }),
    totals: record(root.totals, "REPORT_TOTALS_MISMATCH"),
    totalScope: oneOf(text(root.totalScope, "REPORT_TOTAL_SCOPE_MISMATCH"), ["FULL_FILTER"] as const, "REPORT_TOTAL_SCOPE_MISMATCH"),
    nextCursor: nullableText(root.nextCursor, "REPORT_CURSOR_MISMATCH"),
    hasMore: bool(root.hasMore, "REPORT_MORE_MISMATCH"),
    complete: bool(root.complete, "REPORT_COMPLETE_MISMATCH"),
  };
}

export function readExportStatus(value: unknown): ExportStatus {
  const root = record(value, "EXPORT_STATUS_MISMATCH");
  return {
    id: text(root.id, "EXPORT_ID_MISMATCH"),
    status: oneOf(text(root.status, "EXPORT_STATUS_MISMATCH"), ["PENDING", "RUNNING", "COMPLETED", "FAILED", "EXPIRED"] as const, "EXPORT_STATUS_MISMATCH"),
    rowCount: text(root.rowCount, "EXPORT_ROWS_MISMATCH"),
    downloadUrl: nullableText(root.downloadUrl, "EXPORT_URL_MISMATCH"),
    expiresAt: nullableText(root.expiresAt, "EXPORT_EXPIRES_MISMATCH"),
  };
}

export function readActionAuthorization(value: unknown): ActionAuthorization {
  const root = record(value, "ACTION_AUTHORIZATION_MISMATCH");
  return {
    actionToken: text(root.actionToken, "ACTION_TOKEN_MISMATCH"),
    expiresAt: text(root.expiresAt, "ACTION_EXPIRES_MISMATCH"),
  };
}

function readVipLevel(value: unknown): VipLevel {
  const root = record(value, "VIP_LEVEL_MISMATCH");
  return {
    id: text(root.id, "VIP_LEVEL_ID_MISMATCH"),
    levelNo: integer(root.levelNo, "VIP_LEVEL_NO_MISMATCH"),
    name: text(root.name, "VIP_LEVEL_NAME_MISMATCH"),
    requiredRechargePoints: text(root.requiredRechargePoints, "VIP_LEVEL_THRESHOLD_MISMATCH"),
    aiPoolBaseDailyLimit: text(root.aiPoolBaseDailyLimit, "VIP_LEVEL_LIMIT_MISMATCH"),
  };
}

function readReferralLevel(value: unknown): ReferralLevel {
  const root = record(value, "REFERRAL_LEVEL_MISMATCH");
  return {
    id: text(root.id, "REFERRAL_LEVEL_ID_MISMATCH"),
    levelNo: integer(root.levelNo, "REFERRAL_LEVEL_NO_MISMATCH"),
    name: text(root.name, "REFERRAL_LEVEL_NAME_MISMATCH"),
    requiredDirectValidMembers: integer(root.requiredDirectValidMembers, "REFERRAL_LEVEL_COUNT_MISMATCH"),
    validRechargePoints: text(root.validRechargePoints, "REFERRAL_LEVEL_RECHARGE_MISMATCH"),
    fixedRewardPoints: text(root.fixedRewardPoints, "REFERRAL_LEVEL_REWARD_MISMATCH"),
    directAiShareRate: text(root.directAiShareRate, "REFERRAL_LEVEL_RATE_MISMATCH"),
    aiExtraDailyLimit: text(root.aiExtraDailyLimit, "REFERRAL_LEVEL_LIMIT_MISMATCH"),
    status: oneOf(text(root.status, "REFERRAL_LEVEL_STATUS_MISMATCH"), ["ENABLED", "DISABLED"] as const, "REFERRAL_LEVEL_STATUS_MISMATCH"),
  };
}

function readScope(value: unknown): MemberScope {
  const root = record(value, "MEMBER_SCOPE_MISMATCH");
  return {
    station: readNameRef(root.station, "MEMBER_STATION_MISMATCH"),
    stationMaster: readNameRef(root.stationMaster, "MEMBER_MASTER_MISMATCH"),
    referrerMember: root.referrerMember === null
      ? null
      : readNameRef(root.referrerMember, "MEMBER_REFERRER_MISMATCH"),
    version: text(root.version, "MEMBER_SCOPE_VERSION_MISMATCH"),
  };
}

function readNameRef(value: unknown, code: string): NameRef {
  const root = record(value, code);
  return {
    id: text(root.id, code),
    code: text(root.code, code),
    name: text(root.name, code),
  };
}

function readWallet(value: unknown): MemberWallet {
  const root = record(value, "MEMBER_WALLET_MISMATCH");
  return {
    availablePoints: text(root.availablePoints, "MEMBER_AVAILABLE_MISMATCH"),
    reservedPoints: text(root.reservedPoints, "MEMBER_RESERVED_MISMATCH"),
    asOf: text(root.asOf, "MEMBER_WALLET_TIME_MISMATCH"),
    ledgerWatermark: text(root.ledgerWatermark, "MEMBER_LEDGER_WATERMARK_MISMATCH"),
  };
}

function readQuota(value: unknown): MemberQuota {
  const root = record(value, "MEMBER_QUOTA_MISMATCH");
  return {
    businessDate: text(root.businessDate, "MEMBER_QUOTA_DATE_MISMATCH"),
    timeZone: text(root.timeZone, "MEMBER_QUOTA_ZONE_MISMATCH"),
    vipBaseLimit: text(root.vipBaseLimit, "MEMBER_VIP_LIMIT_MISMATCH"),
    referralExtraLimit: text(root.referralExtraLimit, "MEMBER_REFERRAL_LIMIT_MISMATCH"),
    totalLimit: text(root.totalLimit, "MEMBER_TOTAL_LIMIT_MISMATCH"),
    usedPoints: text(root.usedPoints, "MEMBER_USED_LIMIT_MISMATCH"),
    remainingPoints: text(root.remainingPoints, "MEMBER_REMAINING_LIMIT_MISMATCH"),
    eligibilityStatus: oneOf(text(root.eligibilityStatus, "MEMBER_ELIGIBILITY_MISMATCH"), ["READY", "UPDATING", "UNAVAILABLE"] as const, "MEMBER_ELIGIBILITY_MISMATCH"),
    qualificationVersion: text(root.qualificationVersion, "MEMBER_QUALIFICATION_VERSION_MISMATCH"),
    vipConfigVersion: text(root.vipConfigVersion, "MEMBER_VIP_VERSION_MISMATCH"),
    referralConfigVersion: text(root.referralConfigVersion, "MEMBER_REFERRAL_VERSION_MISMATCH"),
    asOf: text(root.asOf, "MEMBER_QUOTA_TIME_MISMATCH"),
  };
}

function readReportFilter(value: unknown): ReportFilter {
  const root = record(value, "REPORT_FILTER_MISMATCH");
  const result: ReportFilter = {
    from: text(root.from, "REPORT_FROM_MISMATCH"),
    to: text(root.to, "REPORT_TO_MISMATCH"),
  };
  if (typeof root.asOf === "string") result.asOf = root.asOf;
  if (typeof root.stationId === "string") result.stationId = root.stationId;
  if (typeof root.stationMasterId === "string") result.stationMasterId = root.stationMasterId;
  if (typeof root.memberId === "string") result.memberId = root.memberId;
  if (typeof root.vipLevelId === "string") result.vipLevelId = root.vipLevelId;
  if (typeof root.referralLevelId === "string") result.referralLevelId = root.referralLevelId;
  if (typeof root.groupBy === "string") result.groupBy = root.groupBy;
  return result;
}

function qualificationStatus(value: unknown): QualificationStatus {
  return oneOf(text(value, "QUALIFICATION_STATUS_MISMATCH"), ["READY", "REBUILDING", "UNCONFIGURED"] as const, "QUALIFICATION_STATUS_MISMATCH");
}

function readPage<T>(value: unknown, reader: (item: unknown) => T, code: string): CursorPage<T> {
  const root = record(value, code);
  return {
    items: array(root.items, code).map(reader),
    nextCursor: nullableText(root.nextCursor, code),
    hasMore: bool(root.hasMore, code),
    snapshotId: nullableText(root.snapshotId, code),
  };
}

function record(value: unknown, code: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(code);
  }
  return value as Record<string, unknown>;
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

function nullableText(value: unknown, code: string): string | null {
  return value === null ? null : text(value, code);
}

function integer(value: unknown, code: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new TypeError(code);
  }
  return value;
}

function finiteNumber(value: unknown, code: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
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

function oneOf<T extends string>(value: string, values: readonly T[], code: string): T {
  if (!values.includes(value as T)) {
    throw new TypeError(code);
  }
  return value as T;
}
