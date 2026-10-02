export type SettlementMode = "MANUAL" | "AUTO";

export type ProjectStatus = "ENABLED" | "DISABLED";

export type PoolStatus =
  | "OPEN"
  | "CUTOFF_PENDING"
  | "LOCKED"
  | "DRAW_PENDING"
  | "ALLOCATION_PENDING"
  | "DISCLOSED"
  | "DISTRIBUTING"
  | "SETTLED"
  | "CANCELLING"
  | "CANCELLED"
  | "CORRECTING"
  | "CORRECTED"
  | "EXCEPTION_PENDING"
  | "NO_PARTICIPATION";

export interface Page<T> {
  items: readonly T[];
  nextCursor: string | null;
  hasMore: boolean;
  snapshotId: string | null;
}

export interface AiSettings {
  effectiveDate: string;
  timeZone: "Asia/Shanghai";
  cutoffOffsetMinutes: number;
  endDate: string | null;
  settlementMode: SettlementMode;
  initialOfficialPoints: string;
  userIncrementRatioBps: number;
  defaultTargetNetReturnPercent: number;
  maxOfficialContributionPoints: string;
  rewardBudgetLimitPoints: string;
}

export interface AiProject {
  drawSchedule: { issueCode: string; drawAt: string } | null;
  id: string;
  code: string;
  name: string;
  lotteryId: string;
  playId: string;
  status: ProjectStatus;
  activeConfigVersion: string | null;
  latestPoolIssueId: string | null;
  version: string;
}

export interface AiProjectConfig {
  projectId: string;
  version: string;
  settings: AiSettings;
  authorId: string;
  createdAt: string;
}

export interface AiPool {
  id: string;
  projectId: string;
  lotteryId: string;
  playId: string;
  issueCode: string;
  settlementMode: SettlementMode;
  ruleSetCode: string;
  status: PoolStatus;
  cutoffAt: string;
  generatedAt: string;
  groupCount: number;
  configVersion: string;
  initialOfficialPoints: string;
  userIncrementRatioBps: number;
  defaultTargetNetReturnPercent: number;
  maxOfficialContributionPoints: string;
  rewardBudgetLimitPoints: string;
  actualUserShare: string;
  userPurchasePoints: string;
  platformPoints: string;
  rawTotalPoints: string;
  alignmentPoints: string;
  totalPurchasePoints: string;
  participantCount: number;
  totalWinningPoints: string | null;
  userWinningPoints: string | null;
  numbersDisclosed: boolean;
  disclosureVersion: string | null;
  version: string;
}

export interface SelectionArea {
  key: string;
  chosen: readonly number[];
  dan: readonly number[];
  tuo: readonly number[];
}

export interface Selection {
  schemaId: string;
  schemaVersion: string;
  mode: "SINGLE" | "MULTIPLE" | "DANTUO" | "POSITIONAL" | "GROUP";
  areas: readonly SelectionArea[];
}

export interface FixedCombination {
  id: string;
  sequenceNo: number;
  selection: Selection;
  selectionHash: string;
  numberCodes: readonly string[];
  groupHash: string;
  baseBetCount: string;
  baseCostPoints: string;
  generatedAt: string;
}

export interface PreviewCombination {
  sequenceNo: number;
  selection: Selection;
  selectionHash: string;
  numberCodes: readonly string[];
  groupHash: string;
  baseBetCount: string;
  baseCostPoints: string;
}

export interface AiCombinationPreview {
  projectId: string;
  issueId: string;
  issueCode: string;
  configVersion: string;
  ruleVersion: string;
  algorithmVersion: string;
  inputVersionSetHash: string;
  generatedAt: string;
  combinations: readonly PreviewCombination[];
}

export interface AiPoolAdmin {
  pool: AiPool;
  configVersion: string;
  combinations: readonly FixedCombination[];
  inputVersionSetHash: string;
  allowedActions: readonly string[];
}

export interface Subscription {
  id: string;
  poolIssueId: string;
  points: string;
  quotaDate: string;
  status: "RESERVED" | "LOCKED" | "REFUNDED" | "SETTLED";
  ledgerTransactionId: string;
  lockedAt: string | null;
  createdAt: string;
}

export interface AllocationItem {
  combinationId: string;
  sequenceNo: number;
  allocatedPoints: string;
  multiplier: string;
  allocationRatio: string;
  awardCodes: readonly string[];
  winningPoints: string;
}

export interface Allocation {
  id: string;
  poolIssueId: string;
  version: string;
  inputVersionSetHash: string;
  drawVersion: string;
  ruleVersion: string;
  simulationPolicyVersion: string;
  ruleSetCode: string;
  algorithmVersion: string;
  status: "SOLVED" | "UNSATISFIABLE" | "TIMEOUT" | "INVALID_INPUT" | "SUPERSEDED";
  items: readonly AllocationItem[];
  totalPurchasePoints: string;
  totalWinningPoints: string | null;
  userWinningPoints: string | null;
  platformWinningPoints: string | null;
  requestedTargetNetReturnPercent: number;
  actualNetReturnRate: string | null;
  differencePercentagePoints: string | null;
  withinTolerance: boolean;
  rewardRequiredPoints: string | null;
  targetRoundingAdjustmentPoints: string;
  winningNumberCode: string;
  winningGroupSequenceNo: number;
  initialOfficialPoints: string;
  userPurchasePoints: string;
  incrementTotalPoints: string;
  platformIncrementBasePoints: string;
  rawTotalPoints: string;
  alignmentPoints: string;
  officialContributionPoints: string;
  maxOfficialContributionPoints: string;
  officialContributionWithinLimit: boolean;
  rewardBudgetLimitPoints: string;
  rewardBudgetWithinLimit: boolean;
  groupingInputHash: string;
  subscriptionInputHash: string;
  drawInputHash: string;
  ruleInputHash: string;
  previewInputHash: string;
  confirmationStatus: "NOT_CONFIRMABLE" | "PENDING_CONFIRMATION" | "CONFIRMED";
}

export interface DisclosureReceipt {
  id: string;
  poolIssueId: string;
  version: string;
  status: "PUBLISHED" | "SUPERSEDED";
  label: string;
  reason: string;
  publishedAt: string;
}

export interface PayoutPreparation {
  preparationId: string;
  poolIssueId: string;
  allocationVersion: string;
  disclosureVersion: string;
  expectedInputVersionSetHash: string;
  dueTotalPoints: string;
  dueUserPoints: string;
  eligible: boolean;
  blockingCodes: readonly string[];
  expiresAt: string;
}

export interface PayoutBatch {
  id: string;
  poolIssueId: string;
  status: "PENDING" | "RUNNING" | "PAUSED" | "FAILED" | "RECONCILING" | "COMPLETED";
  expectedPoints: string;
  postedPoints: string;
  pendingPoints: string;
  differencePoints: string;
  inputVersionSetHash: string;
  completedItemCount: number;
  totalItemCount: number;
  updatedAt: string;
}

export interface PayoutItem {
  id: string;
  maskedBeneficiary: string;
  duePoints: string;
  postedPoints: string;
  status: "PENDING" | "POSTED" | "FAILED";
  transactionId: string | null;
}

export interface BudgetAccount {
  id: string;
  type: "DISTRIBUTION_BUDGET" | "ORDINARY_AWARD_BUDGET" | "AI_BUDGET" | "REFERRAL_BUDGET";
  availablePoints: string;
  reservedPoints: string;
  version: string;
}

export interface TaskAccepted {
  taskId: string;
  status: "PENDING" | "RUNNING" | "RETRY_WAIT";
  statusUrl: string;
  pollAfterSeconds: number;
}

export interface TaskStatus {
  id: string;
  taskType: string;
  status: "PENDING" | "RUNNING" | "RETRY_WAIT" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  progress: number;
  resultUrl: string | null;
  resultCode: string | null;
  failureCode: string | null;
  updatedAt: string;
}

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

export interface NameRef {
  id: string;
  code: string;
  name: string;
}

export interface ReportFilter {
  from: string;
  to: string;
  asOf?: string | null | undefined;
  projectId?: string | undefined;
  lotteryId?: string | undefined;
  issueCode?: string | undefined;
  status?: string | undefined;
  groupBy?: "POOL_ISSUE" | undefined;
}

export interface ReportRow {
  dimensions: Readonly<Record<string, unknown>>;
  metrics: Readonly<Record<string, unknown>>;
}

export interface ReportResult {
  reportType: "AI_POOLS";
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
  status: string;
  rowCount: string;
  downloadUrl: string | null;
  expiresAt: string | null;
}

export interface ActionAuthorization {
  actionToken: string;
  expiresAt: string;
}

const projectStatuses = ["ENABLED", "DISABLED"] as const;
const poolStatuses = [
  "OPEN", "CUTOFF_PENDING", "LOCKED", "DRAW_PENDING", "ALLOCATION_PENDING",
  "DISCLOSED", "DISTRIBUTING", "SETTLED", "CANCELLING", "CANCELLED",
  "CORRECTING", "CORRECTED", "EXCEPTION_PENDING", "NO_PARTICIPATION",
] as const;

export function readProject(value: unknown): AiProject {
  const item = record(value, "AI_PROJECT_MISMATCH");
  const schedule = item.drawSchedule === null ? null : record(item.drawSchedule, "AI_DRAW_SCHEDULE_MISMATCH");
  return {
    drawSchedule: schedule === null ? null : {
      issueCode: text(schedule.issueCode, "AI_DRAW_ISSUE_MISMATCH"),
      drawAt: text(schedule.drawAt, "AI_DRAW_TIME_MISMATCH"),
    },
    id: text(item.id, "AI_PROJECT_ID_MISMATCH"),
    code: text(item.code, "AI_PROJECT_CODE_MISMATCH"),
    name: text(item.name, "AI_PROJECT_NAME_MISMATCH"),
    lotteryId: text(item.lotteryId, "AI_PROJECT_LOTTERY_MISMATCH"),
    playId: text(item.playId, "AI_PROJECT_PLAY_MISMATCH"),
    status: oneOf(item.status, projectStatuses, "AI_PROJECT_STATUS_MISMATCH"),
    activeConfigVersion: nullableText(item.activeConfigVersion, "AI_PROJECT_CONFIG_MISMATCH"),
    latestPoolIssueId: nullableText(item.latestPoolIssueId, "AI_PROJECT_POOL_MISMATCH"),
    version: text(item.version, "AI_PROJECT_VERSION_MISMATCH"),
  };
}

export function readProjectPage(value: unknown): Page<AiProject> {
  return readPage(value, readProject, "AI_PROJECT_PAGE_MISMATCH");
}

export function readSettings(value: unknown): AiSettings {
  const item = record(value, "AI_SETTINGS_MISMATCH");
  return {
    settlementMode: oneOf(item.settlementMode, ["MANUAL", "AUTO"] as const, "AI_MODE_MISMATCH"),
    effectiveDate: text(item.effectiveDate, "AI_SETTINGS_DATE_MISMATCH"),
    timeZone: oneOf(item.timeZone, ["Asia/Shanghai"] as const, "AI_SETTINGS_ZONE_MISMATCH"),
    cutoffOffsetMinutes: integer(item.cutoffOffsetMinutes, "AI_SETTINGS_CUTOFF_MISMATCH"),
    endDate: nullableText(item.endDate, "AI_SETTINGS_END_MISMATCH"),
    initialOfficialPoints: text(item.initialOfficialPoints, "AI_SETTINGS_INITIAL_MISMATCH"),
    userIncrementRatioBps: integer(item.userIncrementRatioBps, "AI_SETTINGS_RATIO_MISMATCH"),
    defaultTargetNetReturnPercent: integer(item.defaultTargetNetReturnPercent, "AI_SETTINGS_TARGET_MISMATCH"),
    maxOfficialContributionPoints: text(item.maxOfficialContributionPoints, "AI_SETTINGS_MAXIMUM_MISMATCH"),
    rewardBudgetLimitPoints: text(item.rewardBudgetLimitPoints, "AI_SETTINGS_REWARD_MISMATCH"),
  };
}

export function readProjectConfig(value: unknown): AiProjectConfig {
  const item = record(value, "AI_CONFIG_MISMATCH");
  return {
    projectId: text(item.projectId, "AI_CONFIG_PROJECT_MISMATCH"),
    version: text(item.version, "AI_CONFIG_VERSION_MISMATCH"),
    settings: readSettings(item.settings),
    authorId: text(item.authorId, "AI_CONFIG_AUTHOR_MISMATCH"),
    createdAt: text(item.createdAt, "AI_CONFIG_CREATED_MISMATCH"),
  };
}

export function readPool(value: unknown): AiPool {
  const item = record(value, "AI_POOL_MISMATCH");
  return {
    id: text(item.id, "AI_POOL_ID_MISMATCH"),
    projectId: text(item.projectId, "AI_POOL_PROJECT_MISMATCH"),
    lotteryId: text(item.lotteryId, "AI_POOL_LOTTERY_MISMATCH"),
    playId: text(item.playId, "AI_POOL_PLAY_MISMATCH"),
    settlementMode: oneOf(item.settlementMode, ["MANUAL", "AUTO"] as const, "AI_MODE_MISMATCH"),
    ruleSetCode: text(item.ruleSetCode, "AI_POOL_RULE_MISMATCH"),
    issueCode: text(item.issueCode, "AI_POOL_ISSUE_MISMATCH"),
    status: oneOf(item.status, poolStatuses, "AI_POOL_STATUS_MISMATCH"),
    cutoffAt: text(item.cutoffAt, "AI_POOL_CUTOFF_MISMATCH"),
    generatedAt: text(item.generatedAt, "AI_POOL_GENERATED_MISMATCH"),
    groupCount: integer(item.groupCount, "AI_POOL_COUNT_MISMATCH"),
    configVersion: text(item.configVersion, "AI_POOL_CONFIG_MISMATCH"),
    initialOfficialPoints: text(item.initialOfficialPoints, "AI_POOL_INITIAL_MISMATCH"),
    userIncrementRatioBps: integer(item.userIncrementRatioBps, "AI_POOL_RATIO_MISMATCH"),
    defaultTargetNetReturnPercent: integer(item.defaultTargetNetReturnPercent, "AI_POOL_TARGET_MISMATCH"),
    maxOfficialContributionPoints: text(item.maxOfficialContributionPoints, "AI_POOL_MAXIMUM_MISMATCH"),
    rewardBudgetLimitPoints: text(item.rewardBudgetLimitPoints, "AI_POOL_REWARD_MISMATCH"),
    actualUserShare: text(item.actualUserShare, "AI_POOL_SHARE_MISMATCH"),
    userPurchasePoints: text(item.userPurchasePoints, "AI_POOL_USER_POINTS_MISMATCH"),
    platformPoints: text(item.platformPoints, "AI_POOL_PLATFORM_POINTS_MISMATCH"),
    rawTotalPoints: text(item.rawTotalPoints, "AI_POOL_RAW_TOTAL_MISMATCH"),
    alignmentPoints: text(item.alignmentPoints, "AI_POOL_ALIGNMENT_MISMATCH"),
    totalPurchasePoints: text(item.totalPurchasePoints, "AI_POOL_TOTAL_POINTS_MISMATCH"),
    participantCount: integer(item.participantCount, "AI_POOL_PARTICIPANTS_MISMATCH"),
    totalWinningPoints: nullableText(item.totalWinningPoints, "AI_POOL_WINNING_MISMATCH"),
    userWinningPoints: nullableText(item.userWinningPoints, "AI_POOL_USER_WINNING_MISMATCH"),
    numbersDisclosed: bool(item.numbersDisclosed, "AI_POOL_DISCLOSED_MISMATCH"),
    disclosureVersion: nullableText(item.disclosureVersion, "AI_POOL_DISCLOSURE_MISMATCH"),
    version: text(item.version, "AI_POOL_VERSION_MISMATCH"),
  };
}

export function readPoolPage(value: unknown): Page<AiPool> {
  return readPage(value, readPool, "AI_POOL_PAGE_MISMATCH");
}

export function readPoolAdmin(value: unknown): AiPoolAdmin {
  const item = record(value, "AI_POOL_ADMIN_MISMATCH");
  return {
    pool: readPool(item.pool),
    configVersion: text(item.configVersion, "AI_POOL_ADMIN_CONFIG_MISMATCH"),
    combinations: array(item.combinations, "AI_POOL_COMBINATIONS_MISMATCH").map(readCombination),
    inputVersionSetHash: text(item.inputVersionSetHash, "AI_POOL_INPUT_HASH_MISMATCH"),
    allowedActions: stringArray(item.allowedActions, "AI_POOL_ACTIONS_MISMATCH"),
  };
}

export function readCombinationPreview(value: unknown): AiCombinationPreview {
  const item = record(value, "AI_COMBINATION_PREVIEW_MISMATCH");
  return {
    projectId: text(item.projectId, "AI_COMBINATION_PREVIEW_PROJECT_MISMATCH"),
    issueId: text(item.issueId, "AI_COMBINATION_PREVIEW_ISSUE_ID_MISMATCH"),
    issueCode: text(item.issueCode, "AI_COMBINATION_PREVIEW_ISSUE_MISMATCH"),
    configVersion: text(item.configVersion, "AI_COMBINATION_PREVIEW_CONFIG_MISMATCH"),
    ruleVersion: text(item.ruleVersion, "AI_COMBINATION_PREVIEW_RULE_MISMATCH"),
    algorithmVersion: text(item.algorithmVersion, "AI_COMBINATION_PREVIEW_ALGORITHM_MISMATCH"),
    inputVersionSetHash: text(item.inputVersionSetHash, "AI_COMBINATION_PREVIEW_INPUT_MISMATCH"),
    generatedAt: text(item.generatedAt, "AI_COMBINATION_PREVIEW_TIME_MISMATCH"),
    combinations: array(item.combinations, "AI_COMBINATION_PREVIEW_ITEMS_MISMATCH")
      .map(readPreviewCombination),
  };
}

export function readSubscription(value: unknown): Subscription {
  const item = record(value, "AI_SUBSCRIPTION_MISMATCH");
  return {
    id: text(item.id, "AI_SUBSCRIPTION_ID_MISMATCH"),
    poolIssueId: text(item.poolIssueId, "AI_SUBSCRIPTION_POOL_MISMATCH"),
    points: text(item.points, "AI_SUBSCRIPTION_POINTS_MISMATCH"),
    quotaDate: text(item.quotaDate, "AI_SUBSCRIPTION_DATE_MISMATCH"),
    status: oneOf(item.status, ["RESERVED", "LOCKED", "REFUNDED", "SETTLED"] as const, "AI_SUBSCRIPTION_STATUS_MISMATCH"),
    ledgerTransactionId: text(item.ledgerTransactionId, "AI_SUBSCRIPTION_LEDGER_MISMATCH"),
    lockedAt: nullableText(item.lockedAt, "AI_SUBSCRIPTION_LOCKED_MISMATCH"),
    createdAt: text(item.createdAt, "AI_SUBSCRIPTION_CREATED_MISMATCH"),
  };
}

export function readSubscriptionPage(value: unknown): Page<Subscription> {
  return readPage(value, readSubscription, "AI_SUBSCRIPTION_PAGE_MISMATCH");
}

export function readAllocation(value: unknown): Allocation {
  const item = record(value, "AI_ALLOCATION_MISMATCH");
  return {
    id: text(item.id, "AI_ALLOCATION_ID_MISMATCH"),
    poolIssueId: text(item.poolIssueId, "AI_ALLOCATION_POOL_MISMATCH"),
    version: text(item.version, "AI_ALLOCATION_VERSION_MISMATCH"),
    inputVersionSetHash: text(item.inputVersionSetHash, "AI_ALLOCATION_HASH_MISMATCH"),
    drawVersion: text(item.drawVersion, "AI_ALLOCATION_DRAW_MISMATCH"),
    ruleVersion: text(item.ruleVersion, "AI_ALLOCATION_RULE_MISMATCH"),
    simulationPolicyVersion: text(item.simulationPolicyVersion, "AI_ALLOCATION_SIMULATION_POLICY_MISMATCH"),
    ruleSetCode: text(item.ruleSetCode, "AI_ALLOCATION_RULE_SET_MISMATCH"),
    algorithmVersion: text(item.algorithmVersion, "AI_ALLOCATION_ALGORITHM_MISMATCH"),
    status: oneOf(item.status, ["SOLVED", "UNSATISFIABLE", "TIMEOUT", "INVALID_INPUT", "SUPERSEDED"] as const, "AI_ALLOCATION_STATUS_MISMATCH"),
    items: array(item.items, "AI_ALLOCATION_ITEMS_MISMATCH").map(readAllocationItem),
    totalPurchasePoints: text(item.totalPurchasePoints, "AI_ALLOCATION_TOTAL_MISMATCH"),
    totalWinningPoints: nullableText(item.totalWinningPoints, "AI_ALLOCATION_WINNING_MISMATCH"),
    userWinningPoints: nullableText(item.userWinningPoints, "AI_ALLOCATION_USER_MISMATCH"),
    platformWinningPoints: nullableText(item.platformWinningPoints, "AI_ALLOCATION_PLATFORM_MISMATCH"),
    requestedTargetNetReturnPercent: integer(item.requestedTargetNetReturnPercent, "AI_ALLOCATION_TARGET_MISMATCH"),
    actualNetReturnRate: nullableText(item.actualNetReturnRate, "AI_ALLOCATION_ACTUAL_RETURN_MISMATCH"),
    differencePercentagePoints: nullableText(item.differencePercentagePoints, "AI_ALLOCATION_DIFFERENCE_MISMATCH"),
    withinTolerance: bool(item.withinTolerance, "AI_ALLOCATION_TOLERANCE_MISMATCH"),
    targetRoundingAdjustmentPoints: text(item.targetRoundingAdjustmentPoints, "AI_TARGET_TAIL_MISMATCH"),
    rewardRequiredPoints: nullableText(item.rewardRequiredPoints, "AI_ALLOCATION_REWARD_MISMATCH"),
    winningNumberCode: text(item.winningNumberCode, "AI_ALLOCATION_WINNING_CODE_MISMATCH"),
    winningGroupSequenceNo: integer(item.winningGroupSequenceNo, "AI_ALLOCATION_WINNING_GROUP_MISMATCH"),
    initialOfficialPoints: text(item.initialOfficialPoints, "AI_ALLOCATION_INITIAL_MISMATCH"),
    userPurchasePoints: text(item.userPurchasePoints, "AI_ALLOCATION_PURCHASE_MISMATCH"),
    incrementTotalPoints: text(item.incrementTotalPoints, "AI_ALLOCATION_INCREMENT_MISMATCH"),
    platformIncrementBasePoints: text(item.platformIncrementBasePoints, "AI_ALLOCATION_PLATFORM_BASE_MISMATCH"),
    rawTotalPoints: text(item.rawTotalPoints, "AI_ALLOCATION_RAW_MISMATCH"),
    alignmentPoints: text(item.alignmentPoints, "AI_ALLOCATION_ALIGNMENT_MISMATCH"),
    officialContributionPoints: text(item.officialContributionPoints, "AI_ALLOCATION_OFFICIAL_MISMATCH"),
    maxOfficialContributionPoints: text(item.maxOfficialContributionPoints, "AI_ALLOCATION_OFFICIAL_LIMIT_MISMATCH"),
    officialContributionWithinLimit: bool(item.officialContributionWithinLimit, "AI_ALLOCATION_OFFICIAL_CHECK_MISMATCH"),
    rewardBudgetLimitPoints: text(item.rewardBudgetLimitPoints, "AI_ALLOCATION_REWARD_LIMIT_MISMATCH"),
    rewardBudgetWithinLimit: bool(item.rewardBudgetWithinLimit, "AI_ALLOCATION_REWARD_CHECK_MISMATCH"),
    groupingInputHash: text(item.groupingInputHash, "AI_ALLOCATION_GROUP_HASH_MISMATCH"),
    subscriptionInputHash: text(item.subscriptionInputHash, "AI_ALLOCATION_SUBSCRIPTION_HASH_MISMATCH"),
    drawInputHash: text(item.drawInputHash, "AI_ALLOCATION_DRAW_HASH_MISMATCH"),
    ruleInputHash: text(item.ruleInputHash, "AI_ALLOCATION_RULE_HASH_MISMATCH"),
    previewInputHash: text(item.previewInputHash, "AI_ALLOCATION_PREVIEW_HASH_MISMATCH"),
    confirmationStatus: oneOf(item.confirmationStatus, ["NOT_CONFIRMABLE", "PENDING_CONFIRMATION", "CONFIRMED"] as const, "AI_ALLOCATION_CONFIRMATION_MISMATCH"),
  };
}

export function readAllocationPage(value: unknown): Page<Allocation> {
  return readPage(value, readAllocation, "AI_ALLOCATION_PAGE_MISMATCH");
}

export function readDisclosureReceipt(value: unknown): DisclosureReceipt {
  const item = record(value, "AI_DISCLOSURE_MISMATCH");
  return {
    id: text(item.id, "AI_DISCLOSURE_ID_MISMATCH"),
    poolIssueId: text(item.poolIssueId, "AI_DISCLOSURE_POOL_MISMATCH"),
    version: text(item.version, "AI_DISCLOSURE_VERSION_MISMATCH"),
    status: oneOf(item.status, ["PUBLISHED", "SUPERSEDED"] as const, "AI_DISCLOSURE_STATUS_MISMATCH"),
    label: text(item.label, "AI_DISCLOSURE_LABEL_MISMATCH"),
    reason: text(item.reason, "AI_DISCLOSURE_REASON_MISMATCH"),
    publishedAt: text(item.publishedAt, "AI_DISCLOSURE_TIME_MISMATCH"),
  };
}

export function readPayoutPreparation(value: unknown): PayoutPreparation {
  const item = record(value, "AI_PAYOUT_PREPARATION_MISMATCH");
  return {
    preparationId: text(item.preparationId, "AI_PAYOUT_PREPARATION_ID_MISMATCH"),
    poolIssueId: text(item.poolIssueId, "AI_PAYOUT_PREPARATION_POOL_MISMATCH"),
    allocationVersion: text(item.allocationVersion, "AI_PAYOUT_PREPARATION_ALLOCATION_MISMATCH"),
    disclosureVersion: text(item.disclosureVersion, "AI_PAYOUT_PREPARATION_DISCLOSURE_MISMATCH"),
    expectedInputVersionSetHash: text(item.expectedInputVersionSetHash, "AI_PAYOUT_PREPARATION_HASH_MISMATCH"),
    dueTotalPoints: text(item.dueTotalPoints, "AI_PAYOUT_PREPARATION_TOTAL_MISMATCH"),
    dueUserPoints: text(item.dueUserPoints, "AI_PAYOUT_PREPARATION_USER_MISMATCH"),
    eligible: bool(item.eligible, "AI_PAYOUT_PREPARATION_ELIGIBLE_MISMATCH"),
    blockingCodes: stringArray(item.blockingCodes, "AI_PAYOUT_PREPARATION_BLOCKS_MISMATCH"),
    expiresAt: text(item.expiresAt, "AI_PAYOUT_PREPARATION_EXPIRY_MISMATCH"),
  };
}

export function readPayoutBatch(value: unknown): PayoutBatch {
  const item = record(value, "AI_PAYOUT_BATCH_MISMATCH");
  return {
    id: text(item.id, "AI_PAYOUT_BATCH_ID_MISMATCH"),
    poolIssueId: text(item.poolIssueId, "AI_PAYOUT_BATCH_POOL_MISMATCH"),
    status: oneOf(item.status, ["PENDING", "RUNNING", "PAUSED", "FAILED", "RECONCILING", "COMPLETED"] as const, "AI_PAYOUT_BATCH_STATUS_MISMATCH"),
    expectedPoints: text(item.expectedPoints, "AI_PAYOUT_BATCH_EXPECTED_MISMATCH"),
    postedPoints: text(item.postedPoints, "AI_PAYOUT_BATCH_POSTED_MISMATCH"),
    pendingPoints: text(item.pendingPoints, "AI_PAYOUT_BATCH_PENDING_MISMATCH"),
    differencePoints: text(item.differencePoints, "AI_PAYOUT_BATCH_DIFFERENCE_MISMATCH"),
    inputVersionSetHash: text(item.inputVersionSetHash, "AI_PAYOUT_BATCH_HASH_MISMATCH"),
    completedItemCount: integer(item.completedItemCount, "AI_PAYOUT_BATCH_COMPLETED_MISMATCH"),
    totalItemCount: integer(item.totalItemCount, "AI_PAYOUT_BATCH_ITEMS_MISMATCH"),
    updatedAt: text(item.updatedAt, "AI_PAYOUT_BATCH_UPDATED_MISMATCH"),
  };
}

export function readPayoutItem(value: unknown): PayoutItem {
  const item = record(value, "AI_PAYOUT_ITEM_MISMATCH");
  return {
    id: text(item.id, "AI_PAYOUT_ITEM_ID_MISMATCH"),
    maskedBeneficiary: text(item.maskedBeneficiary, "AI_PAYOUT_ITEM_BENEFICIARY_MISMATCH"),
    duePoints: text(item.duePoints, "AI_PAYOUT_ITEM_DUE_MISMATCH"),
    postedPoints: text(item.postedPoints, "AI_PAYOUT_ITEM_POSTED_MISMATCH"),
    status: oneOf(item.status, ["PENDING", "POSTED", "FAILED"] as const, "AI_PAYOUT_ITEM_STATUS_MISMATCH"),
    transactionId: nullableText(item.transactionId, "AI_PAYOUT_ITEM_TRANSACTION_MISMATCH"),
  };
}

export function readPayoutItemPage(value: unknown): Page<PayoutItem> {
  return readPage(value, readPayoutItem, "AI_PAYOUT_ITEM_PAGE_MISMATCH");
}

export function readBudget(value: unknown): BudgetAccount {
  const item = record(value, "BUDGET_MISMATCH");
  return {
    id: text(item.id, "BUDGET_ID_MISMATCH"),
    type: oneOf(item.type, ["DISTRIBUTION_BUDGET", "ORDINARY_AWARD_BUDGET", "AI_BUDGET", "REFERRAL_BUDGET"] as const, "BUDGET_TYPE_MISMATCH"),
    availablePoints: text(item.availablePoints, "BUDGET_AVAILABLE_MISMATCH"),
    reservedPoints: text(item.reservedPoints, "BUDGET_RESERVED_MISMATCH"),
    version: text(item.version, "BUDGET_VERSION_MISMATCH"),
  };
}

export function readBudgetPage(value: unknown): Page<BudgetAccount> {
  return readPage(value, readBudget, "BUDGET_PAGE_MISMATCH");
}

export function readTaskAccepted(value: unknown): TaskAccepted {
  const item = record(value, "TASK_ACCEPTED_MISMATCH");
  return {
    taskId: text(item.taskId, "TASK_ID_MISMATCH"),
    status: oneOf(item.status, ["PENDING", "RUNNING", "RETRY_WAIT"] as const, "TASK_STATUS_MISMATCH"),
    statusUrl: text(item.statusUrl, "TASK_URL_MISMATCH"),
    pollAfterSeconds: integer(item.pollAfterSeconds, "TASK_POLL_MISMATCH"),
  };
}

export function readTaskStatus(value: unknown): TaskStatus {
  const item = record(value, "TASK_STATUS_RESPONSE_MISMATCH");
  return {
    id: text(item.id, "TASK_STATUS_ID_MISMATCH"),
    taskType: text(item.taskType, "TASK_TYPE_MISMATCH"),
    status: oneOf(item.status, ["PENDING", "RUNNING", "RETRY_WAIT", "SUCCEEDED", "FAILED", "CANCELLED"] as const, "TASK_STATUS_VALUE_MISMATCH"),
    progress: numberValue(item.progress, "TASK_PROGRESS_MISMATCH"),
    resultUrl: nullableText(item.resultUrl, "TASK_RESULT_URL_MISMATCH"),
    resultCode: nullableText(item.resultCode, "TASK_RESULT_CODE_MISMATCH"),
    failureCode: nullableText(item.failureCode, "TASK_FAILURE_CODE_MISMATCH"),
    updatedAt: text(item.updatedAt, "TASK_UPDATED_MISMATCH"),
  };
}

export function readCommandReceipt(value: unknown): CommandReceipt {
  const item = record(value, "COMMAND_RECEIPT_MISMATCH");
  return {
    commandId: text(item.commandId, "COMMAND_ID_MISMATCH"),
    operationId: text(item.operationId, "COMMAND_OPERATION_MISMATCH"),
    resourceId: text(item.resourceId, "COMMAND_RESOURCE_MISMATCH"),
    status: oneOf(item.status, ["ACCEPTED", "COMPLETED"] as const, "COMMAND_STATUS_MISMATCH"),
    createdAt: text(item.createdAt, "COMMAND_CREATED_MISMATCH"),
  };
}

export function readCommandResult(value: unknown): CommandResult {
  const item = record(value, "COMMAND_RESULT_MISMATCH");
  return {
    operationId: text(item.operationId, "COMMAND_RESULT_OPERATION_MISMATCH"),
    resourceId: nullableText(item.resourceId, "COMMAND_RESULT_RESOURCE_MISMATCH"),
    taskId: nullableText(item.taskId, "COMMAND_RESULT_TASK_MISMATCH"),
    status: oneOf(item.status, ["PROCESSING", "SUCCEEDED", "FAILED"] as const, "COMMAND_RESULT_STATUS_MISMATCH"),
    httpStatus: integer(item.httpStatus, "COMMAND_RESULT_HTTP_MISMATCH"),
    resultUrl: nullableText(item.resultUrl, "COMMAND_RESULT_URL_MISMATCH"),
    failureCode: nullableText(item.failureCode, "COMMAND_RESULT_FAILURE_MISMATCH"),
  };
}

export function readReport(value: unknown): ReportResult {
  const item = record(value, "AI_REPORT_MISMATCH");
  const filter = record(item.filters, "AI_REPORT_FILTER_MISMATCH");
  return {
    reportType: oneOf(item.reportType, ["AI_POOLS"] as const, "AI_REPORT_TYPE_MISMATCH"),
    metricDictionaryVersion: text(item.metricDictionaryVersion, "AI_REPORT_DICTIONARY_MISMATCH"),
    snapshotId: text(item.snapshotId, "AI_REPORT_SNAPSHOT_MISMATCH"),
    filters: {
      from: text(filter.from, "AI_REPORT_FROM_MISMATCH"),
      to: text(filter.to, "AI_REPORT_TO_MISMATCH"),
      asOf: optionalNullableText(filter.asOf, "AI_REPORT_ASOF_MISMATCH"),
      projectId: optionalNonNullText(filter.projectId, "AI_REPORT_PROJECT_MISMATCH"),
      lotteryId: optionalNonNullText(filter.lotteryId, "AI_REPORT_LOTTERY_MISMATCH"),
      issueCode: optionalNonNullText(filter.issueCode, "AI_REPORT_ISSUE_MISMATCH"),
      status: optionalNonNullText(filter.status, "AI_REPORT_STATUS_MISMATCH"),
      groupBy: filter.groupBy === undefined ? undefined : oneOf(filter.groupBy, ["POOL_ISSUE"] as const, "AI_REPORT_GROUP_MISMATCH"),
    },
    asOf: text(item.asOf, "AI_REPORT_TIME_MISMATCH"),
    projectionVersion: text(item.projectionVersion, "AI_REPORT_PROJECTION_MISMATCH"),
    sourceWatermark: text(item.sourceWatermark, "AI_REPORT_WATERMARK_MISMATCH"),
    items: array(item.items, "AI_REPORT_ROWS_MISMATCH").map(readReportRow),
    totals: record(item.totals, "AI_REPORT_TOTALS_MISMATCH"),
    totalScope: oneOf(item.totalScope, ["FULL_FILTER"] as const, "AI_REPORT_SCOPE_MISMATCH"),
    nextCursor: nullableText(item.nextCursor, "AI_REPORT_CURSOR_MISMATCH"),
    hasMore: bool(item.hasMore, "AI_REPORT_MORE_MISMATCH"),
    complete: bool(item.complete, "AI_REPORT_COMPLETE_MISMATCH"),
  };
}

export function readExportStatus(value: unknown): ExportStatus {
  const item = record(value, "AI_EXPORT_MISMATCH");
  return {
    id: text(item.id, "AI_EXPORT_ID_MISMATCH"),
    status: text(item.status, "AI_EXPORT_STATUS_MISMATCH"),
    rowCount: text(item.rowCount, "AI_EXPORT_ROWS_MISMATCH"),
    downloadUrl: nullableText(item.downloadUrl, "AI_EXPORT_URL_MISMATCH"),
    expiresAt: nullableText(item.expiresAt, "AI_EXPORT_EXPIRY_MISMATCH"),
  };
}

export function readActionAuthorization(value: unknown): ActionAuthorization {
  const item = record(value, "ACTION_AUTHORIZATION_MISMATCH");
  return {
    actionToken: text(item.actionToken, "ACTION_TOKEN_MISMATCH"),
    expiresAt: text(item.expiresAt, "ACTION_EXPIRY_MISMATCH"),
  };
}

export function metric(value: Readonly<Record<string, unknown>>, key: string): string | null {
  const item = value[key];
  return typeof item === "string" || typeof item === "number" ? String(item) : null;
}

export function nameRef(value: unknown): NameRef | null {
  if (value === null || value === undefined) return null;
  const item = record(value, "NAME_REF_MISMATCH");
  return {
    id: text(item.id, "NAME_REF_ID_MISMATCH"),
    code: text(item.code, "NAME_REF_CODE_MISMATCH"),
    name: text(item.name, "NAME_REF_NAME_MISMATCH"),
  };
}

function readCombination(value: unknown): FixedCombination {
  const item = record(value, "AI_COMBINATION_MISMATCH");
  return {
    id: text(item.id, "AI_COMBINATION_ID_MISMATCH"),
    sequenceNo: integer(item.sequenceNo, "AI_COMBINATION_SEQUENCE_MISMATCH"),
    selection: readSelection(item.selection),
    selectionHash: text(item.selectionHash, "AI_COMBINATION_HASH_MISMATCH"),
    numberCodes: stringArray(item.numberCodes, "AI_COMBINATION_NUMBERS_MISMATCH"),
    groupHash: text(item.groupHash, "AI_COMBINATION_GROUP_HASH_MISMATCH"),
    baseBetCount: text(item.baseBetCount, "AI_COMBINATION_BETS_MISMATCH"),
    baseCostPoints: text(item.baseCostPoints, "AI_COMBINATION_COST_MISMATCH"),
    generatedAt: text(item.generatedAt, "AI_COMBINATION_TIME_MISMATCH"),
  };
}

function readPreviewCombination(value: unknown): PreviewCombination {
  const item = record(value, "AI_PREVIEW_COMBINATION_MISMATCH");
  return {
    sequenceNo: integer(item.sequenceNo, "AI_PREVIEW_COMBINATION_SEQUENCE_MISMATCH"),
    selection: readSelection(item.selection),
    selectionHash: text(item.selectionHash, "AI_PREVIEW_COMBINATION_HASH_MISMATCH"),
    numberCodes: stringArray(item.numberCodes, "AI_PREVIEW_COMBINATION_NUMBERS_MISMATCH"),
    groupHash: text(item.groupHash, "AI_PREVIEW_COMBINATION_GROUP_HASH_MISMATCH"),
    baseBetCount: text(item.baseBetCount, "AI_PREVIEW_COMBINATION_BETS_MISMATCH"),
    baseCostPoints: text(item.baseCostPoints, "AI_PREVIEW_COMBINATION_COST_MISMATCH"),
  };
}

function readSelection(value: unknown): Selection {
  const item = record(value, "AI_SELECTION_MISMATCH");
  return {
    schemaId: text(item.schemaId, "AI_SELECTION_SCHEMA_MISMATCH"),
    schemaVersion: text(item.schemaVersion, "AI_SELECTION_VERSION_MISMATCH"),
    mode: oneOf(item.mode, ["SINGLE", "MULTIPLE", "DANTUO", "POSITIONAL", "GROUP"] as const, "AI_SELECTION_MODE_MISMATCH"),
    areas: array(item.areas, "AI_SELECTION_AREAS_MISMATCH").map((value) => {
      const area = record(value, "AI_SELECTION_AREA_MISMATCH");
      return {
        key: text(area.key, "AI_SELECTION_AREA_KEY_MISMATCH"),
        chosen: optionalNumberArray(area.chosen, "AI_SELECTION_CHOSEN_MISMATCH"),
        dan: optionalNumberArray(area.dan, "AI_SELECTION_DAN_MISMATCH"),
        tuo: optionalNumberArray(area.tuo, "AI_SELECTION_TUO_MISMATCH"),
      };
    }),
  };
}

function readAllocationItem(value: unknown): AllocationItem {
  const item = record(value, "AI_ALLOCATION_ITEM_MISMATCH");
  return {
    combinationId: text(item.combinationId, "AI_ALLOCATION_ITEM_ID_MISMATCH"),
    sequenceNo: integer(item.sequenceNo, "AI_ALLOCATION_ITEM_SEQUENCE_MISMATCH"),
    allocatedPoints: text(item.allocatedPoints, "AI_ALLOCATION_ITEM_ALLOCATED_MISMATCH"),
    multiplier: text(item.multiplier, "AI_ALLOCATION_ITEM_MULTIPLIER_MISMATCH"),
    allocationRatio: text(item.allocationRatio, "AI_ALLOCATION_ITEM_RATIO_MISMATCH"),
    awardCodes: stringArray(item.awardCodes, "AI_ALLOCATION_ITEM_AWARDS_MISMATCH"),
    winningPoints: text(item.winningPoints, "AI_ALLOCATION_ITEM_WINNING_MISMATCH"),
  };
}

function readReportRow(value: unknown): ReportRow {
  const item = record(value, "AI_REPORT_ROW_MISMATCH");
  return {
    dimensions: record(item.dimensions, "AI_REPORT_DIMENSIONS_MISMATCH"),
    metrics: record(item.metrics, "AI_REPORT_METRICS_MISMATCH"),
  };
}

function readPage<T>(value: unknown, reader: (item: unknown) => T, code: string): Page<T> {
  const item = record(value, code);
  return {
    items: array(item.items, code).map(reader),
    nextCursor: nullableText(item.nextCursor, code),
    hasMore: bool(item.hasMore, code),
    snapshotId: nullableText(item.snapshotId, code),
  };
}

function record(value: unknown, code: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError(code);
  return value as Record<string, unknown>;
}

function array(value: unknown, code: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(code);
  return value;
}

function text(value: unknown, code: string): string {
  if (typeof value !== "string") throw new TypeError(code);
  return value;
}

function nullableText(value: unknown, code: string): string | null {
  if (value === null) return null;
  return text(value, code);
}

function optionalNonNullText(value: unknown, code: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  return text(value, code);
}

function optionalNullableText(value: unknown, code: string): string | null | undefined {
  if (value === undefined) return undefined;
  return nullableText(value, code);
}

function integer(value: unknown, code: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) throw new TypeError(code);
  return value;
}

function numberValue(value: unknown, code: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(code);
  return value;
}

function bool(value: unknown, code: string): boolean {
  if (typeof value !== "boolean") throw new TypeError(code);
  return value;
}

function oneOf<const T extends readonly string[]>(value: unknown, values: T, code: string): T[number] {
  if (typeof value !== "string" || !values.includes(value)) throw new TypeError(code);
  return value as T[number];
}

function stringArray(value: unknown, code: string): readonly string[] {
  return array(value, code).map((item) => text(item, code));
}

function optionalNumberArray(value: unknown, code: string): readonly number[] {
  if (value === undefined) return [];
  return array(value, code).map((item) => integer(item, code));
}

export interface SettlementExecution {
  poolIssueId: string;
  settlementMode: SettlementMode;
  modeChangeAllowed: boolean;
  currentAllocationId: string | null;
  currentAllocationVersion: string | null;
  targetNetReturnPercent: number;
  totalReturnPoints: string | null;
  postedReturnPoints: string;
  targetRoundingAdjustmentPoints: string | null;
  payoutBatchId: string | null;
  automaticTaskId: string | null;
  automaticTaskStatus: string | null;
  failureCode: string | null;
}

export function readSettlementExecution(value: unknown): SettlementExecution {
  const item = record(value, "AI_EXECUTION_MISMATCH");
  return {
    poolIssueId: text(item.poolIssueId, "AI_EXECUTION_POOL_MISMATCH"),
    settlementMode: oneOf(item.settlementMode, ["MANUAL", "AUTO"] as const, "AI_MODE_MISMATCH"),
    modeChangeAllowed: bool(item.modeChangeAllowed, "AI_EXECUTION_LOCK_MISMATCH"),
    currentAllocationId: nullableText(item.currentAllocationId, "AI_EXECUTION_ALLOCATION_MISMATCH"),
    currentAllocationVersion: nullableText(item.currentAllocationVersion, "AI_EXECUTION_VERSION_MISMATCH"),
    targetNetReturnPercent: integer(item.targetNetReturnPercent, "AI_EXECUTION_TARGET_MISMATCH"),
    totalReturnPoints: nullableText(item.totalReturnPoints, "AI_EXECUTION_RETURN_MISMATCH"),
    postedReturnPoints: text(item.postedReturnPoints, "AI_EXECUTION_POSTED_MISMATCH"),
    targetRoundingAdjustmentPoints: nullableText(item.targetRoundingAdjustmentPoints, "AI_EXECUTION_TAIL_MISMATCH"),
    payoutBatchId: nullableText(item.payoutBatchId, "AI_EXECUTION_BATCH_MISMATCH"),
    automaticTaskId: nullableText(item.automaticTaskId, "AI_EXECUTION_TASK_MISMATCH"),
    automaticTaskStatus: nullableText(item.automaticTaskStatus, "AI_EXECUTION_STATUS_MISMATCH"),
    failureCode: nullableText(item.failureCode, "AI_EXECUTION_FAILURE_MISMATCH"),
  };
}
