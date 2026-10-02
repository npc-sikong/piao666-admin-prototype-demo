import type { LotteryCode } from "@piao777/ui-tokens";

export interface AdminLottery {
  id: string;
  code: LotteryCode;
  name: string;
  latestIssueCode: string | null;
  plays: readonly AdminPlay[];
}

export interface AdminPlay {
  id: string;
  code: string;
  name: string;
  ruleVersion: string | null;
  readiness: PlayReadiness;
}

export type PlayReadiness =
  | "READY"
  | "CATALOG_UNCONFIRMED"
  | "RULE_UNCONFIRMED"
  | "DATA_UNAVAILABLE";

export interface AdminCatalog {
  version: string;
  approvalStatus: "APPROVED" | "D01_PENDING";
  lotteries: readonly AdminLottery[];
}

export interface AdminIssue {
  id: string;
  lotteryId: string;
  issueCode: string;
  status: "SCHEDULED" | "OPEN" | "CLOSED" | "CANCELLED" | "DRAWN";
  openAt: string | null;
  cutoffAt: string | null;
  drawAt: string | null;
  drawDate: string;
  officialIssueCode: string;
  version: string;
}

export interface AdminIssuePage {
  items: readonly AdminIssue[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface DataHealthItem {
  lotteryId: string;
  latestConfirmedIssue: string | null;
  drawVersion: string | null;
  omissionGeneration: string | null;
  gapCount: number;
  trailingGap: boolean;
  drawVersionSetHash: string | null;
  qualificationLag: number;
  pendingTaskCount: number;
  /** 已确认开奖但尚未纳入当前生效遗漏投影的期数；>0 表示需要重建。 */
  projectionLag: number;
  /** gapCount 里已被人工确认接受（源侧不可得）的缺口数，不参与降级判定。 */
  acknowledgedGapCount: number;
  status: "READY" | "DEGRADED" | "UNAVAILABLE";
}

/** 当前生效遗漏投影里的一处缺口：缺在 beforeIssueCode 与 afterIssueCode 之间。 */
export interface OmissionGap {
  beforeIssueCode: string;
  afterIssueCode: string;
  acknowledged: boolean;
  acknowledgementId: string | null;
  reason: string | null;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
}

export interface OmissionGapPage {
  lotteryId: string;
  gapCount: number;
  acknowledgedGapCount: number;
  items: readonly OmissionGap[];
}

export interface DataHealthPage {
  items: readonly DataHealthItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface SourceHealthItem {
  id: string;
  name: string;
  lotteryIds: readonly string[];
  status: "APPROVED" | "UNAPPROVED" | "FAILED" | "CONFLICT";
  lastSuccessAt: string | null;
  failureCode: string | null;
}

export interface SourceHealthPage {
  items: readonly SourceHealthItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type ReportType =
  | "MEMBER_OVERVIEW"
  | "MEMBER_POINTS"
  | "VIP_LEVELS"
  | "REFERRAL_LEVELS"
  | "AI_QUOTA"
  | "AI_POOLS"
  | "STATION_MASTERS"
  | "LEDGER_RECONCILIATION";

export interface ReportRow {
  dimensions: Readonly<Record<string, unknown>>;
  metrics: Readonly<Record<string, unknown>>;
}

export interface ReportResult {
  reportType: ReportType;
  metricDictionaryVersion: string;
  snapshotId: string;
  asOf: string;
  projectionVersion: string;
  sourceWatermark: string;
  items: readonly ReportRow[];
  totals: Readonly<Record<string, unknown>>;
  totalScope: string;
  nextCursor: string | null;
  hasMore: boolean;
  complete: boolean;
}

export interface RuleDetail {
  playId: string;
  officialRuleVersion: string;
  simulationRuleVersion: string | null;
  readiness: "READY" | "UNCONFIRMED" | "DATA_UNAVAILABLE";
  ruleText: string;
  baseCostPoints: string;
  sourceEvidenceIds: readonly string[];
}

export interface RuleDraft {
  id: string;
  playId: string;
  version: string;
  recordVersion: string;
  status: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  authorId: string;
  artifactHash: string;
  effectiveFromIssue: string;
}

export interface RuleDraftPage {
  items: readonly RuleDraft[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type PolicyCode =
  | "SIMULATION_AWARD"
  | "REFERRAL_FIXED"
  | "REFERRAL_AI_SHARE";

export interface PolicyView {
  id: string;
  code: PolicyCode;
  version: string;
  recordVersion: string;
  status: "UNCONFIRMED" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "SUPERSEDED";
  artifactId: string;
  artifactHash: string;
  decisionIds: readonly string[];
  authorId: string;
  createdAt: string;
}

export interface PolicyViewPage {
  items: readonly PolicyView[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface DrawArea {
  key: string;
  chosen: readonly number[];
}

export interface DrawCandidate {
  id: string;
  lotteryId: string;
  issueCode: string;
  areas: readonly DrawArea[];
  source: "MANUAL" | "SYSTEM";
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "CONFLICT";
  evidenceIds: readonly string[];
  authorId: string;
  replacesDrawVersion: string | null;
  version: string;
  createdAt: string;
}

export interface DrawCandidatePage {
  items: readonly DrawCandidate[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface DrawVersion {
  lotteryId: string;
  lotteryCode: LotteryCode;
  issueCode: string;
  version: string;
  status: "PENDING" | "CONFIRMED" | "CORRECTED" | "CONFLICT";
  source: "SYSTEM" | "MANUAL_REVIEWED";
  areas: readonly DrawArea[];
  confirmedAt: string | null;
  correctionNote: string | null;
  prizeReferenceStatus: "PENDING" | "FINAL" | "UNAVAILABLE" | "SUPERSEDED";
}

export interface DrawVersionPage {
  items: readonly DrawVersion[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface TaskAccepted {
  taskId: string;
  status: string;
  statusUrl: string;
  pollAfterSeconds: number;
}

export interface TaskStatusSummary {
  id: string;
  taskType: string;
  status: string;
  progress: number;
  resultUrl: string | null;
  resultCode: string | null;
  failureCode: string | null;
  updatedAt: string;
}

export interface EvidenceUpload {
  id: string;
  status: string;
  sha256: string;
  purpose: string;
}

export interface ActionAuthorization {
  actionToken: string;
  expiresAt: string;
}

const lotteryCodes = new Set<LotteryCode>([
  "SSQ", "DLT", "FC3D", "PL3", "PL5", "QLC", "KL8", "QXC",
]);

const reportTypes = [
  "MEMBER_OVERVIEW",
  "MEMBER_POINTS",
  "VIP_LEVELS",
  "REFERRAL_LEVELS",
  "AI_QUOTA",
  "AI_POOLS",
  "STATION_MASTERS",
  "LEDGER_RECONCILIATION",
] as const;

export function readAdminCatalog(value: unknown): AdminCatalog {
  const root = record(value, "CATALOG_RESPONSE_MISMATCH");
  const approvalStatus = oneOf(
    text(root.approvalStatus, "CATALOG_STATUS_MISMATCH"),
    ["APPROVED", "D01_PENDING"] as const,
    "CATALOG_STATUS_MISMATCH",
  );
  return {
    version: text(root.version, "CATALOG_VERSION_MISMATCH"),
    approvalStatus,
    lotteries: array(root.lotteries, "CATALOG_LOTTERIES_MISMATCH").map((value) => {
      const lottery = record(value, "CATALOG_LOTTERY_MISMATCH");
      const code = text(lottery.code, "CATALOG_CODE_MISMATCH");
      if (!lotteryCodes.has(code as LotteryCode)) {
        throw new TypeError("CATALOG_CODE_MISMATCH");
      }
      return {
        id: text(lottery.id, "CATALOG_ID_MISMATCH"),
        code: code as LotteryCode,
        name: text(lottery.name, "CATALOG_NAME_MISMATCH"),
        latestIssueCode: nullableText(lottery.latestIssueCode, "CATALOG_ISSUE_MISMATCH"),
        plays: array(lottery.plays, "CATALOG_PLAYS_MISMATCH").map(readAdminPlay),
      };
    }),
  };
}

export function readIssuePage(value: unknown): AdminIssuePage {
  const root = record(value, "ISSUE_PAGE_MISMATCH");
  return page(root, "ISSUE_PAGE_MISMATCH", (value) => {
    const item = record(value, "ISSUE_MISMATCH");
    return {
      id: text(item.id, "ISSUE_ID_MISMATCH"),
      lotteryId: text(item.lotteryId, "ISSUE_LOTTERY_MISMATCH"),
      issueCode: text(item.issueCode, "ISSUE_CODE_MISMATCH"),
      status: oneOf(text(item.status, "ISSUE_STATUS_MISMATCH"), [
        "SCHEDULED", "OPEN", "CLOSED", "CANCELLED", "DRAWN",
      ] as const, "ISSUE_STATUS_MISMATCH"),
      openAt: nullableText(item.openAt, "ISSUE_OPEN_AT_MISMATCH"),
      cutoffAt: nullableText(item.cutoffAt, "ISSUE_CUTOFF_AT_MISMATCH"),
      drawAt: nullableText(item.drawAt, "ISSUE_DRAW_AT_MISMATCH"),
      drawDate: text(item.drawDate, "ISSUE_DRAW_DATE_MISMATCH"),
      officialIssueCode: text(item.officialIssueCode, "ISSUE_OFFICIAL_CODE_MISMATCH"),
      version: text(item.version, "ISSUE_VERSION_MISMATCH"),
    };
  });
}

export function readDataHealthPage(value: unknown): DataHealthPage {
  const root = record(value, "DATA_HEALTH_PAGE_MISMATCH");
  return page(root, "DATA_HEALTH_PAGE_MISMATCH", (value) => {
    const item = record(value, "DATA_HEALTH_MISMATCH");
    return {
      lotteryId: text(item.lotteryId, "DATA_HEALTH_LOTTERY_MISMATCH"),
      latestConfirmedIssue: nullableText(item.latestConfirmedIssue, "DATA_HEALTH_ISSUE_MISMATCH"),
      drawVersion: nullableText(item.drawVersion, "DATA_HEALTH_DRAW_VERSION_MISMATCH"),
      omissionGeneration: nullableText(item.omissionGeneration, "DATA_HEALTH_GENERATION_MISMATCH"),
      gapCount: integer(item.gapCount, "DATA_HEALTH_GAP_MISMATCH"),
      trailingGap: bool(item.trailingGap, "DATA_HEALTH_TRAILING_GAP_MISMATCH"),
      drawVersionSetHash: nullableText(item.drawVersionSetHash, "DATA_HEALTH_HASH_MISMATCH"),
      qualificationLag: integer(item.qualificationLag, "DATA_HEALTH_QUALIFICATION_MISMATCH"),
      pendingTaskCount: integer(item.pendingTaskCount, "DATA_HEALTH_TASK_MISMATCH"),
      projectionLag: integer(item.projectionLag, "DATA_HEALTH_PROJECTION_LAG_MISMATCH"),
      acknowledgedGapCount: integer(
        item.acknowledgedGapCount,
        "DATA_HEALTH_ACKNOWLEDGED_GAP_MISMATCH",
      ),
      status: oneOf(text(item.status, "DATA_HEALTH_STATUS_MISMATCH"), [
        "READY", "DEGRADED", "UNAVAILABLE",
      ] as const, "DATA_HEALTH_STATUS_MISMATCH"),
    };
  });
}

export function readOmissionGapPage(value: unknown): OmissionGapPage {
  const root = record(value, "OMISSION_GAP_PAGE_MISMATCH");
  const items = root.items;
  if (!Array.isArray(items)) {
    throw new Error("OMISSION_GAP_PAGE_MISMATCH");
  }
  return {
    lotteryId: text(root.lotteryId, "OMISSION_GAP_LOTTERY_MISMATCH"),
    gapCount: integer(root.gapCount, "OMISSION_GAP_COUNT_MISMATCH"),
    acknowledgedGapCount: integer(
      root.acknowledgedGapCount,
      "OMISSION_GAP_ACKNOWLEDGED_MISMATCH",
    ),
    items: items.map((entry) => {
      const item = record(entry, "OMISSION_GAP_MISMATCH");
      return {
        beforeIssueCode: text(item.beforeIssueCode, "OMISSION_GAP_BEFORE_MISMATCH"),
        afterIssueCode: text(item.afterIssueCode, "OMISSION_GAP_AFTER_MISMATCH"),
        acknowledged: bool(item.acknowledged, "OMISSION_GAP_ACKNOWLEDGED_MISMATCH"),
        acknowledgementId: nullableText(item.acknowledgementId, "OMISSION_GAP_ID_MISMATCH"),
        reason: nullableText(item.reason, "OMISSION_GAP_REASON_MISMATCH"),
        acknowledgedBy: nullableText(item.acknowledgedBy, "OMISSION_GAP_ACTOR_MISMATCH"),
        acknowledgedAt: nullableText(item.acknowledgedAt, "OMISSION_GAP_TIME_MISMATCH"),
      };
    }),
  };
}

export function readSourceHealthPage(value: unknown): SourceHealthPage {
  const root = record(value, "SOURCE_PAGE_MISMATCH");
  return page(root, "SOURCE_PAGE_MISMATCH", (value) => {
    const item = record(value, "SOURCE_MISMATCH");
    return {
      id: text(item.id, "SOURCE_ID_MISMATCH"),
      name: text(item.name, "SOURCE_NAME_MISMATCH"),
      lotteryIds: stringArray(item.lotteryIds, "SOURCE_LOTTERIES_MISMATCH"),
      status: oneOf(text(item.status, "SOURCE_STATUS_MISMATCH"), [
        "APPROVED", "UNAPPROVED", "FAILED", "CONFLICT",
      ] as const, "SOURCE_STATUS_MISMATCH"),
      lastSuccessAt: nullableText(item.lastSuccessAt, "SOURCE_LAST_SUCCESS_MISMATCH"),
      failureCode: nullableText(item.failureCode, "SOURCE_FAILURE_MISMATCH"),
    };
  });
}

export function readReportResult(value: unknown): ReportResult {
  const root = record(value, "REPORT_RESPONSE_MISMATCH");
  const type = oneOf(
    text(root.reportType, "REPORT_TYPE_MISMATCH"),
    reportTypes,
    "REPORT_TYPE_MISMATCH",
  );
  return {
    reportType: type,
    metricDictionaryVersion: text(root.metricDictionaryVersion, "REPORT_DICTIONARY_MISMATCH"),
    snapshotId: text(root.snapshotId, "REPORT_SNAPSHOT_MISMATCH"),
    asOf: text(root.asOf, "REPORT_AS_OF_MISMATCH"),
    projectionVersion: text(root.projectionVersion, "REPORT_PROJECTION_MISMATCH"),
    sourceWatermark: text(root.sourceWatermark, "REPORT_WATERMARK_MISMATCH"),
    items: array(root.items, "REPORT_ITEMS_MISMATCH").map((value) => {
      const item = record(value, "REPORT_ROW_MISMATCH");
      return {
        dimensions: objectMap(item.dimensions, "REPORT_DIMENSIONS_MISMATCH"),
        metrics: objectMap(item.metrics, "REPORT_METRICS_MISMATCH"),
      };
    }),
    totals: objectMap(root.totals, "REPORT_TOTALS_MISMATCH"),
    totalScope: text(root.totalScope, "REPORT_TOTAL_SCOPE_MISMATCH"),
    nextCursor: nullableText(root.nextCursor, "REPORT_CURSOR_MISMATCH"),
    hasMore: bool(root.hasMore, "REPORT_HAS_MORE_MISMATCH"),
    complete: bool(root.complete, "REPORT_COMPLETE_MISMATCH"),
  };
}

export function readRuleDetail(value: unknown): RuleDetail {
  const root = record(value, "RULE_RESPONSE_MISMATCH");
  return {
    playId: text(root.playId, "RULE_PLAY_MISMATCH"),
    officialRuleVersion: text(root.officialRuleVersion, "RULE_OFFICIAL_VERSION_MISMATCH"),
    simulationRuleVersion: nullableText(root.simulationRuleVersion, "RULE_SIMULATION_VERSION_MISMATCH"),
    readiness: oneOf(text(root.readiness, "RULE_READINESS_MISMATCH"), [
      "READY", "UNCONFIRMED", "DATA_UNAVAILABLE",
    ] as const, "RULE_READINESS_MISMATCH"),
    ruleText: text(root.ruleText, "RULE_TEXT_MISMATCH"),
    baseCostPoints: text(root.baseCostPoints, "RULE_COST_MISMATCH"),
    sourceEvidenceIds: stringArray(root.sourceEvidenceIds, "RULE_EVIDENCE_MISMATCH"),
  };
}

export function readRuleDraftPage(value: unknown): RuleDraftPage {
  const root = record(value, "RULE_DRAFT_PAGE_MISMATCH");
  return page(root, "RULE_DRAFT_PAGE_MISMATCH", readRuleDraft);
}

export function readRuleDraft(value: unknown): RuleDraft {
  const item = record(value, "RULE_DRAFT_MISMATCH");
  return {
    id: text(item.id, "RULE_DRAFT_ID_MISMATCH"),
    playId: text(item.playId, "RULE_DRAFT_PLAY_MISMATCH"),
    version: text(item.version, "RULE_DRAFT_VERSION_MISMATCH"),
    recordVersion: text(item.recordVersion, "RULE_DRAFT_RECORD_VERSION_MISMATCH"),
    status: oneOf(text(item.status, "RULE_DRAFT_STATUS_MISMATCH"), [
      "DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED",
    ] as const, "RULE_DRAFT_STATUS_MISMATCH"),
    authorId: text(item.authorId, "RULE_DRAFT_AUTHOR_MISMATCH"),
    artifactHash: text(item.artifactHash, "RULE_DRAFT_HASH_MISMATCH"),
    effectiveFromIssue: text(item.effectiveFromIssue, "RULE_DRAFT_ISSUE_MISMATCH"),
  };
}

export function readPolicyViewPage(value: unknown): PolicyViewPage {
  const root = record(value, "POLICY_PAGE_MISMATCH");
  return page(root, "POLICY_PAGE_MISMATCH", readPolicyView);
}

export function readPolicyView(value: unknown): PolicyView {
  const item = record(value, "POLICY_MISMATCH");
  return {
    id: text(item.id, "POLICY_ID_MISMATCH"),
    code: oneOf(text(item.code, "POLICY_CODE_MISMATCH"), [
      "SIMULATION_AWARD", "REFERRAL_FIXED", "REFERRAL_AI_SHARE",
    ] as const, "POLICY_CODE_MISMATCH"),
    version: text(item.version, "POLICY_VERSION_MISMATCH"),
    recordVersion: text(item.recordVersion, "POLICY_RECORD_VERSION_MISMATCH"),
    status: oneOf(text(item.status, "POLICY_STATUS_MISMATCH"), [
      "UNCONFIRMED", "PENDING_REVIEW", "APPROVED", "REJECTED", "SUPERSEDED",
    ] as const, "POLICY_STATUS_MISMATCH"),
    artifactId: text(item.artifactId, "POLICY_ARTIFACT_MISMATCH"),
    artifactHash: text(item.artifactHash, "POLICY_HASH_MISMATCH"),
    decisionIds: stringArray(item.decisionIds, "POLICY_DECISIONS_MISMATCH"),
    authorId: text(item.authorId, "POLICY_AUTHOR_MISMATCH"),
    createdAt: text(item.createdAt, "POLICY_CREATED_AT_MISMATCH"),
  };
}

export function readDrawCandidatePage(value: unknown): DrawCandidatePage {
  const root = record(value, "CANDIDATE_PAGE_MISMATCH");
  return page(root, "CANDIDATE_PAGE_MISMATCH", readDrawCandidate);
}

export function readDrawCandidate(value: unknown): DrawCandidate {
  const item = record(value, "CANDIDATE_MISMATCH");
  return {
    id: text(item.id, "CANDIDATE_ID_MISMATCH"),
    lotteryId: text(item.lotteryId, "CANDIDATE_LOTTERY_MISMATCH"),
    issueCode: text(item.issueCode, "CANDIDATE_ISSUE_MISMATCH"),
    areas: readAreas(item.numbers),
    source: oneOf(text(item.source, "CANDIDATE_SOURCE_MISMATCH"), [
      "MANUAL", "SYSTEM",
    ] as const, "CANDIDATE_SOURCE_MISMATCH"),
    status: oneOf(text(item.status, "CANDIDATE_STATUS_MISMATCH"), [
      "PENDING_REVIEW", "APPROVED", "REJECTED", "CONFLICT",
    ] as const, "CANDIDATE_STATUS_MISMATCH"),
    evidenceIds: stringArray(item.evidenceIds, "CANDIDATE_EVIDENCE_MISMATCH"),
    authorId: text(item.authorId, "CANDIDATE_AUTHOR_MISMATCH"),
    replacesDrawVersion: nullableText(item.replacesDrawVersion, "CANDIDATE_REPLACES_MISMATCH"),
    version: text(item.version, "CANDIDATE_VERSION_MISMATCH"),
    createdAt: text(item.createdAt, "CANDIDATE_CREATED_AT_MISMATCH"),
  };
}

export function readDrawVersionPage(value: unknown): DrawVersionPage {
  const root = record(value, "DRAW_VERSION_PAGE_MISMATCH");
  return page(root, "DRAW_VERSION_PAGE_MISMATCH", readDrawVersion);
}

export function readDrawVersion(value: unknown): DrawVersion {
  const item = record(value, "DRAW_VERSION_MISMATCH");
  const lotteryCode = text(item.lotteryCode, "DRAW_VERSION_LOTTERY_CODE_MISMATCH");
  if (!lotteryCodes.has(lotteryCode as LotteryCode)) {
    throw new TypeError("DRAW_VERSION_LOTTERY_CODE_MISMATCH");
  }
  return {
    lotteryId: text(item.lotteryId, "DRAW_VERSION_LOTTERY_MISMATCH"),
    lotteryCode: lotteryCode as LotteryCode,
    issueCode: text(item.issueCode, "DRAW_VERSION_ISSUE_MISMATCH"),
    version: text(item.version, "DRAW_VERSION_NUMBER_MISMATCH"),
    status: oneOf(text(item.status, "DRAW_VERSION_STATUS_MISMATCH"), [
      "PENDING", "CONFIRMED", "CORRECTED", "CONFLICT",
    ] as const, "DRAW_VERSION_STATUS_MISMATCH"),
    source: oneOf(text(item.source, "DRAW_VERSION_SOURCE_MISMATCH"), [
      "SYSTEM", "MANUAL_REVIEWED",
    ] as const, "DRAW_VERSION_SOURCE_MISMATCH"),
    areas: readAreas(item.numbers),
    confirmedAt: nullableText(item.confirmedAt, "DRAW_VERSION_CONFIRMED_AT_MISMATCH"),
    correctionNote: nullableText(item.correctionNote, "DRAW_VERSION_NOTE_MISMATCH"),
    prizeReferenceStatus: oneOf(text(item.prizeReferenceStatus, "DRAW_VERSION_PRIZE_MISMATCH"), [
      "PENDING", "FINAL", "UNAVAILABLE", "SUPERSEDED",
    ] as const, "DRAW_VERSION_PRIZE_MISMATCH"),
  };
}

export function readTaskAccepted(value: unknown): TaskAccepted {
  const root = record(value, "TASK_ACCEPTED_MISMATCH");
  return {
    taskId: text(root.taskId, "TASK_ID_MISMATCH"),
    status: text(root.status, "TASK_STATUS_MISMATCH"),
    statusUrl: text(root.statusUrl, "TASK_URL_MISMATCH"),
    pollAfterSeconds: integer(root.pollAfterSeconds, "TASK_POLL_MISMATCH"),
  };
}

export function readTaskStatus(value: unknown): TaskStatusSummary {
  const root = record(value, "TASK_STATUS_RESPONSE_MISMATCH");
  return {
    id: text(root.id, "TASK_STATUS_ID_MISMATCH"),
    taskType: text(root.taskType, "TASK_TYPE_MISMATCH"),
    status: text(root.status, "TASK_STATUS_VALUE_MISMATCH"),
    progress: number(root.progress, "TASK_PROGRESS_MISMATCH"),
    resultUrl: nullableText(root.resultUrl, "TASK_RESULT_URL_MISMATCH"),
    resultCode: nullableText(root.resultCode, "TASK_RESULT_CODE_MISMATCH"),
    failureCode: nullableText(root.failureCode, "TASK_FAILURE_CODE_MISMATCH"),
    updatedAt: text(root.updatedAt, "TASK_UPDATED_AT_MISMATCH"),
  };
}

export function readEvidence(value: unknown): EvidenceUpload {
  const root = record(value, "EVIDENCE_MISMATCH");
  return {
    id: text(root.id, "EVIDENCE_ID_MISMATCH"),
    status: text(root.status, "EVIDENCE_STATUS_MISMATCH"),
    sha256: text(root.sha256, "EVIDENCE_HASH_MISMATCH"),
    purpose: text(root.purpose, "EVIDENCE_PURPOSE_MISMATCH"),
  };
}

export function readActionAuthorization(value: unknown): ActionAuthorization {
  const root = record(value, "ACTION_AUTHORIZATION_MISMATCH");
  return {
    actionToken: text(root.actionToken, "ACTION_TOKEN_MISMATCH"),
    expiresAt: text(root.expiresAt, "ACTION_EXPIRY_MISMATCH"),
  };
}

export function metricText(
  values: Readonly<Record<string, unknown>>,
  key: string,
): string | null {
  const value = values[key];
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : null;
}

function readAdminPlay(value: unknown): AdminPlay {
  const play = record(value, "CATALOG_PLAY_MISMATCH");
  return {
    id: text(play.id, "CATALOG_PLAY_ID_MISMATCH"),
    code: text(play.code, "CATALOG_PLAY_CODE_MISMATCH"),
    name: text(play.name, "CATALOG_PLAY_NAME_MISMATCH"),
    ruleVersion: nullableText(play.ruleVersion, "CATALOG_PLAY_VERSION_MISMATCH"),
    readiness: oneOf(text(play.readiness, "CATALOG_PLAY_READINESS_MISMATCH"), [
      "READY", "CATALOG_UNCONFIRMED", "RULE_UNCONFIRMED", "DATA_UNAVAILABLE",
    ] as const, "CATALOG_PLAY_READINESS_MISMATCH"),
  };
}

function readAreas(value: unknown): readonly DrawArea[] {
  const numbers = record(value, "DRAW_NUMBERS_MISMATCH");
  return array(numbers.areas, "DRAW_AREAS_MISMATCH").map((value) => {
    const area = record(value, "DRAW_AREA_MISMATCH");
    return {
      key: text(area.key, "DRAW_AREA_KEY_MISMATCH"),
      chosen: array(area.chosen, "DRAW_AREA_VALUES_MISMATCH").map((value) => (
        integer(value, "DRAW_AREA_VALUE_MISMATCH")
      )),
    };
  });
}

function page<T>(
  root: Record<string, unknown>,
  code: string,
  reader: (value: unknown) => T,
): { items: readonly T[]; nextCursor: string | null; hasMore: boolean } {
  return {
    items: array(root.items, code).map(reader),
    nextCursor: nullableText(root.nextCursor, code),
    hasMore: bool(root.hasMore, code),
  };
}

function record(value: unknown, code: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(code);
  }
  return value as Record<string, unknown>;
}

function objectMap(value: unknown, code: string): Readonly<Record<string, unknown>> {
  return { ...record(value, code) };
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

function number(value: unknown, code: string): number {
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

function stringArray(value: unknown, code: string): readonly string[] {
  return array(value, code).map((item) => text(item, code));
}

function oneOf<const T extends readonly string[]>(
  value: string,
  allowed: T,
  code: string,
): T[number] {
  if (!allowed.includes(value as T[number])) {
    throw new TypeError(code);
  }
  return value as T[number];
}
