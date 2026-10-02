"use client";

import { useMemo, useState } from "react";
import { ActionButton, InlineNotice } from "@/components/admin-workspace/admin-workspace";
import type { AdminCatalog } from "@/features/operations/operations-models";
import type {
  GenerationMode,
  RecommendationFeature,
  RobotAdmin,
  StrategyCode,
  StrategyConfig,
  StrategyDefinition,
} from "./robot-models";
import type { RobotWriteInput } from "./robots-api";
import styles from "./robots-pages.module.css";

interface RobotEditorProps {
  catalog: AdminCatalog;
  definitions: readonly StrategyDefinition[];
  robot?: RobotAdmin | null;
  busy: boolean;
  error: string | null;
  versionExpired?: boolean;
  submitLabel: string;
  onCancel(): void;
  onReload?(): void;
  onSubmit(input: RobotWriteInput): Promise<void>;
}

interface Draft {
  name: string;
  allowedLotteryIds: readonly string[];
  strategyCode: StrategyCode;
  generationMode: GenerationMode;
  generationTime: string;
  reason: string;
  shortWindow: string;
  mediumWindow: string;
  longWindow: string;
  maxGroupsPerPlay: string;
  candidateMultiplier: string;
  minRecommendationScore: string;
  maxPointsPerIssue: string;
  explorationRate: string;
  minDiversityRate: string;
  maxRerunsPerIssue: string;
  weights: Readonly<Record<RecommendationFeature, string>>;
  maxTrendNumbers: string;
  trendThreshold: string;
  hotBasisPoints: string;
  warmBasisPoints: string;
  normalBasisPoints: string;
  coldBasisPoints: string;
  maxEliminationRate: string;
  agreementWeightBasisPoints: string;
}

type NumberDraftField =
  | "shortWindow"
  | "mediumWindow"
  | "longWindow"
  | "maxGroupsPerPlay"
  | "candidateMultiplier"
  | "minRecommendationScore"
  | "maxRerunsPerIssue"
  | "maxTrendNumbers"
  | "trendThreshold"
  | "hotBasisPoints"
  | "warmBasisPoints"
  | "normalBasisPoints"
  | "coldBasisPoints"
  | "agreementWeightBasisPoints";

const featureLabels: Readonly<Record<RecommendationFeature, string>> = {
  STRUCTURE: "结构",
  TREND: "趋势",
  HOT_COLD: "冷热",
  OMISSION: "遗漏",
  FREQUENCY: "频次",
  RETENTION: "保留偏好",
  DIVERSITY: "多样性",
  EXPLORATION: "探索",
  AGREEMENT: "模型一致性",
};

const allFeatures = Object.keys(featureLabels) as RecommendationFeature[];

export function RobotEditor({
  catalog,
  definitions,
  robot = null,
  busy,
  error,
  versionExpired = false,
  submitLabel,
  onCancel,
  onReload,
  onSubmit,
}: RobotEditorProps) {
  const [draft, setDraft] = useState<Draft>(() => createDraft(
    robot,
    definitions[0]?.defaultConfig ?? null,
  ));
  const [validationError, setValidationError] = useState<string | null>(null);
  const definition = definitions.find((item) => item.code === draft.strategyCode) ?? null;
  const features = useMemo(() => (
    allFeatures.filter((feature) => draft.weights[feature] !== "")
  ), [draft.weights]);

  function change<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function changeStrategy(code: StrategyCode) {
    const defaultConfig = definitions.find((item) => item.code === code)?.defaultConfig;
    if (defaultConfig === undefined) return;
    setDraft((current) => ({
      ...current,
      ...strategyDraft(defaultConfig),
    }));
  }

  function toggleLottery(lotteryId: string) {
    setDraft((current) => ({
      ...current,
      allowedLotteryIds: current.allowedLotteryIds.includes(lotteryId)
        ? current.allowedLotteryIds.filter((id) => id !== lotteryId)
        : [...current.allowedLotteryIds, lotteryId],
    }));
  }

  async function submit() {
    const parsed = parseDraft(draft);
    if (typeof parsed === "string") {
      setValidationError(parsed);
      return;
    }
    setValidationError(null);
    await onSubmit(parsed);
  }

  return (
    <div className={styles.editorStack}>
      <InlineNotice title="系统自动生成号码">
        这里只配置机器人资料、策略和边界；界面不接受手工号码或任意 JSON。保存策略不会改写已经发布的推荐版本。
      </InlineNotice>

      {catalog.approvalStatus === "D01_PENDING" ? (
        <InlineNotice title="D01 玩法目录尚未确认" tone="warning">
          可以保存机器人和预览策略；正式推荐仍由服务端准入门控，不能把候选玩法当成已发布规则。
        </InlineNotice>
      ) : null}

      <section className={styles.formSection}>
        <header><strong>机器人资料</strong><span>名称、运行方式与允许彩种</span></header>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>大师名称</span>
            <input
              maxLength={60}
              onChange={(event) => change("name", event.target.value)}
              placeholder="输入运营展示名称"
              value={draft.name}
            />
          </label>
          <label className={styles.field}>
            <span>执行模式</span>
            <select
              onChange={(event) => change("generationMode", event.target.value as GenerationMode)}
              value={draft.generationMode}
            >
              <option value="PER_ISSUE">每期开奖期自动生成</option>
              <option value="DAILY">每日定时生成</option>
              <option value="MANUAL">仅人工触发</option>
            </select>
          </label>
          {draft.generationMode === "DAILY" ? (
            <label className={styles.field}>
              <span>每日生成时间（Asia/Shanghai）</span>
              <input
                onChange={(event) => change("generationTime", event.target.value)}
                type="time"
                value={draft.generationTime}
              />
            </label>
          ) : null}
          <label className={`${styles.field} ${styles.span2}`}>
            <span>变更原因</span>
            <textarea
              maxLength={500}
              onChange={(event) => change("reason", event.target.value)}
              placeholder="说明创建或本次策略调整的原因"
              value={draft.reason}
            />
          </label>
        </div>
        <fieldset className={styles.checkboxFieldset}>
          <legend>允许机器人选择的彩种</legend>
          <div className={styles.checkboxGrid}>
            {catalog.lotteries.map((lottery) => (
              <label key={lottery.id}>
                <input
                  checked={draft.allowedLotteryIds.includes(lottery.id)}
                  onChange={() => toggleLottery(lottery.id)}
                  type="checkbox"
                />
                <span><strong>{lottery.name}</strong><small>{readyPlaySummary(lottery.plays)}</small></span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className={styles.formSection}>
        <header><strong>主策略与通用边界</strong><span>全部字段映射类型化 StrategyConfig</span></header>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>机器人主策略</span>
            <select
              onChange={(event) => changeStrategy(event.target.value as StrategyCode)}
              value={draft.strategyCode}
            >
              {definitions.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
            </select>
            <small>{definition?.description ?? "策略目录没有返回当前策略说明。"}</small>
          </label>
          <NumberField draft={draft} field="maxGroupsPerPlay" label="每玩法最大组数" min="1" max="100" onChange={change} />
          <NumberField draft={draft} field="shortWindow" label="短窗口期数" min="1" max="1000" onChange={change} />
          <NumberField draft={draft} field="mediumWindow" label="中窗口期数" min="1" max="1000" onChange={change} />
          <NumberField draft={draft} field="longWindow" label="长窗口期数" min="1" max="10000" onChange={change} />
          <NumberField draft={draft} field="candidateMultiplier" label="候选倍率" min="1" max="200" onChange={change} />
          <NumberField draft={draft} field="minRecommendationScore" label="最低推荐评分（0—100）" min="0" max="100" step="0.1" onChange={change} />
          <label className={styles.field}>
            <span>每期最大预算（积分）</span>
            <input
              inputMode="decimal"
              onChange={(event) => change("maxPointsPerIssue", event.target.value)}
              placeholder="两位小数，如 100.00"
              value={draft.maxPointsPerIssue}
            />
          </label>
          <label className={styles.field}>
            <span>探索比例（0—{draft.strategyCode === "EXPLORATION" ? "0.50" : "1"}）</span>
            <input inputMode="decimal" onChange={(event) => change("explorationRate", event.target.value)} placeholder="如 0.20" value={draft.explorationRate} />
          </label>
          <label className={styles.field}>
            <span>最低多样性（0—1）</span>
            <input inputMode="decimal" onChange={(event) => change("minDiversityRate", event.target.value)} placeholder="如 0.60" value={draft.minDiversityRate} />
          </label>
          <NumberField draft={draft} field="maxRerunsPerIssue" label="每期允许重跑次数" min="0" max="20" onChange={change} />
        </div>
      </section>

      <section className={styles.formSection}>
        <header><strong>评分权重</strong><span>当前策略支持的特征权重合计必须为 10000</span></header>
        <div className={styles.weightGrid}>
          {features.map((feature) => (
            <label className={styles.field} key={feature}>
              <span>{featureLabels[feature]}（基点）</span>
              <input
                max={10000}
                min={0}
                onChange={(event) => change("weights", { ...draft.weights, [feature]: event.target.value })}
                step={1}
                type="number"
                value={draft.weights[feature]}
              />
            </label>
          ))}
        </div>
      </section>

      <AdvancedFields draft={draft} onChange={change} />

      {versionExpired ? (
        <InlineNotice title="策略版本已失效" tone="danger">
          服务端已拒绝覆盖更新。请重新加载机器人详情，比较最新策略后再提交。
        </InlineNotice>
      ) : null}
      {validationError === null && error === null ? null : (
        <p className={styles.feedback} role="alert">{validationError ?? error}</p>
      )}
      <div className={styles.editorActions}>
        {versionExpired && onReload !== undefined ? (
          <ActionButton disabled={busy} onClick={onReload}>重新加载</ActionButton>
        ) : null}
        <ActionButton disabled={busy} onClick={onCancel}>取消</ActionButton>
        <ActionButton disabled={busy || versionExpired} onClick={() => void submit()} variant="primary">
          {busy ? "提交中" : submitLabel}
        </ActionButton>
      </div>
    </div>
  );
}

function NumberField({
  draft,
  field,
  label,
  min,
  max,
  step = "1",
  onChange,
}: Readonly<{
  draft: Draft;
  field: NumberDraftField;
  label: string;
  min: string;
  max: string;
  step?: string;
  onChange(key: NumberDraftField, value: string): void;
}>) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        max={max}
        min={min}
        onChange={(event) => onChange(field, event.target.value)}
        step={step}
        type="number"
        value={String(draft[field])}
      />
    </label>
  );
}

function AdvancedFields({
  draft,
  onChange,
}: Readonly<{
  draft: Draft;
  onChange<K extends keyof Draft>(key: K, value: Draft[K]): void;
}>) {
  if (draft.strategyCode === "BALANCED" || draft.strategyCode === "EXPLORATION") return null;
  return (
    <section className={styles.formSection}>
      <header><strong>策略专属参数</strong><span>只显示当前策略契约允许的字段</span></header>
      <div className={styles.formGrid}>
        {draft.strategyCode === "TREND_FOLLOWING" ? (
          <>
            <NumberField draft={draft} field="maxTrendNumbers" label="趋势号最大数量" min="1" max="80" onChange={onChange} />
            <NumberField draft={draft} field="trendThreshold" label="趋势阈值（0—100）" min="0" max="100" step="0.1" onChange={onChange} />
          </>
        ) : null}
        {draft.strategyCode === "HOT_COLD_MIX" ? (
          <>
            <NumberField draft={draft} field="hotBasisPoints" label="热号占比（基点）" min="0" max="10000" onChange={onChange} />
            <NumberField draft={draft} field="warmBasisPoints" label="温号占比（基点）" min="0" max="10000" onChange={onChange} />
            <NumberField draft={draft} field="normalBasisPoints" label="普通号占比（基点）" min="0" max="10000" onChange={onChange} />
            <NumberField draft={draft} field="coldBasisPoints" label="冷号占比（基点）" min="0" max="10000" onChange={onChange} />
          </>
        ) : null}
        {draft.strategyCode === "ELIMINATION" ? (
          <>
            <label className={styles.field}>
              <span>硬排除</span>
              <input readOnly value="关闭（契约固定）" />
              <small>降权过滤保留合法号码非零机会。</small>
            </label>
            <label className={styles.field}>
              <span>最大降权比例（0—1）</span>
              <input inputMode="decimal" onChange={(event) => onChange("maxEliminationRate", event.target.value)} value={draft.maxEliminationRate} />
            </label>
          </>
        ) : null}
        {draft.strategyCode === "ENSEMBLE" ? (
          <NumberField draft={draft} field="agreementWeightBasisPoints" label="一致性系数（基点）" min="0" max="10000" onChange={onChange} />
        ) : null}
      </div>
    </section>
  );
}

function createDraft(robot: RobotAdmin | null, defaultConfig: StrategyConfig | null): Draft {
  if (robot === null) {
    if (defaultConfig !== null) {
      return {
        name: "",
        allowedLotteryIds: [],
        generationMode: "PER_ISSUE",
        generationTime: "",
        reason: "",
        ...strategyDraft(defaultConfig),
      };
    }
    return {
      name: "",
      allowedLotteryIds: [],
      strategyCode: "BALANCED",
      generationMode: "PER_ISSUE",
      generationTime: "",
      reason: "",
      shortWindow: "",
      mediumWindow: "",
      longWindow: "",
      maxGroupsPerPlay: "",
      candidateMultiplier: "",
      minRecommendationScore: "",
      maxPointsPerIssue: "",
      explorationRate: "",
      minDiversityRate: "",
      maxRerunsPerIssue: "",
      weights: emptyWeightDraft(),
      maxTrendNumbers: "",
      trendThreshold: "",
      hotBasisPoints: "",
      warmBasisPoints: "",
      normalBasisPoints: "",
      coldBasisPoints: "",
      maxEliminationRate: "",
      agreementWeightBasisPoints: "",
    };
  }
  return {
    name: robot.robot.name,
    allowedLotteryIds: robot.robot.lotteryIds,
    generationMode: robot.generationMode,
    generationTime: robot.generationTime ?? "",
    reason: "",
    ...strategyDraft(robot.strategy),
  };
}

function strategyDraft(strategy: StrategyConfig): Pick<
  Draft,
  | "strategyCode"
  | "shortWindow"
  | "mediumWindow"
  | "longWindow"
  | "maxGroupsPerPlay"
  | "candidateMultiplier"
  | "minRecommendationScore"
  | "maxPointsPerIssue"
  | "explorationRate"
  | "minDiversityRate"
  | "maxRerunsPerIssue"
  | "weights"
  | "maxTrendNumbers"
  | "trendThreshold"
  | "hotBasisPoints"
  | "warmBasisPoints"
  | "normalBasisPoints"
  | "coldBasisPoints"
  | "maxEliminationRate"
  | "agreementWeightBasisPoints"
> {
  const common = strategy.common;
  const weights = Object.fromEntries(allFeatures.map((feature) => [
    feature,
    String(common.weights.find((item) => item.feature === feature)?.basisPoints ?? ""),
  ])) as Record<RecommendationFeature, string>;
  return {
    strategyCode: strategy.code,
    shortWindow: String(common.shortWindow),
    mediumWindow: String(common.mediumWindow),
    longWindow: String(common.longWindow),
    maxGroupsPerPlay: String(common.maxGroupsPerPlay),
    candidateMultiplier: String(common.candidateMultiplier),
    minRecommendationScore: String(common.minRecommendationScore),
    maxPointsPerIssue: common.maxPointsPerIssue,
    explorationRate: common.explorationRate,
    minDiversityRate: common.minDiversityRate,
    maxRerunsPerIssue: String(common.maxRerunsPerIssue),
    weights,
    maxTrendNumbers: strategy.code === "TREND_FOLLOWING" ? String(strategy.maxTrendNumbers) : "",
    trendThreshold: strategy.code === "TREND_FOLLOWING" ? String(strategy.trendThreshold) : "",
    hotBasisPoints: strategy.code === "HOT_COLD_MIX" ? String(strategy.hotBasisPoints) : "",
    warmBasisPoints: strategy.code === "HOT_COLD_MIX" ? String(strategy.warmBasisPoints) : "",
    normalBasisPoints: strategy.code === "HOT_COLD_MIX" ? String(strategy.normalBasisPoints) : "",
    coldBasisPoints: strategy.code === "HOT_COLD_MIX" ? String(strategy.coldBasisPoints) : "",
    maxEliminationRate: strategy.code === "ELIMINATION" ? strategy.maxEliminationRate : "",
    agreementWeightBasisPoints: strategy.code === "ENSEMBLE"
      ? String(strategy.agreementWeightBasisPoints)
      : "",
  };
}

function emptyWeightDraft(): Readonly<Record<RecommendationFeature, string>> {
  return Object.fromEntries(allFeatures.map((feature) => [
    feature,
    "",
  ])) as Record<RecommendationFeature, string>;
}

function parseDraft(draft: Draft): RobotWriteInput | string {
  if (draft.name.trim().length === 0) return "请输入大师名称。";
  if (draft.allowedLotteryIds.length === 0) return "至少选择一个允许彩种。";
  if (draft.reason.trim().length < 2) return "变更原因至少填写 2 个字符。";
  if (draft.generationMode === "DAILY" && !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(draft.generationTime)) {
    return "每日执行模式必须填写有效生成时间。";
  }
  const shortWindow = rangedInteger(draft.shortWindow, 1, 1000);
  const mediumWindow = rangedInteger(draft.mediumWindow, 1, 1000);
  const longWindow = rangedInteger(draft.longWindow, 1, 10000);
  if (shortWindow === null || mediumWindow === null || longWindow === null) return "请完整填写合法的短、中、长历史窗口。";
  if (!(shortWindow < mediumWindow && mediumWindow < longWindow)) return "历史窗口必须满足短窗口 < 中窗口 < 长窗口。";
  const maxGroupsPerPlay = rangedInteger(draft.maxGroupsPerPlay, 1, 100);
  const candidateMultiplier = rangedInteger(draft.candidateMultiplier, 1, 200);
  const maxRerunsPerIssue = rangedInteger(draft.maxRerunsPerIssue, 0, 20);
  const minRecommendationScore = rangedNumber(draft.minRecommendationScore, 0, 100);
  if (maxGroupsPerPlay === null || candidateMultiplier === null || maxRerunsPerIssue === null || minRecommendationScore === null) {
    return "组数、候选倍率、最低评分或重跑上限超出契约范围。";
  }
  if (!/^(0|[1-9][0-9]{0,15})\.[0-9]{2}$/.test(draft.maxPointsPerIssue)) return "每期最大预算必须是两位小数积分。";
  const maximumExplorationRate = draft.strategyCode === "EXPLORATION" ? 0.5 : 1;
  if (!validRate(draft.explorationRate, maximumExplorationRate)) {
    return `探索比例必须在 0—${maximumExplorationRate === 0.5 ? "0.50" : "1"} 之间。`;
  }
  if (!validRate(draft.minDiversityRate, 1)) return "最低多样性必须在 0—1 之间。";

  const supportedFeatures = allFeatures.filter((feature) => draft.weights[feature] !== "");
  const parsedWeights: { feature: RecommendationFeature; basisPoints: number }[] = [];
  for (const feature of supportedFeatures) {
    const basisPoints = rangedInteger(draft.weights[feature], 0, 10000);
    if (basisPoints === null) return "评分权重必须是 0—10000 的整数。";
    parsedWeights.push({ feature, basisPoints });
  }
  if (parsedWeights.reduce((sum, item) => sum + item.basisPoints, 0) !== 10000) return "评分权重合计必须为 10000 基点。";

  const common = {
    shortWindow,
    mediumWindow,
    longWindow,
    maxGroupsPerPlay,
    candidateMultiplier,
    minRecommendationScore,
    maxPointsPerIssue: draft.maxPointsPerIssue,
    explorationRate: draft.explorationRate,
    minDiversityRate: draft.minDiversityRate,
    maxRerunsPerIssue,
    weights: parsedWeights,
  };
  const strategy = parseAdvanced(draft, common);
  if (typeof strategy === "string") return strategy;
  return {
    name: draft.name.trim(),
    allowedLotteryIds: draft.allowedLotteryIds,
    strategy,
    generationMode: draft.generationMode,
    generationTime: draft.generationMode === "DAILY" ? draft.generationTime : null,
    reason: draft.reason.trim(),
  };
}

function parseAdvanced(
  draft: Draft,
  common: StrategyConfig["common"],
): StrategyConfig | string {
  switch (draft.strategyCode) {
    case "BALANCED": return { code: "BALANCED", common };
    case "EXPLORATION": return { code: "EXPLORATION", common };
    case "TREND_FOLLOWING": {
      const maxTrendNumbers = rangedInteger(draft.maxTrendNumbers, 1, 80);
      const trendThreshold = rangedNumber(draft.trendThreshold, 0, 100);
      return maxTrendNumbers === null || trendThreshold === null
        ? "趋势号数量或趋势阈值超出契约范围。"
        : { code: "TREND_FOLLOWING", common, maxTrendNumbers, trendThreshold };
    }
    case "HOT_COLD_MIX": {
      const hotBasisPoints = rangedInteger(draft.hotBasisPoints, 0, 10000);
      const warmBasisPoints = rangedInteger(draft.warmBasisPoints, 0, 10000);
      const normalBasisPoints = rangedInteger(draft.normalBasisPoints, 0, 10000);
      const coldBasisPoints = rangedInteger(draft.coldBasisPoints, 0, 10000);
      if (hotBasisPoints === null || warmBasisPoints === null || normalBasisPoints === null || coldBasisPoints === null) {
        return "冷热四池占比必须是 0—10000 的整数。";
      }
      if (hotBasisPoints + warmBasisPoints + normalBasisPoints + coldBasisPoints !== 10000) return "冷热四池占比合计必须为 10000 基点。";
      return { code: "HOT_COLD_MIX", common, hotBasisPoints, warmBasisPoints, normalBasisPoints, coldBasisPoints };
    }
    case "ELIMINATION":
      return validRate(draft.maxEliminationRate, 1)
        ? { code: "ELIMINATION", common, hardEliminationEnabled: false, maxEliminationRate: draft.maxEliminationRate }
        : "最大降权比例必须在 0—1 之间。";
    case "ENSEMBLE": {
      const agreementWeightBasisPoints = rangedInteger(draft.agreementWeightBasisPoints, 0, 10000);
      return agreementWeightBasisPoints === null
        ? "一致性系数必须是 0—10000 的整数。"
        : { code: "ENSEMBLE", common, agreementWeightBasisPoints };
    }
  }
}

function rangedInteger(value: string, minimum: number, maximum: number): number | null {
  if (!/^-?[0-9]+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function rangedNumber(value: string, minimum: number, maximum: number): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function validRate(value: string, maximum: number): boolean {
  return /^(0(\.[0-9]{1,8})?|1(\.0{1,8})?)$/.test(value)
    && Number(value) <= maximum;
}

function readyPlaySummary(plays: AdminCatalog["lotteries"][number]["plays"]): string {
  const ready = plays.filter((play) => play.readiness === "READY").length;
  return `${ready}/${plays.length} 个玩法规则就绪`;
}
