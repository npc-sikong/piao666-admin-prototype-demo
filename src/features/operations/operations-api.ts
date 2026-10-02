import { storeEvidenceFile } from "@/demo/client";
import {
  ApiError,
  ApiTransportError,
  createIdempotencyKey,
} from "@piao777/api-client";
import { adminApi, publicApi } from "@/lib/api";
import {
  readActionAuthorization,
  readAdminCatalog,
  readDataHealthPage,
  readDrawCandidate,
  readDrawCandidatePage,
  readDrawVersionPage,
  readEvidence,
  readIssuePage,
  readOmissionGapPage,
  readPolicyView,
  readPolicyViewPage,
  readReportResult,
  readRuleDetail,
  readRuleDraft,
  readRuleDraftPage,
  readSourceHealthPage,
  readTaskAccepted,
  readTaskStatus,
  type AdminCatalog,
  type AdminIssuePage,
  type DataHealthPage,
  type DrawArea,
  type DrawCandidate,
  type DrawCandidatePage,
  type DrawVersionPage,
  type EvidenceUpload,
  type OmissionGapPage,
  type PolicyCode,
  type PolicyView,
  type PolicyViewPage,
  type ReportResult,
  type ReportType,
  type RuleDetail,
  type RuleDraft,
  type RuleDraftPage,
  type SourceHealthPage,
  type TaskAccepted,
  type TaskStatusSummary,
} from "./operations-models";

export interface ReportQuery {
  from: string;
  to: string;
  stationId?: string;
  lotteryId?: string;
  status?: string;
}

export interface IssueQuery {
  issueCode?: string;
  drawFrom?: string;
  drawTo?: string;
  cursor?: string;
  limit?: number;
}

export type UploadPurpose =
  | "DRAW_EVIDENCE"
  | "RULE_ARTIFACT"
  | "POLICY_ARTIFACT"
  | "ACCOUNT_RECOVERY";
export type ReviewDecision = "APPROVE" | "REJECT";

export async function getAdminCatalog(): Promise<AdminCatalog> {
  const response = await publicApi.request<unknown>("/api/v1/catalog");
  return readAdminCatalog(response.data);
}

export async function listIssues(
  lotteryId: string,
  query: IssueQuery = {},
): Promise<AdminIssuePage> {
  const response = await publicApi.request<unknown>(
    `/api/v1/lotteries/${encodeURIComponent(lotteryId)}/issues`,
    {
      query: {
        limit: query.limit ?? 50,
        cursor: query.cursor,
        issueCode: query.issueCode,
        drawFrom: query.drawFrom,
        drawTo: query.drawTo,
      },
    },
  );
  return readIssuePage(response.data);
}

export async function getRuleDetail(playId: string, issueCode?: string): Promise<RuleDetail> {
  const response = await publicApi.request<unknown>(
    `/api/v1/plays/${encodeURIComponent(playId)}/rules`,
    { query: { issueCode } },
  );
  return readRuleDetail(response.data);
}

export async function getDataHealth(): Promise<DataHealthPage> {
  const response = await adminApi.request<unknown>("/api/admin/v1/data-health", {
    query: { limit: 100 },
  });
  return readDataHealthPage(response.data);
}

export async function listDataSources(): Promise<SourceHealthPage> {
  const response = await adminApi.request<unknown>("/api/admin/v1/lottery-sources", {
    query: { limit: 100 },
  });
  return readSourceHealthPage(response.data);
}

export async function getAdminReport(
  reportType: ReportType,
  query: ReportQuery,
): Promise<ReportResult> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/reports/${encodeURIComponent(reportType)}`,
    {
      query: {
        from: query.from,
        to: query.to,
        stationId: query.stationId,
        lotteryId: query.lotteryId,
        status: query.status,
        limit: 100,
      },
    },
  );
  return readReportResult(response.data);
}

export async function listRuleDrafts(playId?: string): Promise<RuleDraftPage> {
  const response = await adminApi.request<unknown>("/api/admin/v1/play-rule-versions", {
    query: { playId, limit: 100 },
  });
  return readRuleDraftPage(response.data);
}

export async function listPolicies(): Promise<PolicyViewPage> {
  const response = await adminApi.request<unknown>(
    "/api/admin/v1/simulation-policy-versions",
    { query: { limit: 100 } },
  );
  return readPolicyViewPage(response.data);
}

export async function createRuleDraft(input: {
  playId: string;
  effectiveFromIssue: string;
  artifact: EvidenceUpload;
  reason: string;
  idempotencyKey: string;
}): Promise<RuleDraft> {
  const response = await adminApi.request<unknown>("/api/admin/v1/play-rule-versions", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: {
      playId: input.playId,
      effectiveFromIssue: input.effectiveFromIssue,
      ruleArtifactId: input.artifact.id,
      ruleArtifactHash: input.artifact.sha256,
      evidenceIds: [input.artifact.id],
      reason: input.reason,
    },
  });
  return readRuleDraft(response.data);
}

export async function createPolicyVersion(input: {
  code: PolicyCode;
  artifact: EvidenceUpload;
  reason: string;
  idempotencyKey: string;
}): Promise<PolicyView> {
  const response = await adminApi.request<unknown>(
    "/api/admin/v1/simulation-policy-versions",
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: {
        code: input.code,
        artifactId: input.artifact.id,
        artifactHash: input.artifact.sha256,
        decisionIds: policyDecisionIds(input.code),
        reason: input.reason,
      },
    },
  );
  return readPolicyView(response.data);
}

export async function fetchDraw(input: {
  lotteryId: string;
  issueCode: string;
  approvedSourceId: string;
  reason: string;
  idempotencyKey: string;
}): Promise<TaskAccepted> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/lotteries/${encodeURIComponent(input.lotteryId)}/issues/${encodeURIComponent(input.issueCode)}/draw-fetches`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: {
        approvedSourceId: input.approvedSourceId,
        reason: input.reason,
      },
    },
  );
  return readTaskAccepted(response.data);
}

export async function listDrawCandidates(
  lotteryId: string,
  issueCode: string,
): Promise<DrawCandidatePage> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/lotteries/${encodeURIComponent(lotteryId)}/issues/${encodeURIComponent(issueCode)}/draw-candidates`,
    { query: { limit: 100 } },
  );
  return readDrawCandidatePage(response.data);
}

export async function createDrawCandidate(input: {
  lotteryId: string;
  issueCode: string;
  areas: readonly DrawArea[];
  evidence: EvidenceUpload;
  reason: string;
  replacesDrawVersion?: string;
  idempotencyKey: string;
}): Promise<DrawCandidate> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/lotteries/${encodeURIComponent(input.lotteryId)}/issues/${encodeURIComponent(input.issueCode)}/draw-candidates`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: {
        numbers: { areas: input.areas },
        reason: input.reason,
        evidenceIds: [input.evidence.id],
        replacesDrawVersion: input.replacesDrawVersion ?? null,
      },
    },
  );
  return readDrawCandidate(response.data);
}

export async function listDrawVersions(
  lotteryId: string,
  issueCode: string,
): Promise<DrawVersionPage> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/lotteries/${encodeURIComponent(lotteryId)}/issues/${encodeURIComponent(issueCode)}/draw-versions`,
    { query: { limit: 100 } },
  );
  return readDrawVersionPage(response.data);
}

export async function reviewDrawCandidate(input: {
  candidate: DrawCandidate;
  decision: ReviewDecision;
  reason: string;
  proofCode: string;
  idempotencyKey: string;
}): Promise<void> {
  const expectedHash = await canonicalDigest([
    "DRAW_CONFIRM",
    input.candidate.id,
    input.candidate.version,
    input.decision,
    input.reason,
  ]);
  const action = await authorizeAction({
    purpose: "DRAW_CONFIRM",
    resourceId: input.candidate.id,
    expectedHash,
    finalIdempotencyKey: input.idempotencyKey,
    proofCode: input.proofCode,
  });
  await adminApi.request<unknown>(
    `/api/admin/v1/draw-candidates/${encodeURIComponent(input.candidate.id)}/reviews`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      ifMatch: `"${input.candidate.version}"`,
      actionToken: action.actionToken,
      body: { decision: input.decision, reason: input.reason },
    },
  );
}

export async function reviewRuleDraft(input: {
  rule: RuleDraft;
  decision: ReviewDecision;
  reason: string;
  proofCode: string;
  idempotencyKey: string;
}): Promise<RuleDraft> {
  const expectedHash = await canonicalDigest([
    "PLAY_RULE_APPROVE",
    input.rule.id,
    input.rule.version,
    input.rule.recordVersion,
    input.decision,
    input.reason,
  ]);
  const action = await authorizeAction({
    purpose: "PLAY_RULE_APPROVE",
    resourceId: input.rule.id,
    expectedHash,
    finalIdempotencyKey: input.idempotencyKey,
    proofCode: input.proofCode,
  });
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/play-rule-versions/${encodeURIComponent(input.rule.id)}/reviews`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      actionToken: action.actionToken,
      body: { decision: input.decision, reason: input.reason },
    },
  );
  return readRuleDraft(response.data);
}

export async function reviewPolicyVersion(input: {
  policy: PolicyView;
  decision: ReviewDecision;
  reason: string;
  proofCode: string;
  idempotencyKey: string;
}): Promise<PolicyView> {
  const expectedHash = await canonicalDigest([
    "POLICY_APPROVE",
    input.policy.id,
    input.policy.version,
    input.policy.recordVersion,
    input.decision,
    input.reason,
  ]);
  const action = await authorizeAction({
    purpose: "POLICY_APPROVE",
    resourceId: input.policy.id,
    expectedHash,
    finalIdempotencyKey: input.idempotencyKey,
    proofCode: input.proofCode,
  });
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/simulation-policy-versions/${encodeURIComponent(input.policy.id)}/reviews`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      actionToken: action.actionToken,
      body: { decision: input.decision, reason: input.reason },
    },
  );
  return readPolicyView(response.data);
}

export async function rebuildOmissions(input: {
  lotteryId: string;
  fromIssueCode: string;
  expectedDrawVersionSetHash: string;
  reason: string;
  idempotencyKey: string;
}): Promise<TaskAccepted> {
  const response = await adminApi.request<unknown>("/api/admin/v1/omission-rebuilds", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: {
      lotteryId: input.lotteryId,
      fromIssueCode: input.fromIssueCode,
      expectedDrawVersionSetHash: input.expectedDrawVersionSetHash,
      reason: input.reason,
    },
  });
  return readTaskAccepted(response.data);
}

export async function listOmissionGaps(lotteryId: string): Promise<OmissionGapPage> {
  const response = await adminApi.request<unknown>("/api/admin/v1/omission-gaps", {
    query: { lotteryId },
  });
  return readOmissionGapPage(response.data);
}

export async function acknowledgeOmissionGap(input: {
  lotteryId: string;
  beforeIssueCode: string;
  afterIssueCode: string;
  reason: string;
}): Promise<void> {
  await adminApi.request<unknown>("/api/admin/v1/omission-gap-acknowledgements", {
    method: "POST",
    body: input,
  });
}

export async function revokeOmissionGapAcknowledgement(acknowledgementId: string): Promise<void> {
  await adminApi.request<unknown>(
    `/api/admin/v1/omission-gap-acknowledgements/${encodeURIComponent(acknowledgementId)}`,
    { method: "DELETE" },
  );
}

export async function getAdminTask(statusUrl: string): Promise<TaskStatusSummary> {
  const response = await adminApi.request<unknown>(statusUrl);
  return readTaskStatus(response.data);
}

export async function uploadEvidence(
  file: File,
  purpose: UploadPurpose,
  keys: Readonly<{ prepare: string; commit: string }>,
): Promise<EvidenceUpload> {
  return storeEvidenceFile(file, purpose);
}

export function newIntentKey(operationId: string): string {
  return createIdempotencyKey(operationId);
}

export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.submissionOutcome === "UNKNOWN") {
      return `提交结果未知（${error.problem.code}），请保留当前幂等意图并查询原任务。`;
    }
    if (error.problem.status === 403) {
      return `当前员工权限或数据范围不足（${error.problem.code}）。`;
    }
    if (error.problem.status === 409) {
      return `数据版本已变化（${error.problem.code}），请重新加载后再操作。`;
    }
    return `${error.problem.title}（${error.problem.code}）`;
  }
  if (error instanceof ApiTransportError) {
    return error.submissionOutcome === "UNKNOWN"
      ? "网络中断，提交结果未知；请保留当前操作并查询原任务。"
      : "无法连接服务，请保留当前筛选条件后重试。";
  }
  if (error instanceof Error && error.message.startsWith("EVIDENCE_UPLOAD_FAILED_")) {
    return "证据文件上传失败，尚未提交业务操作。";
  }
  return "服务返回了当前界面无法识别的结果。";
}

export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.problem.status === 403;
}

export function shanghaiDayStart(value: string): string {
  return `${value}T00:00:00+08:00`;
}

export function shanghaiDayEnd(value: string): string {
  return `${value}T23:59:59.999+08:00`;
}

export async function authorizeAction(input: {
  expectedAmount?: string;
  purpose: "DRAW_CONFIRM" | "PLAY_RULE_APPROVE" | "POLICY_APPROVE" | "BUSINESS_DECISION_APPROVE" | "PLATFORM_BUDGET_APPROVE";
  resourceId: string;
  expectedHash: string;
  finalIdempotencyKey: string;
  proofCode: string;
}) {
  const response = await adminApi.request<unknown>("/api/admin/v1/action-authorizations", {
    method: "POST",
    body: {
      purpose: input.purpose,
      targetType: "EXISTING_RESOURCE",
      resourceId: input.resourceId,
      expectedInputVersionSetHash: input.expectedHash,
      expectedAmount: input.expectedAmount ?? null,
      finalIdempotencyKey: input.finalIdempotencyKey,
      proofCode: input.proofCode,
    },
  });
  return readActionAuthorization(response.data);
}

function policyDecisionIds(code: PolicyCode): readonly string[] {
  switch (code) {
    case "SIMULATION_AWARD": return ["D02"];
    case "REFERRAL_FIXED": return ["D06"];
    case "REFERRAL_AI_SHARE": return ["D07"];
  }
}

async function fileSha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return hex(new Uint8Array(digest));
}

export async function canonicalDigest(fields: readonly string[]): Promise<string> {
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
  return hex(new Uint8Array(digest));
}

function hex(value: Uint8Array): string {
  return [...value].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readUploadTicket(value: unknown): {
  uploadId: string;
  uploadUrl: string;
  method: string;
} {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("UPLOAD_TICKET_MISMATCH");
  }
  const ticket = value as Record<string, unknown>;
  if (
    typeof ticket.uploadId !== "string"
    || typeof ticket.uploadUrl !== "string"
    || typeof ticket.method !== "string"
  ) {
    throw new TypeError("UPLOAD_TICKET_MISMATCH");
  }
  return {
    uploadId: ticket.uploadId,
    uploadUrl: ticket.uploadUrl,
    method: ticket.method,
  };
}
