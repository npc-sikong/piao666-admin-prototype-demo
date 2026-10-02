"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionButton,
  Dialog,
  InlineNotice,
  MetricStrip,
  PageHeader,
  Panel,
  StatusBadge,
  Tabs,
} from "@/components/admin-workspace/admin-workspace";
import { PageState } from "@/components/page-state/page-state";
import { useAdminSession } from "@/session/admin-session";
import {
  apiErrorMessage,
  getAdminCatalog,
  getDataHealth,
  getRuleDetail,
  listDataSources,
  listPolicies,
  listRuleDrafts,
} from "./operations-api";
import type {
  AdminCatalog,
  AdminPlay,
  DataHealthPage,
  PolicyViewPage,
  RuleDetail,
  RuleDraftPage,
  SourceHealthPage,
} from "./operations-models";
import styles from "./operations-pages.module.css";

type CatalogTab = "catalog" | "rules" | "policies" | "sources";

interface CatalogSnapshot {
  catalog: AdminCatalog;
  health: DataHealthPage | null;
  sources: SourceHealthPage | null;
  rules: RuleDraftPage | null;
  policies: PolicyViewPage | null;
}

export function CatalogPage() {
  const session = useAdminSession();
  const permissions = session.identity?.permissions ?? [];
  const canData = permissions.includes("lottery:data:view");
  const canRules = permissions.includes("rule:view");
  const canPolicies = permissions.includes("policy:view");
  const [snapshot, setSnapshot] = useState<CatalogSnapshot | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<CatalogTab>("catalog");
  const [lotteryId, setLotteryId] = useState("");
  const [ruleTarget, setRuleTarget] = useState<AdminPlay | null>(null);
  const [ruleDetail, setRuleDetail] = useState<RuleDetail | null>(null);
  const [ruleDetailStatus, setRuleDetailStatus] = useState<"loading" | "ready" | "error">("loading");
  const [ruleDetailError, setRuleDetailError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canData && !canRules && !canPolicies) {
      setStatus("forbidden");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const [catalog, health, sources, rules, policies] = await Promise.all([
        getAdminCatalog(),
        canData ? getDataHealth() : Promise.resolve(null),
        canData ? listDataSources() : Promise.resolve(null),
        canRules ? listRuleDrafts() : Promise.resolve(null),
        canPolicies ? listPolicies() : Promise.resolve(null),
      ]);
      setSnapshot({ catalog, health, sources, rules, policies });
      setLotteryId((current) => current || catalog.lotteries[0]?.id || "");
      setStatus("ready");
    } catch (cause) {
      setError(apiErrorMessage(cause));
      setStatus("error");
    }
  }, [canData, canPolicies, canRules]);

  useEffect(() => {
    if (session.status === "authenticated") {
      void load();
    }
  }, [load, session.status]);

  const selectedLottery = snapshot?.catalog.lotteries.find((item) => item.id === lotteryId)
    ?? snapshot?.catalog.lotteries[0]
    ?? null;
  const healthByLottery = useMemo(() => new Map(
    snapshot?.health?.items.map((item) => [item.lotteryId, item]) ?? [],
  ), [snapshot?.health?.items]);

  async function openRule(play: AdminPlay) {
    setRuleTarget(play);
    setRuleDetail(null);
    setRuleDetailError(null);
    setRuleDetailStatus("loading");
    try {
      const detail = await getRuleDetail(play.id);
      setRuleDetail(detail);
      setRuleDetailStatus("ready");
    } catch (cause) {
      setRuleDetailError(apiErrorMessage(cause));
      setRuleDetailStatus("error");
    }
  }

  return (
    <>
      <PageHeader
        actions={<ActionButton onClick={() => void load()}>刷新目录</ActionButton>}
        description="查看八个首期彩种、玩法版本、来源证据和业务准入状态；此页不提供随意启停玩法的开关。"
        pageId="A02"
        title="彩票目录与规则版本"
      />

      {status === "loading" ? <PageState kind="loading" title="正在读取彩票目录" /> : null}
      {status === "forbidden" ? (
        <PageState description="当前员工没有彩票数据、规则或政策查看权限。" kind="forbidden" />
      ) : null}
      {status === "error" ? (
        <PageState
          action={<ActionButton onClick={() => void load()}>重试</ActionButton>}
          description={error ?? "目录读取失败。"}
          kind="error"
        />
      ) : null}

      {status === "ready" && snapshot !== null ? (
        <>
          {snapshot.catalog.approvalStatus === "D01_PENDING" ? (
            <InlineNotice title="最终玩法目录尚未批准" tone="warning">
              当前仅展示候选目录；依赖 D01 的正式参与能力继续保持“规则未就绪”，不能把候选玩法当作生产准入。
            </InlineNotice>
          ) : null}
          <MetricStrip items={catalogMetrics(snapshot)} />
          <Panel
            description={`目录版本 ${snapshot.catalog.version}；选择彩种后查看其玩法与数据水位。`}
            title="首期彩票范围"
          >
            <div className={styles.selectorStrip}>
              {snapshot.catalog.lotteries.map((lottery) => {
                const health = healthByLottery.get(lottery.id);
                return (
                  <button
                    data-active={selectedLottery?.id === lottery.id || undefined}
                    key={lottery.id}
                    onClick={() => setLotteryId(lottery.id)}
                    type="button"
                  >
                    <strong>{lottery.name}</strong>
                    <small>{lottery.code} · {health?.status ?? "无健康权限"}</small>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel flush title="目录、版本与来源">
            <Tabs<CatalogTab>
              items={[
                { id: "catalog", label: "玩法目录", count: selectedLottery?.plays.length ?? 0 },
                { id: "rules", label: "规则版本", count: snapshot.rules?.items.length },
                { id: "policies", label: "政策版本", count: snapshot.policies?.items.length },
                { id: "sources", label: "数据来源", count: snapshot.sources?.items.length },
              ]}
              label="目录视图"
              onChange={setTab}
              value={tab}
            />
            <div className={styles.tabContent}>
              {tab === "catalog" ? (
                selectedLottery === null ? <PageState kind="empty" /> : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead><tr><th>玩法</th><th>规则版本</th><th>准入状态</th><th>最新确认期</th><th>操作</th></tr></thead>
                      <tbody>
                        {selectedLottery.plays.map((play) => (
                          <tr key={play.id}>
                            <td><span className={styles.entity}><strong>{play.name}</strong><small>{play.code}</small></span></td>
                            <td><code className={styles.mono}>{play.ruleVersion ?? "未生成"}</code></td>
                            <td><StatusBadge label={playReadinessLabel(play.readiness)} status={play.readiness} /></td>
                            <td>{selectedLottery.latestIssueCode ?? "尚无确认期"}</td>
                            <td><button className={styles.textButton} onClick={() => void openRule(play)} type="button">查看规则与证据</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : null}
              {tab === "rules" ? (
                snapshot.rules === null ? (
                  <PageState description="当前员工没有玩法规则版本查看权限。" kind="forbidden" />
                ) : (
                  <>
                    <div className={styles.summaryLine}>
                      <span>规则制品只能通过受控版本和独立复核生效。</span>
                      <Link className={styles.inlineLink} href="/lottery/draws?tab=rules">进入规则复核工作区</Link>
                    </div>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead><tr><th>玩法</th><th>业务版本</th><th>生效期</th><th>状态</th><th>作者</th><th>制品摘要</th></tr></thead>
                        <tbody>
                          {snapshot.rules.items.length === 0 ? <tr><td className={styles.emptyCell} colSpan={6}>暂无规则版本</td></tr> : snapshot.rules.items.map((rule) => (
                            <tr key={rule.id}>
                              <td>{playName(snapshot.catalog, rule.playId)}</td>
                              <td>v{rule.version}</td>
                              <td>{rule.effectiveFromIssue}</td>
                              <td><StatusBadge label={ruleStatusLabel(rule.status)} status={rule.status} /></td>
                              <td><code className={styles.mono}>{rule.authorId}</code></td>
                              <td><code className={styles.hash} title={rule.artifactHash}>{rule.artifactHash}</code></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )
              ) : null}
              {tab === "policies" ? (
                snapshot.policies === null ? (
                  <PageState description="当前员工没有正式政策版本查看权限。" kind="forbidden" />
                ) : (
                  <>
                    <div className={styles.summaryLine}>
                      <span>D02–D07 未正式批准时，政策只能保持未就绪或待复核。</span>
                      <Link className={styles.inlineLink} href="/lottery/draws?tab=policies">进入政策复核工作区</Link>
                    </div>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead><tr><th>政策</th><th>版本</th><th>决策门禁</th><th>状态</th><th>作者</th><th>创建时间</th></tr></thead>
                        <tbody>
                          {snapshot.policies.items.length === 0 ? <tr><td className={styles.emptyCell} colSpan={6}>暂无政策版本</td></tr> : snapshot.policies.items.map((policy) => (
                            <tr key={policy.id}>
                              <td><strong>{policyLabel(policy.code)}</strong></td>
                              <td>v{policy.version}</td>
                              <td>{policy.decisionIds.join(" / ")}</td>
                              <td><StatusBadge label={policyStatusLabel(policy.status)} status={policy.status} /></td>
                              <td><code className={styles.mono}>{policy.authorId}</code></td>
                              <td>{new Date(policy.createdAt).toLocaleString("zh-CN")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )
              ) : null}
              {tab === "sources" ? (
                snapshot.sources === null ? (
                  <PageState description="当前员工没有彩票数据来源查看权限。" kind="forbidden" />
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead><tr><th>来源</th><th>覆盖彩种</th><th>准入状态</th><th>最近成功</th><th>失败码</th></tr></thead>
                      <tbody>
                        {snapshot.sources.items.length === 0 ? <tr><td className={styles.emptyCell} colSpan={5}>暂无已登记数据来源</td></tr> : snapshot.sources.items.map((source) => (
                          <tr key={source.id}>
                            <td><span className={styles.entity}><strong>{source.name}</strong><small>{source.id}</small></span></td>
                            <td>{source.lotteryIds.map((id) => lotteryName(snapshot.catalog, id)).join("、") || "未绑定"}</td>
                            <td><StatusBadge label={sourceStatusLabel(source.status)} status={source.status} /></td>
                            <td>{source.lastSuccessAt === null ? "尚无成功记录" : new Date(source.lastSuccessAt).toLocaleString("zh-CN")}</td>
                            <td>{source.failureCode ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : null}
            </div>
          </Panel>
        </>
      ) : null}

      <Dialog
        description={ruleTarget === null ? undefined : `${ruleTarget.name} · ${ruleTarget.code}`}
        onClose={() => setRuleTarget(null)}
        open={ruleTarget !== null}
        title="玩法规则与来源证据"
        width="wide"
      >
        {ruleDetailStatus === "loading" ? <PageState kind="loading" /> : null}
        {ruleDetailStatus === "error" ? <PageState description={ruleDetailError ?? "规则读取失败。"} kind="error" /> : null}
        {ruleDetailStatus === "ready" && ruleDetail !== null ? (
          <div className={styles.stack}>
            <div className={styles.summaryLine}>
              <StatusBadge label={ruleReadinessLabel(ruleDetail.readiness)} status={ruleDetail.readiness} />
              <span>官方版本 <strong>{ruleDetail.officialRuleVersion}</strong></span>
              <span>模拟版本 <strong>{ruleDetail.simulationRuleVersion ?? "未就绪"}</strong></span>
              <span>基础成本 <strong>{ruleDetail.baseCostPoints} 积分</strong></span>
            </div>
            <pre className={styles.ruleText}>{ruleDetail.ruleText}</pre>
            <div className={styles.evidenceList}>
              {ruleDetail.sourceEvidenceIds.length === 0 ? <span className={styles.muted}>没有可显示的来源证据</span> : ruleDetail.sourceEvidenceIds.map((id) => <code key={id}>{id}</code>)}
            </div>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}

function catalogMetrics(snapshot: CatalogSnapshot) {
  const plays = snapshot.catalog.lotteries.flatMap((lottery) => lottery.plays);
  const ready = plays.filter((play) => play.readiness === "READY").length;
  const sourceIssues = snapshot.sources?.items.filter((source) => source.status !== "APPROVED").length;
  const degraded = snapshot.health?.items.filter((item) => item.status !== "READY").length;
  return [
    { label: "首期彩种", value: String(snapshot.catalog.lotteries.length), detail: "PRD 首期范围" },
    { label: "候选玩法", value: String(plays.length), detail: snapshot.catalog.approvalStatus === "APPROVED" ? "目录已批准" : "D01 尚未批准", tone: snapshot.catalog.approvalStatus === "APPROVED" ? "good" as const : "warning" as const },
    { label: "规则已就绪", value: `${ready} / ${plays.length}`, detail: "规则与来源同时可用", tone: ready === plays.length ? "good" as const : "warning" as const },
    { label: "来源异常", value: sourceIssues === undefined ? "—" : String(sourceIssues), detail: "未批准、失败或冲突", tone: sourceIssues === 0 ? "good" as const : "danger" as const },
    { label: "数据水位异常", value: degraded === undefined ? "—" : String(degraded), detail: "降级或不可用", tone: degraded === 0 ? "good" as const : "warning" as const },
  ];
}

function playName(catalog: AdminCatalog, playId: string): string {
  for (const lottery of catalog.lotteries) {
    const play = lottery.plays.find((item) => item.id === playId);
    if (play !== undefined) {
      return `${lottery.name} · ${play.name}`;
    }
  }
  return playId;
}

function lotteryName(catalog: AdminCatalog, lotteryId: string): string {
  return catalog.lotteries.find((item) => item.id === lotteryId)?.name ?? lotteryId;
}

function playReadinessLabel(value: AdminPlay["readiness"]): string {
  return {
    READY: "可参与",
    CATALOG_UNCONFIRMED: "目录未确认",
    RULE_UNCONFIRMED: "规则未确认",
    DATA_UNAVAILABLE: "数据不可用",
  }[value];
}

function ruleReadinessLabel(value: RuleDetail["readiness"]): string {
  return { READY: "规则已就绪", UNCONFIRMED: "规则未确认", DATA_UNAVAILABLE: "数据不可用" }[value];
}

function ruleStatusLabel(value: string): string {
  return { DRAFT: "草稿", PENDING_REVIEW: "待独立复核", APPROVED: "已批准", REJECTED: "已驳回" }[value] ?? value;
}

function policyStatusLabel(value: string): string {
  return { UNCONFIRMED: "决策未就绪", PENDING_REVIEW: "待独立复核", APPROVED: "已批准", REJECTED: "已驳回", SUPERSEDED: "已被替代" }[value] ?? value;
}

function sourceStatusLabel(value: string): string {
  return { APPROVED: "已批准", UNAPPROVED: "未批准", FAILED: "采集失败", CONFLICT: "来源冲突" }[value] ?? value;
}

function policyLabel(value: string): string {
  return {
    SIMULATION_AWARD: "模拟返奖",
    REFERRAL_FIXED: "固定推广奖励",
    REFERRAL_AI_SHARE: "AI 推荐分红",
  }[value] ?? value;
}
