export type StrategyCode =
  | "BALANCED"
  | "TREND_FOLLOWING"
  | "HOT_COLD_MIX"
  | "ELIMINATION"
  | "ENSEMBLE"
  | "EXPLORATION";

export type RecommendationFeature =
  | "STRUCTURE"
  | "TREND"
  | "HOT_COLD"
  | "OMISSION"
  | "FREQUENCY"
  | "RETENTION"
  | "DIVERSITY"
  | "EXPLORATION"
  | "AGREEMENT";

export type GenerationMode = "PER_ISSUE" | "DAILY" | "MANUAL";
export type StatusToggle = "ENABLED" | "DISABLED";

export interface WeightItem {
  feature: RecommendationFeature;
  basisPoints: number;
}

export interface StrategyCommon {
  shortWindow: number;
  mediumWindow: number;
  longWindow: number;
  maxGroupsPerPlay: number;
  candidateMultiplier: number;
  minRecommendationScore: number;
  maxPointsPerIssue: string;
  explorationRate: string;
  minDiversityRate: string;
  maxRerunsPerIssue: number;
  weights: readonly WeightItem[];
}

export type StrategyConfig =
  | { code: "BALANCED"; common: StrategyCommon }
  | {
    code: "TREND_FOLLOWING";
    common: StrategyCommon;
    maxTrendNumbers: number;
    trendThreshold: number;
  }
  | {
    code: "HOT_COLD_MIX";
    common: StrategyCommon;
    hotBasisPoints: number;
    warmBasisPoints: number;
    normalBasisPoints: number;
    coldBasisPoints: number;
  }
  | {
    code: "ELIMINATION";
    common: StrategyCommon;
    hardEliminationEnabled: false;
    maxEliminationRate: string;
  }
  | {
    code: "ENSEMBLE";
    common: StrategyCommon;
    agreementWeightBasisPoints: number;
  }
  | { code: "EXPLORATION"; common: StrategyCommon };

export interface HistoryPerformance {
  settledGroups: string;
  hitGroups: string;
  hitRate: string | null;
  asOf: string;
}

export interface RobotPublic {
  id: string;
  name: string;
  strategyCode: StrategyCode;
  strategyLabel: string;
  strategyDescription: string;
  lotteryIds: readonly string[];
  performance: HistoryPerformance;
  currentGroups: string;
  recommendationScore: number | null;
  scoreLabel: "推荐评分";
}

export interface RobotAdmin {
  robot: RobotPublic;
  status: StatusToggle;
  strategy: StrategyConfig;
  strategyVersion: string;
  generationMode: GenerationMode;
  generationTime: string | null;
  currentLotteryCount: string;
  currentPlayCount: string;
  currentBetCount: string;
  currentPricePoints: string;
  latestExecutionAt: string | null;
  version: string;
}

export interface StrategyDefinition {
  code: StrategyCode;
  label: string;
  description: string;
  schemaRef: string;
  defaultConfig: StrategyConfig;
}

export interface AreaSelection {
  key: string;
  chosen: readonly number[];
  dan: readonly number[];
  tuo: readonly number[];
}

export interface Selection {
  schemaId: string;
  schemaVersion: string;
  mode: "SINGLE" | "MULTIPLE" | "DANTUO" | "POSITIONAL" | "GROUP";
  areas: readonly AreaSelection[];
}

export interface RecommendationScoreComponent {
  feature: RecommendationFeature;
  score: number;
  weightBasisPoints: number;
}

export interface Recommendation {
  id: string;
  executionId: string;
  robotId: string;
  lotteryId: string;
  playId: string;
  issueCode: string;
  selection: Selection;
  recommendationScore: number;
  betCount: string;
  pricePoints: string;
  strategyVersion: string;
  generationVersion: string;
  algorithmVersion: string;
  ruleVersion: string;
  scoreBreakdown: readonly RecommendationScoreComponent[];
  explanations: readonly string[];
  cutoffAt: string;
  outcome: {
    status: "PENDING" | "HIT" | "MISS";
    drawVersion: string | null;
    verifiedAt: string | null;
  };
  generatedAt: string;
  status: "PREVIEW" | "PUBLISHED" | "SUPERSEDED" | "CLOSED";
}

export interface CursorPage<T> {
  items: readonly T[];
  nextCursor: string | null;
  hasMore: boolean;
  snapshotId: string | null;
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

const strategyCodes = [
  "BALANCED",
  "TREND_FOLLOWING",
  "HOT_COLD_MIX",
  "ELIMINATION",
  "ENSEMBLE",
  "EXPLORATION",
] as const;

const features = [
  "STRUCTURE",
  "TREND",
  "HOT_COLD",
  "OMISSION",
  "FREQUENCY",
  "RETENTION",
  "DIVERSITY",
  "EXPLORATION",
  "AGREEMENT",
] as const;

export function readRobotAdmin(value: unknown): RobotAdmin {
  const root = record(value, "ROBOT_ADMIN_MISMATCH");
  return {
    robot: readRobotPublic(root.robot),
    status: oneOf(root.status, ["ENABLED", "DISABLED"] as const, "ROBOT_STATUS_MISMATCH"),
    strategy: readStrategyConfig(root.strategy),
    strategyVersion: text(root.strategyVersion, "ROBOT_STRATEGY_VERSION_MISMATCH"),
    generationMode: oneOf(
      root.generationMode,
      ["PER_ISSUE", "DAILY", "MANUAL"] as const,
      "ROBOT_GENERATION_MODE_MISMATCH",
    ),
    generationTime: nullableText(root.generationTime, "ROBOT_GENERATION_TIME_MISMATCH"),
    currentLotteryCount: text(root.currentLotteryCount, "ROBOT_LOTTERY_COUNT_MISMATCH"),
    currentPlayCount: text(root.currentPlayCount, "ROBOT_PLAY_COUNT_MISMATCH"),
    currentBetCount: text(root.currentBetCount, "ROBOT_BET_COUNT_MISMATCH"),
    currentPricePoints: text(root.currentPricePoints, "ROBOT_PRICE_MISMATCH"),
    latestExecutionAt: nullableText(root.latestExecutionAt, "ROBOT_EXECUTION_TIME_MISMATCH"),
    version: text(root.version, "ROBOT_VERSION_MISMATCH"),
  };
}

export function readRobotAdminPage(value: unknown): CursorPage<RobotAdmin> {
  return readPage(value, readRobotAdmin, "ROBOT_ADMIN");
}

export function readStrategyDefinitionPage(value: unknown): CursorPage<StrategyDefinition> {
  return readPage(value, (item) => {
    const root = record(item, "STRATEGY_DEFINITION_MISMATCH");
    return {
      code: oneOf(root.code, strategyCodes, "STRATEGY_CODE_MISMATCH"),
      label: text(root.label, "STRATEGY_LABEL_MISMATCH"),
      description: text(root.description, "STRATEGY_DESCRIPTION_MISMATCH"),
      schemaRef: text(root.schemaRef, "STRATEGY_SCHEMA_MISMATCH"),
      defaultConfig: readStrategyConfig(root.defaultConfig),
    };
  }, "STRATEGY_DEFINITION");
}

export function readRecommendationPage(value: unknown): CursorPage<Recommendation> {
  return readPage(value, readRecommendation, "RECOMMENDATION");
}

export function readTaskStatusPage(value: unknown): CursorPage<TaskStatusSummary> {
  return readPage(value, readTaskStatus, "ROBOT_EXECUTION");
}

export function readTaskAccepted(value: unknown): TaskAccepted {
  const root = record(value, "TASK_ACCEPTED_MISMATCH");
  return {
    taskId: text(root.taskId, "TASK_ID_MISMATCH"),
    status: oneOf(
      root.status,
      ["PENDING", "RUNNING", "RETRY_WAIT"] as const,
      "TASK_ACCEPTED_STATUS_MISMATCH",
    ),
    statusUrl: text(root.statusUrl, "TASK_URL_MISMATCH"),
    pollAfterSeconds: integer(root.pollAfterSeconds, "TASK_POLL_MISMATCH"),
  };
}

export function readTaskStatus(value: unknown): TaskStatusSummary {
  const root = record(value, "TASK_STATUS_MISMATCH");
  return {
    id: text(root.id, "TASK_STATUS_ID_MISMATCH"),
    taskType: text(root.taskType, "TASK_TYPE_MISMATCH"),
    status: oneOf(
      root.status,
      ["PENDING", "RUNNING", "RETRY_WAIT", "SUCCEEDED", "FAILED", "CANCELLED"] as const,
      "TASK_STATUS_VALUE_MISMATCH",
    ),
    progress: number(root.progress, "TASK_PROGRESS_MISMATCH"),
    resultUrl: nullableText(root.resultUrl, "TASK_RESULT_URL_MISMATCH"),
    resultCode: nullableText(root.resultCode, "TASK_RESULT_CODE_MISMATCH"),
    failureCode: nullableText(root.failureCode, "TASK_FAILURE_CODE_MISMATCH"),
    updatedAt: text(root.updatedAt, "TASK_UPDATED_AT_MISMATCH"),
  };
}

function readRobotPublic(value: unknown): RobotPublic {
  const root = record(value, "ROBOT_PUBLIC_MISMATCH");
  const performance = record(root.performance, "ROBOT_PERFORMANCE_MISMATCH");
  const scoreLabel = text(root.scoreLabel, "ROBOT_SCORE_LABEL_MISMATCH");
  if (scoreLabel !== "推荐评分") throw new TypeError("ROBOT_SCORE_LABEL_MISMATCH");
  return {
    id: text(root.id, "ROBOT_ID_MISMATCH"),
    name: text(root.name, "ROBOT_NAME_MISMATCH"),
    strategyCode: oneOf(root.strategyCode, strategyCodes, "ROBOT_STRATEGY_MISMATCH"),
    strategyLabel: text(root.strategyLabel, "ROBOT_STRATEGY_LABEL_MISMATCH"),
    strategyDescription: text(root.strategyDescription, "ROBOT_DESCRIPTION_MISMATCH"),
    lotteryIds: stringArray(root.lotteryIds, "ROBOT_LOTTERIES_MISMATCH"),
    performance: {
      settledGroups: text(performance.settledGroups, "ROBOT_SETTLED_MISMATCH"),
      hitGroups: text(performance.hitGroups, "ROBOT_HIT_MISMATCH"),
      hitRate: nullableText(performance.hitRate, "ROBOT_HIT_RATE_MISMATCH"),
      asOf: text(performance.asOf, "ROBOT_PERFORMANCE_TIME_MISMATCH"),
    },
    currentGroups: text(root.currentGroups, "ROBOT_GROUPS_MISMATCH"),
    recommendationScore: nullableNumber(root.recommendationScore, "ROBOT_SCORE_MISMATCH"),
    scoreLabel,
  };
}

function readStrategyConfig(value: unknown): StrategyConfig {
  const root = record(value, "STRATEGY_CONFIG_MISMATCH");
  const code = oneOf(root.code, strategyCodes, "STRATEGY_CODE_MISMATCH");
  const common = readStrategyCommon(root.common);
  switch (code) {
    case "BALANCED":
      return { code, common };
    case "TREND_FOLLOWING":
      return {
        code,
        common,
        maxTrendNumbers: integer(root.maxTrendNumbers, "STRATEGY_TREND_COUNT_MISMATCH"),
        trendThreshold: number(root.trendThreshold, "STRATEGY_TREND_THRESHOLD_MISMATCH"),
      };
    case "HOT_COLD_MIX":
      return {
        code,
        common,
        hotBasisPoints: integer(root.hotBasisPoints, "STRATEGY_HOT_WEIGHT_MISMATCH"),
        warmBasisPoints: integer(root.warmBasisPoints, "STRATEGY_WARM_WEIGHT_MISMATCH"),
        normalBasisPoints: integer(root.normalBasisPoints, "STRATEGY_NORMAL_WEIGHT_MISMATCH"),
        coldBasisPoints: integer(root.coldBasisPoints, "STRATEGY_COLD_WEIGHT_MISMATCH"),
      };
    case "ELIMINATION": {
      const enabled = bool(root.hardEliminationEnabled, "STRATEGY_ELIMINATION_MODE_MISMATCH");
      if (enabled) throw new TypeError("STRATEGY_ELIMINATION_MODE_MISMATCH");
      return {
        code,
        common,
        hardEliminationEnabled: false,
        maxEliminationRate: text(root.maxEliminationRate, "STRATEGY_ELIMINATION_RATE_MISMATCH"),
      };
    }
    case "ENSEMBLE":
      return {
        code,
        common,
        agreementWeightBasisPoints: integer(
          root.agreementWeightBasisPoints,
          "STRATEGY_AGREEMENT_WEIGHT_MISMATCH",
        ),
      };
    case "EXPLORATION":
      return { code, common };
  }
}

function readStrategyCommon(value: unknown): StrategyCommon {
  const root = record(value, "STRATEGY_COMMON_MISMATCH");
  return {
    shortWindow: integer(root.shortWindow, "STRATEGY_SHORT_WINDOW_MISMATCH"),
    mediumWindow: integer(root.mediumWindow, "STRATEGY_MEDIUM_WINDOW_MISMATCH"),
    longWindow: integer(root.longWindow, "STRATEGY_LONG_WINDOW_MISMATCH"),
    maxGroupsPerPlay: integer(root.maxGroupsPerPlay, "STRATEGY_GROUP_LIMIT_MISMATCH"),
    candidateMultiplier: integer(root.candidateMultiplier, "STRATEGY_CANDIDATE_RATE_MISMATCH"),
    minRecommendationScore: number(root.minRecommendationScore, "STRATEGY_MIN_SCORE_MISMATCH"),
    maxPointsPerIssue: text(root.maxPointsPerIssue, "STRATEGY_BUDGET_MISMATCH"),
    explorationRate: text(root.explorationRate, "STRATEGY_EXPLORATION_RATE_MISMATCH"),
    minDiversityRate: text(root.minDiversityRate, "STRATEGY_DIVERSITY_RATE_MISMATCH"),
    maxRerunsPerIssue: integer(root.maxRerunsPerIssue, "STRATEGY_RERUN_LIMIT_MISMATCH"),
    weights: array(root.weights, "STRATEGY_WEIGHTS_MISMATCH").map((item) => {
      const weight = record(item, "STRATEGY_WEIGHT_MISMATCH");
      return {
        feature: oneOf(weight.feature, features, "STRATEGY_FEATURE_MISMATCH"),
        basisPoints: integer(weight.basisPoints, "STRATEGY_WEIGHT_VALUE_MISMATCH"),
      };
    }),
  };
}

function readRecommendation(value: unknown): Recommendation {
  const root = record(value, "RECOMMENDATION_MISMATCH");
  const selection = record(root.selection, "RECOMMENDATION_SELECTION_MISMATCH");
  const outcome = record(root.outcome, "RECOMMENDATION_OUTCOME_MISMATCH");
  return {
    id: text(root.id, "RECOMMENDATION_ID_MISMATCH"),
    executionId: text(root.executionId, "RECOMMENDATION_EXECUTION_MISMATCH"),
    robotId: text(root.robotId, "RECOMMENDATION_ROBOT_MISMATCH"),
    lotteryId: text(root.lotteryId, "RECOMMENDATION_LOTTERY_MISMATCH"),
    playId: text(root.playId, "RECOMMENDATION_PLAY_MISMATCH"),
    issueCode: text(root.issueCode, "RECOMMENDATION_ISSUE_MISMATCH"),
    selection: {
      schemaId: text(selection.schemaId, "RECOMMENDATION_SCHEMA_MISMATCH"),
      schemaVersion: text(selection.schemaVersion, "RECOMMENDATION_SCHEMA_VERSION_MISMATCH"),
      mode: oneOf(
        selection.mode,
        ["SINGLE", "MULTIPLE", "DANTUO", "POSITIONAL", "GROUP"] as const,
        "RECOMMENDATION_MODE_MISMATCH",
      ),
      areas: array(selection.areas, "RECOMMENDATION_AREAS_MISMATCH").map((item) => {
        const area = record(item, "RECOMMENDATION_AREA_MISMATCH");
        return {
          key: text(area.key, "RECOMMENDATION_AREA_KEY_MISMATCH"),
          chosen: optionalNumberArray(area.chosen, "RECOMMENDATION_CHOSEN_MISMATCH"),
          dan: optionalNumberArray(area.dan, "RECOMMENDATION_DAN_MISMATCH"),
          tuo: optionalNumberArray(area.tuo, "RECOMMENDATION_TUO_MISMATCH"),
        };
      }),
    },
    recommendationScore: number(root.recommendationScore, "RECOMMENDATION_SCORE_MISMATCH"),
    betCount: text(root.betCount, "RECOMMENDATION_BETS_MISMATCH"),
    pricePoints: text(root.pricePoints, "RECOMMENDATION_PRICE_MISMATCH"),
    strategyVersion: text(root.strategyVersion, "RECOMMENDATION_STRATEGY_VERSION_MISMATCH"),
    generationVersion: text(root.generationVersion, "RECOMMENDATION_GENERATION_VERSION_MISMATCH"),
    algorithmVersion: text(root.algorithmVersion, "RECOMMENDATION_ALGORITHM_MISMATCH"),
    ruleVersion: text(root.ruleVersion, "RECOMMENDATION_RULE_VERSION_MISMATCH"),
    scoreBreakdown: array(root.scoreBreakdown, "RECOMMENDATION_SCORES_MISMATCH").map((item) => {
      const component = record(item, "RECOMMENDATION_SCORE_COMPONENT_MISMATCH");
      return {
        feature: oneOf(component.feature, features, "RECOMMENDATION_FEATURE_MISMATCH"),
        score: number(component.score, "RECOMMENDATION_FEATURE_SCORE_MISMATCH"),
        weightBasisPoints: integer(component.weightBasisPoints, "RECOMMENDATION_WEIGHT_MISMATCH"),
      };
    }),
    explanations: stringArray(root.explanations, "RECOMMENDATION_EXPLANATIONS_MISMATCH"),
    cutoffAt: text(root.cutoffAt, "RECOMMENDATION_CUTOFF_MISMATCH"),
    outcome: {
      status: oneOf(
        outcome.status,
        ["PENDING", "HIT", "MISS"] as const,
        "RECOMMENDATION_OUTCOME_STATUS_MISMATCH",
      ),
      drawVersion: nullableText(outcome.drawVersion, "RECOMMENDATION_DRAW_VERSION_MISMATCH"),
      verifiedAt: nullableText(outcome.verifiedAt, "RECOMMENDATION_VERIFIED_TIME_MISMATCH"),
    },
    generatedAt: text(root.generatedAt, "RECOMMENDATION_GENERATED_TIME_MISMATCH"),
    status: oneOf(
      root.status,
      ["PREVIEW", "PUBLISHED", "SUPERSEDED", "CLOSED"] as const,
      "RECOMMENDATION_STATUS_MISMATCH",
    ),
  };
}

function readPage<T>(
  value: unknown,
  reader: (item: unknown) => T,
  prefix: string,
): CursorPage<T> {
  const root = record(value, `${prefix}_PAGE_MISMATCH`);
  return {
    items: array(root.items, `${prefix}_ITEMS_MISMATCH`).map(reader),
    nextCursor: nullableText(root.nextCursor, `${prefix}_CURSOR_MISMATCH`),
    hasMore: bool(root.hasMore, `${prefix}_MORE_MISMATCH`),
    snapshotId: nullableText(root.snapshotId, `${prefix}_SNAPSHOT_MISMATCH`),
  };
}

function record(value: unknown, code: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError(code);
  return value as Record<string, unknown>;
}

function array(value: unknown, code: string): unknown[] {
  if (!Array.isArray(value)) throw new TypeError(code);
  return value;
}

function text(value: unknown, code: string): string {
  if (typeof value !== "string") throw new TypeError(code);
  return value;
}

function nullableText(value: unknown, code: string): string | null {
  return value === null ? null : text(value, code);
}

function stringArray(value: unknown, code: string): string[] {
  return array(value, code).map((item) => text(item, code));
}

function optionalNumberArray(value: unknown, code: string): number[] {
  if (value === null || value === undefined) return [];
  return array(value, code).map((item) => integer(item, code));
}

function number(value: unknown, code: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(code);
  return value;
}

function nullableNumber(value: unknown, code: string): number | null {
  return value === null ? null : number(value, code);
}

function integer(value: unknown, code: string): number {
  const parsed = number(value, code);
  if (!Number.isInteger(parsed)) throw new TypeError(code);
  return parsed;
}

function bool(value: unknown, code: string): boolean {
  if (typeof value !== "boolean") throw new TypeError(code);
  return value;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], code: string): T {
  const parsed = text(value, code);
  if (!allowed.includes(parsed as T)) throw new TypeError(code);
  return parsed as T;
}
