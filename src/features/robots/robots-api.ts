import {
  ApiError,
  ApiTransportError,
  createIdempotencyKey,
} from "@piao777/api-client";
import { adminApi } from "@/lib/api";
import {
  readRecommendationPage,
  readRobotAdmin,
  readRobotAdminPage,
  readStrategyDefinitionPage,
  readTaskAccepted,
  readTaskStatus,
  readTaskStatusPage,
  type CursorPage,
  type GenerationMode,
  type Recommendation,
  type RobotAdmin,
  type StatusToggle,
  type StrategyConfig,
  type StrategyDefinition,
  type TaskAccepted,
  type TaskStatusSummary,
} from "./robot-models";

export interface RobotWriteInput {
  name: string;
  allowedLotteryIds: readonly string[];
  strategy: StrategyConfig;
  generationMode: GenerationMode;
  generationTime: string | null;
  reason: string;
}

export interface RobotListQuery {
  status?: StatusToggle;
  lotteryId?: string;
  keyword?: string;
  cursor?: string;
  limit?: number;
}

export async function listRobotStrategies(): Promise<CursorPage<StrategyDefinition>> {
  const response = await adminApi.request<unknown>("/api/admin/v1/robot-strategies", {
    query: { limit: 20 },
  });
  return readStrategyDefinitionPage(response.data);
}

export async function listAdminRobots(
  query: RobotListQuery = {},
): Promise<CursorPage<RobotAdmin>> {
  const response = await adminApi.request<unknown>("/api/admin/v1/robot-masters", {
    query: {
      status: query.status,
      lotteryId: query.lotteryId,
      keyword: query.keyword,
      cursor: query.cursor,
      limit: query.limit ?? 20,
    },
  });
  return readRobotAdminPage(response.data);
}

export async function createRobot(
  input: RobotWriteInput,
  idempotencyKey: string,
): Promise<RobotAdmin> {
  const response = await adminApi.request<unknown>("/api/admin/v1/robot-masters", {
    method: "POST",
    idempotencyKey,
    body: input,
  });
  return readRobotAdmin(response.data);
}

export async function getAdminRobot(robotId: string): Promise<RobotAdmin> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/robot-masters/${encodeURIComponent(robotId)}`,
  );
  return readRobotAdmin(response.data);
}

export async function updateRobot(
  robot: RobotAdmin,
  input: RobotWriteInput,
  idempotencyKey: string,
): Promise<RobotAdmin> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/robot-masters/${encodeURIComponent(robot.robot.id)}`,
    {
      method: "PUT",
      idempotencyKey,
      ifMatch: `"${robot.version}"`,
      body: input,
    },
  );
  return readRobotAdmin(response.data);
}

export async function setRobotStatus(input: {
  robot: RobotAdmin;
  status: StatusToggle;
  reason: string;
  idempotencyKey: string;
}): Promise<RobotAdmin> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/robot-masters/${encodeURIComponent(input.robot.robot.id)}/status`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      ifMatch: `"${input.robot.version}"`,
      body: { status: input.status, reason: input.reason },
    },
  );
  return readRobotAdmin(response.data);
}

export async function deleteRobot(
  robot: RobotAdmin,
  idempotencyKey: string,
): Promise<void> {
  await adminApi.request<void>(
    `/api/admin/v1/robot-masters/${encodeURIComponent(robot.robot.id)}`,
    {
      method: "DELETE",
      idempotencyKey,
      ifMatch: `"${robot.version}"`,
    },
  );
}

export async function previewRobot(input: {
  robotId: string;
  lotteryId: string;
  issueCode: string;
  reason: string;
  idempotencyKey: string;
}): Promise<TaskAccepted> {
  return generate("previews", input);
}

export async function generateRobot(input: {
  robotId: string;
  lotteryId: string;
  issueCode: string;
  reason: string;
  idempotencyKey: string;
}): Promise<TaskAccepted> {
  return generate("generations", input);
}

export async function listRobotExecutions(
  robotId: string,
  cursor?: string,
): Promise<CursorPage<TaskStatusSummary>> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/robot-masters/${encodeURIComponent(robotId)}/executions`,
    { query: { cursor, limit: 20 } },
  );
  return readTaskStatusPage(response.data);
}

export async function listAdminRecommendations(
  robotId: string,
  input: { executionId?: string; cursor?: string } = {},
): Promise<CursorPage<Recommendation>> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/robot-masters/${encodeURIComponent(robotId)}/recommendations`,
    {
      query: {
        executionId: input.executionId,
        cursor: input.cursor,
        limit: 50,
      },
    },
  );
  return readRecommendationPage(response.data);
}

export async function getAdminTask(statusUrl: string): Promise<TaskStatusSummary> {
  const response = await adminApi.request<unknown>(statusUrl);
  return readTaskStatus(response.data);
}

export function newRobotIntentKey(operationId: string): string {
  return createIdempotencyKey(operationId);
}

export function robotErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const codeCopy: Readonly<Record<string, string>> = {
      D01_UNCONFIRMED: "D01 最终玩法目录尚未确认，正式推荐生成保持关闭。",
      DRAW_SOURCE_NOT_APPROVED: "当前彩种没有已批准的开奖来源，不能生成正式推荐。",
      ROBOT_HISTORY_NOT_READY: "当前彩种的可信历史投影尚未就绪。",
      NO_ELIGIBLE_PLAY: "当前彩种没有规则就绪且符合策略的玩法。",
      ROBOT_DISABLED: "机器人已停用，不能创建预览或正式生成任务。",
      ISSUE_GENERATION_CLOSED: "目标期次已截止、已开奖或不可再生成。",
      ROBOT_GENERATION_IN_PROGRESS: "同一机器人、彩种和期次已有正式任务运行中。",
      ROBOT_RERUN_LIMIT_REACHED: "当前期次已达到策略规定的重跑次数上限。",
    };
    if (error.submissionOutcome === "UNKNOWN") {
      return `提交结果未知（${error.problem.code}），请保留当前幂等意图并查询原任务。`;
    }
    if (error.problem.status === 412 || error.problem.status === 428) {
      return `当前机器人版本已失效（${error.problem.code}），请重新加载后再操作。`;
    }
    if (error.problem.status === 403) {
      return `当前员工权限或数据范围不足（${error.problem.code}）。`;
    }
    return codeCopy[error.problem.code]
      ?? `${error.problem.title}（${error.problem.code}）`;
  }
  if (error instanceof ApiTransportError) {
    return error.submissionOutcome === "UNKNOWN"
      ? "网络中断，提交结果未知；请保留当前操作并查询原任务。"
      : "无法连接服务，请保留当前筛选条件后重试。";
  }
  return "服务返回了当前界面无法识别的结果。";
}

export function isRobotForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.problem.status === 403;
}

export function isRobotVersionExpired(error: unknown): boolean {
  return error instanceof ApiError && (error.problem.status === 412 || error.problem.status === 428);
}

async function generate(
  kind: "previews" | "generations",
  input: {
    robotId: string;
    lotteryId: string;
    issueCode: string;
    reason: string;
    idempotencyKey: string;
  },
): Promise<TaskAccepted> {
  const response = await adminApi.request<unknown>(
    `/api/admin/v1/robot-masters/${encodeURIComponent(input.robotId)}/${kind}`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: {
        lotteryId: input.lotteryId,
        issueCode: input.issueCode,
        reason: input.reason,
      },
    },
  );
  return readTaskAccepted(response.data);
}
