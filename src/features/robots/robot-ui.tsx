import {
  formatLotteryNumber,
  masterAvatarPath,
  numberAreaPresentation,
  type LotteryCode,
} from "@piao777/ui-tokens";
import Image from "next/image";
import type { AdminCatalog } from "@/features/operations/operations-models";
import type {
  GenerationMode,
  Recommendation,
  RecommendationFeature,
  RobotAdmin,
  StrategyConfig,
  TaskStatusSummary,
} from "./robot-models";
import styles from "./robots-pages.module.css";

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const featureLabels: Readonly<Record<RecommendationFeature, string>> = {
  STRUCTURE: "结构",
  TREND: "趋势",
  HOT_COLD: "冷热",
  OMISSION: "遗漏",
  FREQUENCY: "频次",
  RETENTION: "保留偏好",
  DIVERSITY: "多样性",
  EXPLORATION: "探索",
  AGREEMENT: "一致性",
};

export function RobotIdentity({ robot }: Readonly<{ robot: RobotAdmin }>) {
  const avatarSrc = masterAvatarPath(robot.robot.id);
  return (
    <div className={styles.robotIdentity}>
      {avatarSrc === null ? (
        <span className={styles.robotMark} aria-hidden="true">AI</span>
      ) : (
        <Image
          alt={`${robot.robot.name}头像`}
          className={styles.robotMark}
          height={44}
          sizes="44px"
          src={avatarSrc}
          unoptimized
          width={44}
        />
      )}
      <div>
        <strong>{robot.robot.name}</strong>
        <small>{shortId(robot.robot.id)} · 策略 v{robot.strategyVersion}</small>
      </div>
    </div>
  );
}

export function StrategySummary({ strategy }: Readonly<{ strategy: StrategyConfig }>) {
  return (
    <dl className={styles.strategyFacts}>
      <div><dt>历史窗口</dt><dd>{strategy.common.shortWindow} / {strategy.common.mediumWindow} / {strategy.common.longWindow} 期</dd></div>
      <div><dt>评分门槛</dt><dd>{formatScore(strategy.common.minRecommendationScore)}</dd></div>
      <div><dt>每玩法组数</dt><dd>最多 {strategy.common.maxGroupsPerPlay} 组</dd></div>
      <div><dt>候选倍率</dt><dd>{strategy.common.candidateMultiplier} 倍</dd></div>
      <div><dt>多样性</dt><dd>{formatRate(strategy.common.minDiversityRate)}</dd></div>
      <div><dt>探索比例</dt><dd>{formatRate(strategy.common.explorationRate)}</dd></div>
      <div><dt>单期预算</dt><dd>{strategy.common.maxPointsPerIssue} 积分</dd></div>
      <div><dt>重跑上限</dt><dd>{strategy.common.maxRerunsPerIssue} 次</dd></div>
    </dl>
  );
}

export function RecommendationCard({
  recommendation,
  catalog,
}: Readonly<{
  recommendation: Recommendation;
  catalog: AdminCatalog;
}>) {
  const lottery = catalog.lotteries.find((item) => item.id === recommendation.lotteryId) ?? null;
  const play = lottery?.plays.find((item) => item.id === recommendation.playId)
    ?? catalog.lotteries.flatMap((item) => item.plays).find((item) => item.id === recommendation.playId)
    ?? null;
  return (
    <article className={styles.recommendationCard}>
      <header>
        <div>
          <div className={styles.badgeRow}>
            <span className={styles.inlineBadge} data-tone={recommendation.status === "PREVIEW" ? "warning" : "info"}>
              {recommendationStatusLabel(recommendation.status)}
            </span>
            <span className={styles.inlineBadge}>{lottery?.name ?? "彩种信息不可用"}</span>
            <span className={styles.inlineBadge}>{play?.name ?? "玩法信息不可用"}</span>
          </div>
          <strong>第 {recommendation.issueCode} 期 · 生成版本 v{recommendation.generationVersion}</strong>
        </div>
        <div className={styles.scoreValue}>
          <span>推荐评分</span>
          <strong>{formatScore(recommendation.recommendationScore)}</strong>
        </div>
      </header>
      <div className={styles.recommendationBody}>
        {lottery === null ? (
          <p className={styles.unavailable}>当前目录无法匹配彩种，仅保留结构化号码键。</p>
        ) : (
          <SelectionNumbers lotteryCode={lottery.code} recommendation={recommendation} />
        )}
        <dl className={styles.recommendationFacts}>
          <div><dt>注数</dt><dd>{recommendation.betCount} 注</dd></div>
          <div><dt>积分价</dt><dd>{recommendation.pricePoints}</dd></div>
          <div><dt>策略版本</dt><dd>v{recommendation.strategyVersion}</dd></div>
          <div><dt>规则版本</dt><dd>v{recommendation.ruleVersion}</dd></div>
          <div><dt>算法版本</dt><dd>{recommendation.algorithmVersion}</dd></div>
          <div><dt>截止时间</dt><dd>{formatDateTime(recommendation.cutoffAt)}</dd></div>
          <div><dt>核验结果</dt><dd>{outcomeLabel(recommendation)}</dd></div>
          <div><dt>生成时间</dt><dd>{formatDateTime(recommendation.generatedAt)}</dd></div>
        </dl>
        <div className={styles.scoreGrid}>
          {recommendation.scoreBreakdown.map((component) => (
            <div key={component.feature}>
              <span>{featureLabels[component.feature]} · {formatBasisPoints(component.weightBasisPoints)}</span>
              <strong>{formatScore(component.score)}</strong>
            </div>
          ))}
        </div>
        <ul className={styles.explanationList}>
          {recommendation.explanations.map((explanation, index) => (
            <li key={`${recommendation.id}-explanation-${index}`}>{explanation}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function SelectionNumbers({
  lotteryCode,
  recommendation,
}: Readonly<{ lotteryCode: LotteryCode; recommendation: Recommendation }>) {
  const areas = [...recommendation.selection.areas].sort((left, right) => (
    numberAreaPresentation(lotteryCode, left.key).order
      - numberAreaPresentation(lotteryCode, right.key).order
  ));
  return (
    <div className={styles.selection}>
      {areas.map((area) => {
        const presentation = numberAreaPresentation(lotteryCode, area.key);
        return (
          <div className={styles.numberArea} key={area.key}>
            <span>{presentation.label}</span>
            {area.dan.length > 0 ? <NumberRun areaKey={area.key} label="胆码" lotteryCode={lotteryCode} tone={presentation.tone} values={area.dan} /> : null}
            {area.tuo.length > 0 ? <NumberRun areaKey={area.key} label="拖码" lotteryCode={lotteryCode} tone={presentation.tone} values={area.tuo} /> : null}
            {area.chosen.length > 0 ? <NumberRun areaKey={area.key} lotteryCode={lotteryCode} tone={presentation.tone} values={area.chosen} /> : null}
          </div>
        );
      })}
    </div>
  );
}

function NumberRun({
  areaKey,
  label,
  lotteryCode,
  tone,
  values,
}: Readonly<{
  areaKey: string;
  label?: string;
  lotteryCode: LotteryCode;
  tone: string;
  values: readonly number[];
}>) {
  return (
    <div className={styles.numberRun}>
      {label === undefined ? null : <small>{label}</small>}
      {values.map((value, index) => (
        <b data-number-tone={tone} key={`${areaKey}-${label ?? "chosen"}-${value}-${index}`}>
          {formatLotteryNumber(lotteryCode, areaKey, value)}
        </b>
      ))}
    </div>
  );
}

export function executionResultCopy(task: TaskStatusSummary): string {
  if (task.status === "FAILED") return `执行失败${task.failureCode === null ? "" : `：${task.failureCode}`}`;
  const labels: Readonly<Record<string, string>> = {
    PUBLISHED: "正式推荐版本已生成",
    PREVIEW_READY: "未发布预览已生成",
    NO_RECOMMENDATIONS: "执行完成，0 个推荐通过全部筛选",
    DATA_INSUFFICIENT: "执行完成，历史样本不足，0 个推荐",
    NO_ELIGIBLE_PLAY: "执行完成，没有规则就绪的可用玩法",
    ISSUE_GENERATION_CLOSED: "执行完成前期次已关闭，0 个推荐",
  };
  return task.resultCode === null ? taskStatusLabel(task.status) : labels[task.resultCode] ?? task.resultCode;
}

export function taskStatusLabel(status: TaskStatusSummary["status"]): string {
  return {
    PENDING: "已受理",
    RUNNING: "运行中",
    RETRY_WAIT: "等待恢复",
    SUCCEEDED: "已完成",
    FAILED: "执行失败",
    CANCELLED: "已取消",
  }[status];
}

export function generationModeLabel(mode: GenerationMode, time: string | null): string {
  if (mode === "PER_ISSUE") return "每期开奖期自动生成";
  if (mode === "DAILY") return `每日 ${time ?? "时间未配置"}`;
  return "仅人工触发";
}

export function formatScore(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)} 分`;
}

export function formatRate(value: string | null): string {
  if (value === null) return "—";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${(parsed * 100).toFixed(1)}%` : "—";
}

export function formatDateTime(value: string | null): string {
  if (value === null) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}

export function formatBasisPoints(value: number): string {
  return `${(value / 100).toFixed(value % 100 === 0 ? 0 : 2)}%`;
}

export function lotteryNames(catalog: AdminCatalog, ids: readonly string[]): readonly string[] {
  return ids.map((id) => catalog.lotteries.find((lottery) => lottery.id === id)?.name ?? "未知彩种");
}

export function executionIdFromResultUrl(resultUrl: string | null): string | null {
  if (resultUrl === null) return null;
  try {
    return new URL(resultUrl, "https://same-origin.invalid").searchParams.get("executionId");
  } catch {
    return null;
  }
}

export function shortId(value: string): string {
  return value.length <= 12 ? value : `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function recommendationStatusLabel(status: Recommendation["status"]): string {
  return {
    PREVIEW: "未发布预览",
    PUBLISHED: "正式发布",
    SUPERSEDED: "已被新版本替代",
    CLOSED: "已关闭",
  }[status];
}

function outcomeLabel(recommendation: Recommendation): string {
  if (recommendation.outcome.status === "PENDING") return "待开奖核验";
  return `${recommendation.outcome.status === "HIT" ? "已核验命中" : "已核验未命中"}${recommendation.outcome.drawVersion === null ? "" : ` · 开奖 v${recommendation.outcome.drawVersion}`}`;
}
