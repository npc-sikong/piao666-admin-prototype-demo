import { readSettlementExecution, readPool, type SettlementMode } from "./ai-management-models";
import {
  ApiError,
  ApiTransportError,
  createIdempotencyKey,
} from "@piao777/api-client";
import { adminApi } from "@/lib/api";
import {
  readAllocation,
  readAllocationPage,
  readBudgetPage,
  readCommandReceipt,
  readCommandResult,
  readCombinationPreview,
  readDisclosureReceipt,
  readExportStatus,
  readPayoutBatch,
  readPayoutItemPage,
  readPayoutPreparation,
  readPoolAdmin,
  readPoolPage,
  readProject,
  readProjectConfig,
  readProjectPage,
  readReport,
  readSubscriptionPage,
  readTaskAccepted,
  readTaskStatus,
  type AiCombinationPreview,
  type AiProject,
  type AiProjectConfig,
  type AiSettings,
  type Allocation,
  type BudgetAccount,
  type CommandReceipt,
  type CommandResult,
  type DisclosureReceipt,
  type ExportStatus,
  type Page,
  type PayoutBatch,
  type PayoutItem,
  type PayoutPreparation,
  type ProjectStatus,
  type ReportFilter,
  type ReportResult,
  type Subscription,
  type TaskAccepted,
  type TaskStatus,
  type AiPool,
  type AiPoolAdmin,
} from "./ai-management-models";

export interface ProjectQuery {
  lotteryId?: string | undefined;
  status?: ProjectStatus | undefined;
  keyword?: string | undefined;
  cursor?: string | undefined;
}

export interface ErrorView {
  kind: "forbidden" | "not-ready" | "stale" | "unknown-submit" | "error";
  code: string;
  message: string;
}

export async function listProjects(query: ProjectQuery = {}): Promise<Page<AiProject>> {
  const response = await adminApi.request<unknown>("/api/admin/v1/ai-projects", {
    query: {
      lotteryId: query.lotteryId,
      status: query.status,
      keyword: query.keyword,
      cursor: query.cursor,
      limit: 50,
    },
  });
  return readProjectPage(response.data);
}

export async function createProject(input: {
  name: string;
  lotteryId: string;
  playId: string;
  settings: AiSettings;
  reason: string;
  idempotencyKey: string;
}): Promise<AiProjectConfig> {
  const response = await adminApi.request<unknown>("/api/admin/v1/ai-projects", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: {
      name: input.name,
      lotteryId: input.lotteryId,
      playId: input.playId,
      settings: input.settings,
      reason: input.reason,
    },
  });
  return readProjectConfig(response.data);
}

export async function getProject(projectId: string): Promise<AiProject> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/ai-projects/${encodeURIComponent(projectId)}`,
  );
  return readProject(response.data);
}

export async function getProjectConfig(projectId: string): Promise<{
  config: AiProjectConfig;
  etag: string | null;
}> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/ai-projects/${encodeURIComponent(projectId)}/configuration`,
  );
  return { config: readProjectConfig(response.data), etag: response.etag };
}

export async function getCombinationPreview(projectId: string): Promise<AiCombinationPreview> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/ai-projects/${encodeURIComponent(projectId)}/combination-preview`,
  );
  return readCombinationPreview(response.data);
}

export async function saveProjectConfig(input: {
  projectId: string;
  settings: AiSettings;
  reason: string;
  etag: string;
  idempotencyKey: string;
}): Promise<AiProjectConfig> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/ai-projects/${encodeURIComponent(input.projectId)}/configuration`,
    {
      method: "PUT",
      ifMatch: input.etag,
      idempotencyKey: input.idempotencyKey,
      body: { settings: input.settings, reason: input.reason },
    },
  );
  return readProjectConfig(response.data);
}

export async function setProjectStatus(input: {
  project: AiProject;
  status: ProjectStatus;
  reason: string;
  idempotencyKey: string;
}): Promise<AiProject> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/ai-projects/${encodeURIComponent(input.project.id)}/status`,
    {
      method: "POST",
      ifMatch: `"${input.project.version}"`,
      idempotencyKey: input.idempotencyKey,
      body: { status: input.status, reason: input.reason },
    },
  );
  return readProject(response.data);
}

export async function listPools(projectId: string, cursor?: string): Promise<Page<AiPool>> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/ai-projects/${encodeURIComponent(projectId)}/issues`,
    { query: { limit: 50, cursor } },
  );
  return readPoolPage(response.data);
}

export async function getPool(poolIssueId: string): Promise<{
  value: AiPoolAdmin;
  etag: string | null;
}> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/ai-pools/${encodeURIComponent(poolIssueId)}`,
  );
  return { value: readPoolAdmin(response.data), etag: response.etag };
}

export async function closeFunding(input: {
  poolIssueId: string;
  etag: string;
  reason: string;
  idempotencyKey: string;
}): Promise<CommandReceipt> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/ai-pools/${encodeURIComponent(input.poolIssueId)}/funding-closure`,
    {
      method: "POST",
      ifMatch: input.etag,
      idempotencyKey: input.idempotencyKey,
      body: { reason: input.reason },
    },
  );
  return readCommandReceipt(response.data);
}

export async function listSubscriptions(
  poolIssueId: string,
  cursor?: string,
): Promise<Page<Subscription>> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/ai-pools/${encodeURIComponent(poolIssueId)}/subscriptions`,
    { query: { limit: 100, cursor } },
  );
  return readSubscriptionPage(response.data);
}

export async function calculateAllocation(input: {
  pool: AiPoolAdmin;
  targetNetReturnPercent: number;
  reason: string;
  idempotencyKey: string;
}): Promise<TaskAccepted> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/ai-pools/${encodeURIComponent(input.pool.pool.id)}/allocation-jobs`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: {
        targetNetReturnPercent: input.targetNetReturnPercent,
        expectedInputVersionSetHash: input.pool.inputVersionSetHash,
        reason: input.reason,
      },
    },
  );
  return readTaskAccepted(response.data);
}

export async function listAllocations(poolIssueId: string): Promise<Page<Allocation>> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/ai-pools/${encodeURIComponent(poolIssueId)}/allocations`,
    { query: { limit: 100 } },
  );
  return readAllocationPage(response.data);
}

export async function getAllocation(allocationId: string): Promise<{
  value: Allocation;
  etag: string | null;
}> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/allocations/${encodeURIComponent(allocationId)}`,
  );
  return { value: readAllocation(response.data), etag: response.etag };
}

export async function recalculateAllocation(input: {
  allocation: Allocation;
  targetNetReturnPercent: number;
  reason: string;
  etag: string;
  idempotencyKey: string;
}): Promise<Allocation> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/ai-pools/${encodeURIComponent(input.allocation.poolIssueId)}/allocation-previews`,
    {
      method: "POST",
      ifMatch: input.etag,
      idempotencyKey: input.idempotencyKey,
      body: {
        baseAllocationId: input.allocation.id,
        expectedInputVersionSetHash: input.allocation.inputVersionSetHash,
        targetNetReturnPercent: input.targetNetReturnPercent,
        reason: input.reason,
      },
    },
  );
  return readAllocation(response.data);
}

export async function confirmAllocation(input: {
  allocationId: string;
  reason: string;
  etag: string;
  idempotencyKey: string;
}): Promise<Allocation> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/allocations/${encodeURIComponent(input.allocationId)}/confirmations`,
    {
      method: "POST",
      ifMatch: input.etag,
      idempotencyKey: input.idempotencyKey,
      body: { reason: input.reason },
    },
  );
  return readAllocation(response.data);
}

export async function publishDisclosure(input: {
  poolIssueId: string;
  allocation: Allocation;
  reason: string;
  idempotencyKey: string;
}): Promise<DisclosureReceipt> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/ai-pools/${encodeURIComponent(input.poolIssueId)}/disclosures`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: {
        allocationVersion: input.allocation.version,
        expectedInputVersionSetHash: input.allocation.inputVersionSetHash,
        reason: input.reason,
      },
    },
  );
  return readDisclosureReceipt(response.data);
}

export async function preparePayout(input: {
  poolIssueId: string;
  allocationVersion: string;
  disclosureVersion: string;
  expectedInputVersionSetHash: string;
  idempotencyKey: string;
}): Promise<PayoutPreparation> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/ai-pools/${encodeURIComponent(input.poolIssueId)}/payout-preparations`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: {
        allocationVersion: input.allocationVersion,
        disclosureVersion: input.disclosureVersion,
        expectedInputVersionSetHash: input.expectedInputVersionSetHash,
      },
    },
  );
  return readPayoutPreparation(response.data);
}

export async function submitPayout(input: {
  poolIssueId: string;
  preparationId: string;
  confirmText: string;
  idempotencyKey: string;
}): Promise<TaskAccepted> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/ai-pools/${encodeURIComponent(input.poolIssueId)}/payouts`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: { preparationId: input.preparationId, confirmText: input.confirmText },
    },
  );
  return readTaskAccepted(response.data);
}

export async function getPayout(batchId: string): Promise<PayoutBatch> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/payout-batches/${encodeURIComponent(batchId)}`,
  );
  return readPayoutBatch(response.data);
}

export async function listPayoutItems(
  batchId: string,
  cursor?: string,
): Promise<Page<PayoutItem>> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/payout-batches/${encodeURIComponent(batchId)}/items`,
    { query: { limit: 100, cursor } },
  );
  return readPayoutItemPage(response.data);
}

export async function retryPayout(input: {
  batch: PayoutBatch;
  reason: string;
  idempotencyKey: string;
}): Promise<TaskAccepted> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/payout-batches/${encodeURIComponent(input.batch.id)}/retries`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: { reason: input.reason },
    },
  );
  return readTaskAccepted(response.data);
}

export async function listBudgets(): Promise<Page<BudgetAccount>> {
  const response = await adminApi.request<unknown>("/api/admin/v1/budget-accounts", {
    query: { limit: 100 },
  });
  return readBudgetPage(response.data);
}

export async function getTask(taskId: string): Promise<TaskStatus> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/tasks/${encodeURIComponent(taskId)}`,
  );
  return readTaskStatus(response.data);
}

export async function getCommandResult(
  idempotencyKey: string,
  operationId: "preparePayout" | "submitPayout" | "retryPayout",
): Promise<CommandResult> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/command-results/${encodeURIComponent(idempotencyKey)}`,
    { query: { operationId } },
  );
  return readCommandResult(response.data);
}

export async function getAiReport(
  filters: ReportFilter,
  cursor?: string,
  snapshotId?: string,
): Promise<ReportResult> {
  const response = await adminApi.request<unknown>("/api/admin/v1/reports/AI_POOLS", {
    query: {
      from: filters.from,
      to: filters.to,
      asOf: filters.asOf,
      projectId: filters.projectId,
      lotteryId: filters.lotteryId,
      issueCode: filters.issueCode,
      status: filters.status,
      groupBy: filters.groupBy ?? "POOL_ISSUE",
      cursor,
      snapshotId,
      limit: 100,
    },
  });
  return readReport(response.data);
}

export async function createReportExport(input: {
  report: ReportResult;
  format: "CSV" | "XLSX";
  idempotencyKey: string;
}): Promise<TaskAccepted> {
  const response = await adminApi.request<unknown>("/api/admin/v1/report-exports", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: {
      reportType: "AI_POOLS",
      filters: input.report.filters,
      snapshotId: input.report.snapshotId,
      format: input.format,
    },
  });
  return readTaskAccepted(response.data);
}

export async function getReportExport(statusUrl: string): Promise<ExportStatus> {
  const response = await adminApi.request<unknown>(statusUrl);
  return readExportStatus(response.data);
}

export function newIntent(operationId: string): string {
  return createIdempotencyKey(operationId);
}

export function errorView(error: unknown): ErrorView {
  if (error instanceof ApiError) {
    const code = error.problem.code;
    if (error.submissionOutcome === "UNKNOWN") {
      return {
        kind: "unknown-submit",
        code,
        message: `提交结果未知（${code}），请使用原幂等键查询命令或任务。`,
      };
    }
    if (error.problem.status === 403) {
      return { kind: "forbidden", code, message: `当前员工权限或数据范围不足（${code}）。` };
    }
    if (error.problem.status === 412 || code.includes("STALE") || code.includes("VERSION")) {
      return { kind: "stale", code, message: `服务端版本已变化（${code}），请重新加载后再操作。` };
    }
    if (code === "AI_COMBINATION_PREVIEW_NOT_READY") {
      return { kind: "not-ready", code, message: `${error.problem.detail}（${code}）。` };
    }
    if (
      code.includes("NOT_READY")
      || code.includes("UNCONFIRMED")
      || code.includes("POLICY_UNAVAILABLE")
      || code.includes("RULE_UNAVAILABLE")
    ) {
      return { kind: "not-ready", code, message: `正式规则或政策尚未就绪（${code}）。` };
    }
    return { kind: "error", code, message: `${error.problem.title}（${code}）` };
  }
  if (error instanceof ApiTransportError) {
    return error.submissionOutcome === "UNKNOWN"
      ? {
          kind: "unknown-submit",
          code: "NETWORK_RESULT_UNKNOWN",
          message: "网络中断，提交结果未知；请保留原幂等键查询命令或任务。",
        }
      : {
          kind: "error",
          code: "SERVICE_UNAVAILABLE",
          message: "无法连接服务，请保留当前筛选条件后重试。",
        };
  }
  return {
    kind: "error",
    code: error instanceof Error ? error.message : "UNEXPECTED_RESPONSE",
    message: "服务返回了当前界面无法识别的结果。",
  };
}

export async function getSettlementExecution(poolIssueId: string) {
  const response = await adminApi.request<unknown>(`/api/admin/v1/ai-pools/${encodeURIComponent(poolIssueId)}/settlement-execution`);
  return readSettlementExecution(response.data);
}

export async function saveSettlementMode(input: {
  poolIssueId: string; settlementMode: SettlementMode; reason: string; etag: string; idempotencyKey: string;
}) {
  const response = await adminApi.request<unknown>(`/api/admin/v1/ai-pools/${encodeURIComponent(input.poolIssueId)}/settlement-mode`, {
    method: "PUT", ifMatch: input.etag, idempotencyKey: input.idempotencyKey,
    body: { settlementMode: input.settlementMode, reason: input.reason },
  });
  return readPool(response.data);
}

/** 人工发放一键执行：按输入的目标收益率确认本期，由服务端完成确认、公示与发放。 */
export async function settleNow(input: {
  poolIssueId: string; targetNetReturnPercent: number; reason: string; etag: string; idempotencyKey: string;
}) {
  const response = await adminApi.request<unknown>(`/api/admin/v1/ai-pools/${encodeURIComponent(input.poolIssueId)}/quick-settlement`, {
    method: "POST", ifMatch: input.etag, idempotencyKey: input.idempotencyKey,
    body: { targetNetReturnPercent: input.targetNetReturnPercent, reason: input.reason },
  });
  return readSettlementExecution(response.data);
}

export async function retryAutomaticSettlement(input: {
  poolIssueId: string; reason: string; etag: string; idempotencyKey: string;
}) {
  const response = await adminApi.request<unknown>(`/api/admin/v1/ai-pools/${encodeURIComponent(input.poolIssueId)}/automatic-settlement/retry`, {
    method: "POST", ifMatch: input.etag, idempotencyKey: input.idempotencyKey, body: { reason: input.reason },
  });
  return readSettlementExecution(response.data);
}
