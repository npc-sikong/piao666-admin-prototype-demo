"use client";
import { ChangeNotesButton } from "@/features/change-notes/change-notes";

import Link from "next/link";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import {
  ActionButton,
  Dialog,
  InlineNotice,
  MetricStrip,
  PageHeader,
  Panel,
} from "@/components/admin-workspace/admin-workspace";
import { PageState } from "@/components/page-state/page-state";
import { getAdminCatalog } from "@/features/operations/operations-api";
import type { AdminCatalog } from "@/features/operations/operations-models";
import { useAdminSession } from "@/session/admin-session";
import {
  createProject,
  errorView,
  getCombinationPreview,
  getPool,
  getProject,
  getProjectConfig,
  listPools,
  listProjects,
  newIntent,
  saveProjectConfig,
  setProjectStatus,
  type ErrorView as ErrorViewModel,
  type ProjectQuery,
} from "./ai-management-api";
import type {
  AiCombinationPreview,
  AiPool,
  AiPoolAdmin,
  AiProject,
  AiProjectConfig,
  AiSettings,
  ProjectStatus,
} from "./ai-management-models";
import {
  Definition,
  DefinitionList,
  ErrorState,
  PoolStatusBadge,
  ProjectStatusBadge,
  formatAiPoints,
  formatBps,
  formatDateTime,
  shortHash,
} from "./ai-management-ui";
import styles from "./ai-management.module.css";
import { AiIssueReportsPanel } from "./ai-issue-reports-panel";
import { AiBudgetDialog } from "./ai-budget-dialog";

interface ProjectRow {
  project: AiProject;
  config: AiProjectConfig;
  configEtag: string | null;
  latestPool: AiPool | null;
}

interface Filters {
  keyword: string;
  lotteryId: string;
  status: "" | ProjectStatus;
}

interface SettingsForm {
  effectiveDate: string;
  cutoffOffsetMinutes: string;
  endDate: string;
  initialOfficialPoints: string;
  userIncrementRatioBps: string;
  defaultTargetNetReturnPercent: string;
  settlementMode: "MANUAL" | "AUTO";
  maxOfficialContributionPoints: string;
  rewardBudgetLimitPoints: string;
  reason: string;
}

interface CreateForm extends SettingsForm {
  name: string;
  lotteryId: string;
  playId: string;
}

type NumberView =
  | { kind: "fixed"; projectName: string; value: AiPoolAdmin }
  | { kind: "preview"; projectName: string; value: AiCombinationPreview };

const emptyFilters: Filters = { keyword: "", lotteryId: "", status: "" };
const emptySettings: SettingsForm = {
  effectiveDate: "",
  cutoffOffsetMinutes: "",
  endDate: "",
  initialOfficialPoints: "20000.00",
  userIncrementRatioBps: "500",
  defaultTargetNetReturnPercent: "5",
  settlementMode: "MANUAL",
  maxOfficialContributionPoints: "20000.00",
  rewardBudgetLimitPoints: "20000.00",
  reason: "",
};

export function AiProjectsPage() {
  const session = useAdminSession();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const permissions = session.identity?.permissions ?? [];
  const canView = permissions.includes("ai-project:view");
  const canViewPools = permissions.includes("ai-pool:view");
  const canCreate = permissions.includes("ai-project:create");
  const canConfigure = permissions.includes("ai-project:configure");
  const canSetStatus = permissions.includes("ai-project:status");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [catalog, setCatalog] = useState<AdminCatalog | null>(null);
  const [rows, setRows] = useState<readonly ProjectRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const [error, setError] = useState<ErrorViewModel | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({ ...emptySettings, name: "", lotteryId: "", playId: "" });
  const [createIntent, setCreateIntent] = useState<string | null>(null);
  const [createPending, setCreatePending] = useState(false);
  const [detail, setDetail] = useState<{ project: AiProject; pools: readonly AiPool[] } | null>(null);
  const [detailPending, setDetailPending] = useState(false);
  const [settingsTarget, setSettingsTarget] = useState<ProjectRow | null>(null);
  const [settingsForm, setSettingsForm] = useState<SettingsForm>(emptySettings);
  const [settingsIntent, setSettingsIntent] = useState<string | null>(null);
  const [settingsPending, setSettingsPending] = useState(false);
  const [statusTarget, setStatusTarget] = useState<{ project: AiProject; next: ProjectStatus } | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [statusIntent, setStatusIntent] = useState<string | null>(null);
  const [statusPending, setStatusPending] = useState(false);
  const [numberView, setNumberView] = useState<NumberView | null>(null);
  const [numberPendingId, setNumberPendingId] = useState<string | null>(null);

  const load = useCallback(async (current: Filters, cursor?: string) => {
    if (!canView) {
      setStatus("forbidden");
      return;
    }
    if (cursor === undefined) setStatus("loading");
    else setLoadingMore(true);
    setError(null);
    try {
      const query: ProjectQuery = {
        keyword: current.keyword.trim() || undefined,
        lotteryId: current.lotteryId || undefined,
        status: current.status || undefined,
        cursor,
      };
      const [catalogValue, projects] = await Promise.all([
        getAdminCatalog(),
        listProjects(query),
      ]);
      const enriched = await Promise.all(projects.items.map(async (project) => {
        const [configuration, poolPage] = await Promise.all([
          getProjectConfig(project.id),
          canViewPools ? listPools(project.id) : Promise.resolve(null),
        ]);
        const latestPool = poolPage === null
          ? null
          : poolPage.items.find((pool) => pool.id === project.latestPoolIssueId)
            ?? poolPage.items[0]
            ?? null;
        return {
          project,
          config: configuration.config,
          configEtag: configuration.etag,
          latestPool,
        };
      }));
      setCatalog(catalogValue);
      setRows((existing) => cursor === undefined ? enriched : [...existing, ...enriched]);
      setNextCursor(projects.nextCursor);
      setHasMore(projects.hasMore);
      setStatus("ready");
    } catch (cause) {
      const view = errorView(cause);
      if (cursor === undefined) setStatus(view.kind === "forbidden" ? "forbidden" : "error");
      setError(view);
    } finally {
      setLoadingMore(false);
    }
  }, [canView, canViewPools]);

  useEffect(() => {
    if (session.status === "authenticated") void load(applied);
  }, [applied, load, session.status]);

  const updateLatestPool = useCallback((projectId: string, latestPool: AiPool | null) => {
    setRows((current) => current.map((row) => row.project.id === projectId ? { ...row, latestPool } : row));
  }, []);

  const names = useMemo(() => catalogNames(catalog), [catalog]);
  const supportedLotteries = useMemo(
    () => catalog?.lotteries.filter((item) => item.code === "FC3D") ?? [],
    [catalog],
  );
  const selectedLottery = supportedLotteries.find((item) => item.id === createForm.lotteryId) ?? null;
  const supportedPlays = selectedLottery?.plays.filter((item) => item.code === "FC3D_STRAIGHT") ?? [];
  const metrics = useMemo(() => [
    { label: "已加载项目", value: String(rows.length), detail: "当前筛选与游标快照" },
    { label: "启用项目", value: String(rows.filter((row) => row.project.status === "ENABLED").length), detail: "只影响新期次生成", tone: "good" as const },
    { label: "福彩3D项目", value: String(rows.length), detail: "首期仅支持直选50×20", tone: "good" as const },
    { label: "异常期次", value: String(rows.filter((row) => row.latestPool?.status === "EXCEPTION_PENDING").length), detail: "无解、超时或规则阻塞", tone: "danger" as const },
  ], [rows]);

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const intent = createIntent ?? newIntent("createAiProject");
    setCreateIntent(intent);
    setCreatePending(true);
    setError(null);
    try {
      const result = await createProject({
        name: createForm.name.trim(),
        lotteryId: createForm.lotteryId,
        playId: createForm.playId,
        settings: settingsFromForm(createForm),
        reason: createForm.reason.trim(),
        idempotencyKey: intent,
      });
      setFeedback(`项目已创建，配置版本 ${result.version} 已立即生效。`);
      setCreateOpen(false);
      setCreateForm({ ...emptySettings, name: "", lotteryId: "", playId: "" });
      setCreateIntent(null);
      await load(applied);
    } catch (cause) {
      setError(errorView(cause));
    } finally {
      setCreatePending(false);
    }
  }

  async function openDetail(project: AiProject) {
    setDetailPending(true);
    setError(null);
    try {
      const [fresh, pools] = await Promise.all([
        getProject(project.id),
        canViewPools ? listPools(project.id) : Promise.resolve(null),
      ]);
      setDetail({ project: fresh, pools: pools?.items ?? [] });
    } catch (cause) {
      setError(errorView(cause));
    } finally {
      setDetailPending(false);
    }
  }

  function openSettings(row: ProjectRow) {
    setSettingsTarget(row);
    setSettingsForm(formFromSettings(row.config.settings));
    setSettingsIntent(newIntent("saveAiProjectConfig"));
  }

  async function submitSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (settingsTarget === null || settingsTarget.configEtag === null) return;
    const intent = settingsIntent ?? newIntent("saveAiProjectConfig");
    setSettingsIntent(intent);
    setSettingsPending(true);
    setError(null);
    try {
      const result = await saveProjectConfig({
        projectId: settingsTarget.project.id,
        settings: settingsFromForm(settingsForm),
        reason: settingsForm.reason.trim(),
        etag: settingsTarget.configEtag,
        idempotencyKey: intent,
      });
      setFeedback(`配置版本 ${result.version} 已生效；仅用于下一期，不回写已生成期次。`);
      setSettingsTarget(null);
      setSettingsIntent(null);
      await load(applied);
    } catch (cause) {
      setError(errorView(cause));
    } finally {
      setSettingsPending(false);
    }
  }

  async function submitStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (statusTarget === null) return;
    const intent = statusIntent ?? newIntent("setAiProjectStatus");
    setStatusIntent(intent);
    setStatusPending(true);
    setError(null);
    try {
      const result = await setProjectStatus({
        project: statusTarget.project,
        status: statusTarget.next,
        reason: statusReason.trim(),
        idempotencyKey: intent,
      });
      setFeedback(`项目已由服务端更新为${result.status === "ENABLED" ? "启用" : "停用"}；历史和已生成期次保持不变。`);
      setStatusTarget(null);
      setStatusReason("");
      setStatusIntent(null);
      await load(applied);
    } catch (cause) {
      setError(errorView(cause));
    } finally {
      setStatusPending(false);
    }
  }

  async function openNumbers(row: ProjectRow) {
    setNumberPendingId(row.project.id);
    setError(null);
    try {
      if (row.latestPool !== null && canViewPools) {
        const result = await getPool(row.latestPool.id);
        setNumberView({ kind: "fixed", projectName: row.project.name, value: result.value });
      } else {
        const result = await getCombinationPreview(row.project.id);
        setNumberView({ kind: "preview", projectName: row.project.name, value: result });
      }
    } catch (cause) {
      setError(errorView(cause));
    } finally {
      setNumberPendingId(null);
    }
  }

  if (session.status === "loading") {
    return <PageState kind="loading" title="正在读取员工会话" description="确认 AI 项目权限与数据范围。" />;
  }
  if (session.status === "anonymous") {
    return <PageState kind="forbidden" title="员工会话已失效" description="请重新登录运营后台。" />;
  }
  if (session.status === "error") {
    return <PageState kind="error" title="员工会话不可用" description={`会话校验失败（${session.errorCode ?? "SESSION_UNAVAILABLE"}）。`} />;
  }

  return (
    <>
      <PageHeader
        actions={(
          <div className={styles.pageActions}>
            <Link className={styles.linkButton} href="/ai-pools/reports">每期报表</Link><ChangeNotesButton module="aiManagement" />
            {canCreate ? <ActionButton onClick={() => {
              setCreateOpen(true);
              setCreateIntent(newIntent("createAiProject"));
              setError(null);
            }} variant="primary">创建 AI 项目</ActionButton> : null}
          </div>
        )}
        description="管理长期项目、下一期配置版本和逐期实例；号码、金额、分配与余额均由服务端权威流程产生。"
        pageId="A13"
        title="AI合买项目(修改)"
      />

      <InlineNotice title="福彩3D直选固定规则" tone="info">
        首期固定000—999、50组×20号、每号码2积分、1000倍总返还；管理员只设置项目资金参数，不能更改固定玩法或逐组额度。
      </InlineNotice>
      {feedback === null ? null : <InlineNotice title="服务端回执" tone="success">{feedback}</InlineNotice>}
      {canConfigure && canViewPools && status === "ready" ? <AiBudgetDialog pools={rows.flatMap((row) => row.latestPool ? [row.latestPool] : [])} /> : null}
      {status === "ready" && error !== null
        ? <InlineNotice title={error.kind === "unknown-submit" ? "提交结果未知" : "操作未完成"} tone={error.kind === "unknown-submit" ? "warning" : "danger"}>{error.message}</InlineNotice>
        : null}

      <Panel description="筛选会重新请求项目列表；状态是长期项目状态，不代表最新期次结算状态。" title="项目筛选">
        <form className={styles.filterBar} onSubmit={(event) => {
          event.preventDefault();
          setApplied({ ...filters });
        }}>
          <label className={styles.field} data-grow="true">
            <span>项目名称 / 编号</span>
            <input onChange={(event) => setFilters((value) => ({ ...value, keyword: event.target.value }))} value={filters.keyword} />
          </label>
          <label className={styles.field}>
            <span>彩票</span>
            <select onChange={(event) => setFilters((value) => ({ ...value, lotteryId: event.target.value }))} value={filters.lotteryId}>
              <option value="">全部彩票</option>
              {catalog?.lotteries.map((lottery) => <option key={lottery.id} value={lottery.id}>{lottery.name}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>项目状态</span>
            <select onChange={(event) => setFilters((value) => ({ ...value, status: event.target.value as Filters["status"] }))} value={filters.status}>
              <option value="">全部状态</option>
              <option value="ENABLED">启用</option>
              <option value="DISABLED">停用</option>
            </select>
          </label>
          <ActionButton type="submit" variant="primary">查询</ActionButton>
          <ActionButton onClick={() => { setFilters(emptyFilters); setApplied(emptyFilters); }}>重置</ActionButton>
        </form>
      </Panel>

      {status === "loading" ? <PageState kind="loading" title="正在读取 AI 项目与配置版本" /> : null}
      {status === "forbidden" ? <PageState description={error?.message} kind="forbidden" /> : null}
      {status === "error" && error !== null ? <ErrorState error={error} onRetry={() => void load(applied)} /> : null}
      {status === "ready" ? (
        <>
          <MetricStrip items={metrics} />
          <Panel description="配置列来自项目当前配置；最新期次只展示服务端已生成实例，不补造期号或开奖号。" flush title="长期项目">
            {rows.length === 0 ? <PageState kind="empty" title="当前筛选没有 AI 项目" /> : (
              <div className={styles.tableWrap}>
                <table className={styles.table} data-wide="true">
                  <thead><tr>
                    <th>项目</th><th>彩票 / 玩法</th><th>官方开奖 / 自动生成</th><th>固定号码组</th><th>用户增量比例</th><th>默认目标收益率</th><th>最新期次</th><th>配置版本</th><th>状态</th><th>操作</th>
                  </tr></thead>
                  <tbody>{rows.map((row) => {
                    const lottery = names.lotteries.get(row.project.lotteryId);
                    const play = names.plays.get(row.project.playId);
                    return (
                      <Fragment key={row.project.id}><tr>
                        <td><span className={styles.cellTitle}>{row.project.name}</span><span className={styles.cellMeta}>{row.project.code}</span></td>
                        <td><span className={styles.cellTitle}>{lottery ?? row.project.lotteryId}</span><span className={styles.cellMeta}>{play ?? row.project.playId}</span></td>
                        <td>
                          <span className={styles.cellTitle}>{row.project.drawSchedule === null ? "等待官方期次" : formatDateTime(row.project.drawSchedule.drawAt)}</span>
                          {row.project.drawSchedule === null ? null : <span className={styles.cellMeta}>{row.project.drawSchedule.issueCode} 期 · 北京时间</span>}
                          <span className={styles.cellMeta}>期次开放后自动生成 · 开奖前 {row.config.settings.cutoffOffsetMinutes} 分钟截止</span>
                        </td>
                        <td><strong>50 组 × 20 号</strong></td>
                        <td>{formatBps(row.config.settings.userIncrementRatioBps)}</td>
                        <td>{row.config.settings.defaultTargetNetReturnPercent}%<span className={styles.cellMeta}>{row.config.settings.settlementMode === "AUTO" ? "自动发放" : "人工发放"}</span></td>
                        <td>{row.latestPool === null ? <span className={styles.cellMeta}>尚未生成</span> : <><Link className={styles.quietLink} href={`/ai-pools/${encodeURIComponent(row.latestPool.id)}`}>{row.latestPool.issueCode}</Link><PoolStatusBadge status={row.latestPool.status} /></>}</td>
                        <td><strong>v{row.config.version}</strong><span className={styles.cellMeta}>用于新期次</span></td>
                        <td><ProjectStatusBadge status={row.project.status} /></td>
                        <td><div className={styles.tableActions}>
                          {canViewPools ? <ActionButton variant="primary" onClick={() => setExpanded((current) => {
                            const next = new Set(current); if (next.has(row.project.id)) next.delete(row.project.id); else next.add(row.project.id); return next;
                          })}>{expanded.has(row.project.id) ? "收起报表" : "展开报表"}</ActionButton> : null}
                          <ActionButton disabled={detailPending} onClick={() => void openDetail(row.project)} variant="quiet">详情</ActionButton>
                          {row.latestPool !== null && canViewPools ? <ActionButton disabled={numberPendingId === row.project.id} onClick={() => void openNumbers(row)} variant="quiet">{numberPendingId === row.project.id ? "读取中…" : "本期号码"}</ActionButton> : null}
                          {row.latestPool === null && canConfigure ? <ActionButton disabled={numberPendingId === row.project.id} onClick={() => void openNumbers(row)} variant="quiet">{numberPendingId === row.project.id ? "生成中…" : "生成号码预览"}</ActionButton> : null}
                          {canConfigure ? <ActionButton onClick={() => openSettings(row)}>设置</ActionButton> : null}
                          {canSetStatus ? <ActionButton onClick={() => {
                            setStatusTarget({ project: row.project, next: row.project.status === "ENABLED" ? "DISABLED" : "ENABLED" });
                            setStatusReason("");
                            setStatusIntent(newIntent("setAiProjectStatus"));
                          }} variant={row.project.status === "ENABLED" ? "danger" : "primary"}>{row.project.status === "ENABLED" ? "停用" : "启用"}</ActionButton> : null}
                        </div></td>
                      </tr>
                      {expanded.has(row.project.id) ? <tr><td colSpan={10} className={styles.issueReportCell}>
                        <AiIssueReportsPanel projectId={row.project.id} projectName={row.project.name} projectCode={row.project.code} onLatestPool={updateLatestPool} />
                      </td></tr> : null}
                      </Fragment>
                    );
                  })}</tbody>
                </table>
              </div>
            )}
            {hasMore && nextCursor !== null ? <div className={styles.summaryBar}><span>已加载 {rows.length} 个项目。</span><ActionButton disabled={loadingMore} onClick={() => void load(applied, nextCursor)}>{loadingMore ? "加载中…" : "加载更多"}</ActionButton></div> : null}
          </Panel>
        </>
      ) : null}

      <Dialog
        description="首期仅可创建福彩3D直选项目；配置保存后立即生效于下一期。"
        footer={<><ActionButton onClick={() => setCreateOpen(false)}>取消</ActionButton><ActionButton disabled={createPending} form="create-ai-project" type="submit" variant="primary">{createPending ? "提交中…" : "创建草稿"}</ActionButton></>}
        onClose={() => setCreateOpen(false)}
        open={createOpen}
        title="创建 AI 合买项目"
        width="wide"
      >
        <div className={`${styles.stageRail} ${styles.dialogNote}`}>
          <span data-active="true">1 创建并生效</span><span>2 按期生成50组</span><span>3 会员认购</span><span>4 开奖后选收益率</span><span>5 确认发放</span>
        </div>
        {catalog?.approvalStatus === "D01_PENDING" ? <InlineNotice title="目录其他玩法待确认" tone="info">本项目只开放已确认的福彩3D直选；目录中的其他候选玩法不影响创建。</InlineNotice> : null}
        <form className={styles.formGrid} id="create-ai-project" onSubmit={submitCreate}>
          <label className={styles.field}><span>项目名称</span><input maxLength={80} onChange={(event) => setCreateForm((value) => ({ ...value, name: event.target.value }))} required value={createForm.name} /></label>
          <label className={styles.field}><span>彩票</span><select onChange={(event) => setCreateForm((value) => ({ ...value, lotteryId: event.target.value, playId: "" }))} required value={createForm.lotteryId}><option value="">请选择</option>{supportedLotteries.map((lottery) => <option key={lottery.id} value={lottery.id}>{lottery.name}</option>)}</select></label>
          <label className={styles.field}><span>玩法</span><select disabled={selectedLottery === null} onChange={(event) => setCreateForm((value) => ({ ...value, playId: event.target.value }))} required value={createForm.playId}><option value="">请选择</option>{supportedPlays.map((play) => <option key={play.id} value={play.id}>{play.name}</option>)}</select></label>
          {settingsFields(createForm, setCreateForm, permissions.includes("ai-payout:execute"))}
        </form>
        {error === null ? null : <InlineNotice tone={error.kind === "unknown-submit" ? "warning" : "danger"}>{error.message}</InlineNotice>}
      </Dialog>

      <Dialog
        description="详情从服务端重新读取；历史期次不受项目启停或新配置回写。"
        footer={<ActionButton onClick={() => setDetail(null)} variant="primary">关闭</ActionButton>}
        onClose={() => setDetail(null)}
        open={detail !== null}
        title={detail === null ? "项目详情" : `${detail.project.name} · 项目详情`}
        width="wide"
      >
        {detail === null ? null : <div className={styles.stack}>
          <DefinitionList>
            <Definition label="项目编号" value={detail.project.code} />
            <Definition label="服务端版本" value={detail.project.version} />
            <Definition label="彩票 / 玩法 ID" value={`${detail.project.lotteryId} / ${detail.project.playId}`} />
            <Definition label="当前配置版本" value={detail.project.activeConfigVersion ?? "尚无已批准版本"} />
          </DefinitionList>
          {detail.pools.length === 0 ? <div className={styles.emptyInline}>尚无服务端生成的期次实例。</div> : (
            <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>期号</th><th>生成时间</th><th>认购截止</th><th>T / U / P</th><th>参与人数</th><th>状态</th><th>入口</th></tr></thead><tbody>{detail.pools.map((pool) => <tr key={pool.id}><td><strong>{pool.issueCode}</strong></td><td>{formatDateTime(pool.generatedAt)}</td><td>{formatDateTime(pool.cutoffAt)}</td><td>{pool.totalPurchasePoints} / {pool.userPurchasePoints} / {pool.platformPoints}</td><td>{pool.participantCount}</td><td><PoolStatusBadge status={pool.status} /></td><td><Link className={styles.quietLink} href={`/ai-pools/${encodeURIComponent(pool.id)}`}>查看期次</Link></td></tr>)}</tbody></table></div>
          )}
        </div>}
      </Dialog>

      <Dialog
        description="设置只属于当前项目；保存形成不可变的新配置版本，并从下一期直接生效。"
        footer={<><ActionButton onClick={() => setSettingsTarget(null)}>关闭</ActionButton>{canConfigure ? <ActionButton disabled={settingsPending || settingsTarget?.configEtag === null} form="ai-project-settings" type="submit" variant="primary">{settingsPending ? "提交中…" : "保存下一期设置"}</ActionButton> : null}</>}
        onClose={() => setSettingsTarget(null)}
        open={settingsTarget !== null}
        title={settingsTarget === null ? "项目设置" : `${settingsTarget.project.name} · ${settingsTarget.project.code} · 设置`}
        width="wide"
      >
        {settingsTarget === null ? null : <div className={styles.stack}>
          <InlineNotice title="生效范围" tone="info">当前已生成期次保持原快照；彩票与玩法已有引用后不可原地更换。</InlineNotice>
          {settingsTarget.configEtag === null ? <InlineNotice title="版本头缺失" tone="danger">当前响应没有 ETag，无法安全保存；请由共享接口层补齐后重试。</InlineNotice> : null}
          <form className={styles.formGrid} id="ai-project-settings" onSubmit={submitSettings}>
            <label className={styles.field}><span>彩票 / 玩法</span><input disabled value={`${names.lotteries.get(settingsTarget.project.lotteryId) ?? settingsTarget.project.lotteryId} / ${names.plays.get(settingsTarget.project.playId) ?? settingsTarget.project.playId}`} /></label>
            <label className={styles.field}><span>当前配置版本</span><input disabled value={`v${settingsTarget.config.version} · 已生效`} /></label>
            {settingsFields(settingsForm, setSettingsForm, permissions.includes("ai-payout:execute"))}
          </form>
          {error === null ? null : <InlineNotice tone={error.kind === "unknown-submit" ? "warning" : "danger"}>{error.message}</InlineNotice>}
        </div>}
      </Dialog>

      <Dialog
        description={numberView?.kind === "fixed" ? "服务端已生成并锁定的本期固定组合；运营人员不能改号。" : "按当前项目配置、正式期次、玩法规则与遗漏快照确定性生成；预览不创建期次、不开放认购。"}
        footer={<ActionButton onClick={() => setNumberView(null)} variant="primary">关闭</ActionButton>}
        onClose={() => setNumberView(null)}
        open={numberView !== null}
        title={numberView === null ? "号码组合" : `${numberView.projectName} · ${numberView.kind === "fixed" ? "本期号码" : "号码预览"}`}
        width="wide"
      >
        {numberView === null ? null : <div className={styles.stack}>
          <InlineNotice title={numberView.kind === "fixed" ? "正式期次固定号码" : "隔离预览，不进入业务账本"} tone={numberView.kind === "fixed" ? "success" : "info"}>
            {numberView.kind === "fixed"
              ? `第 ${numberView.value.pool.issueCode} 期，共 ${numberView.value.combinations.length} 组；生成后不可编辑。`
              : `第 ${numberView.value.issueCode} 期，共 ${numberView.value.combinations.length} 组；预览使用已确认的福彩3D直选固定规则。`}
          </InlineNotice>
          <DefinitionList>
            <Definition label="期号" value={numberView.kind === "fixed" ? numberView.value.pool.issueCode : numberView.value.issueCode} />
            <Definition label="配置 / 规则版本" value={numberView.kind === "fixed" ? `v${numberView.value.configVersion}` : `配置 v${numberView.value.configVersion} / 规则 v${numberView.value.ruleVersion}`} />
            <Definition label="生成时间" value={formatDateTime(numberView.kind === "fixed" ? numberView.value.pool.generatedAt : numberView.value.generatedAt)} />
            <Definition label="输入版本摘要" value={shortHash(numberView.value.inputVersionSetHash)} />
          </DefinitionList>
          <div className={styles.combinationGrid}>
            {numberView.value.combinations.map((item) => <article className={styles.combination} key={`${item.sequenceNo}-${item.selectionHash}`}>
              <div className={styles.combinationHeader}><strong>第 {item.sequenceNo} 组</strong><span className={styles.mono}>{shortHash(item.selectionHash)}</span></div>
              <div className={styles.numberLine}>{item.numberCodes.join(" ")}</div>
              <div className={styles.detailLine}><span>20 个号码</span><span>每组最低 {formatAiPoints(item.baseCostPoints)}</span></div>
            </article>)}
          </div>
        </div>}
      </Dialog>

      <Dialog
        description={statusTarget?.next === "DISABLED" ? "停用只阻止生成新期次，不取消、退款或改变已生成实例。" : "启用后由服务端从下一可用期次恢复生成。"}
        footer={<><ActionButton onClick={() => setStatusTarget(null)}>取消</ActionButton><ActionButton disabled={statusPending || statusReason.trim().length < 2} form="ai-project-status" type="submit" variant={statusTarget?.next === "DISABLED" ? "danger" : "primary"}>{statusPending ? "提交中…" : "确认更新"}</ActionButton></>}
        onClose={() => setStatusTarget(null)}
        open={statusTarget !== null}
        title={statusTarget === null ? "更新项目状态" : `${statusTarget.next === "DISABLED" ? "停用" : "启用"} ${statusTarget.project.name}`}
      >
        <form className={styles.stack} id="ai-project-status" onSubmit={submitStatus}><label className={styles.field}><span>操作原因</span><textarea maxLength={500} onChange={(event) => setStatusReason(event.target.value)} required value={statusReason} /></label>{error === null ? null : <InlineNotice tone={error.kind === "unknown-submit" ? "warning" : "danger"}>{error.message}</InlineNotice>}</form>
      </Dialog>
    </>
  );
}

function settingsFields<T extends SettingsForm>(
  value: T,
  setValue: Dispatch<SetStateAction<T>>,
  canAuto: boolean,
) {
  const update = <K extends keyof SettingsForm>(key: K, next: SettingsForm[K]) => {
    setValue((current) => ({ ...current, [key]: next }));
  };
  return (
    <>
      <label className={styles.field}><span>生效日期</span><input onChange={(event) => update("effectiveDate", event.target.value)} required type="date" value={value.effectiveDate} /></label>
      <div className={styles.field}><span>开奖与生成时间</span><strong>系统跟随官方期次</strong><small>开奖时间由官方日历同步；期次开放且规则与数据就绪后自动生成。</small></div>
      <label className={styles.field}><span>开奖前停止认购（分钟）</span><input max={1440} min={1} onChange={(event) => update("cutoffOffsetMinutes", event.target.value)} required type="number" value={value.cutoffOffsetMinutes} /></label>
      <label className={styles.field}><span>结束日期</span><input min={value.effectiveDate || undefined} onChange={(event) => update("endDate", event.target.value)} type="date" value={value.endDate} /><small>留空表示长期运行。</small></label>
      <label className={styles.field}><span>平台初始积分 F0</span><input inputMode="decimal" min="2000" onChange={(event) => update("initialOfficialPoints", event.target.value)} required step="0.01" type="number" value={value.initialOfficialPoints} /><small>默认20,000积分；至少2,000以覆盖50组最低额度，计入平台单期投入。</small></label>
      <label className={styles.field}><span>用户增量比例</span><input inputMode="numeric" max={10000} min={1} onChange={(event) => update("userIncrementRatioBps", event.target.value)} required type="number" value={value.userIncrementRatioBps} /><small>基点值，500表示5%；按 I=ceil(U×10000/pBps) 计算。</small></label>
      <label className={styles.field}><span>默认目标净收益率</span><input inputMode="numeric" max={100} min={0} onChange={(event) => update("defaultTargetNetReturnPercent", event.target.value)} required type="number" value={value.defaultTargetNetReturnPercent} /><small>整数百分比，初始5%。</small></label>
      <label className={styles.field}><span>发放方式</span><select value={value.settlementMode} onChange={(event) => update("settlementMode", event.target.value as "MANUAL" | "AUTO")}><option value="MANUAL">人工发放</option><option value="AUTO" disabled={!canAuto}>自动发放</option></select><small>保存后用于新期次；改为自动发放时，尚未发放的期次也一并改为自动，并按各期默认目标收益率在开奖锁池后自动发放（旧规则期次除外）。</small></label>
      <label className={styles.field}><span>单期平台总投入上限</span><input inputMode="decimal" min={value.initialOfficialPoints || "2000"} onChange={(event) => update("maxOfficialContributionPoints", event.target.value)} required step="0.01" type="number" value={value.maxOfficialContributionPoints} /></label>
      <label className={styles.field}><span>单期奖励预算上限</span><input inputMode="decimal" min="0" onChange={(event) => update("rewardBudgetLimitPoints", event.target.value)} required step="0.01" type="number" value={value.rewardBudgetLimitPoints} /></label>
      <label className={`${styles.field} ${styles.span2}`}><span>变更原因</span><textarea maxLength={500} minLength={2} onChange={(event) => update("reason", event.target.value)} required value={value.reason} /></label>
    </>
  );
}

function settingsFromForm(value: SettingsForm): AiSettings {
  return {
    effectiveDate: value.effectiveDate,
    timeZone: "Asia/Shanghai",
    cutoffOffsetMinutes: Number(value.cutoffOffsetMinutes),
    endDate: value.endDate || null,
    initialOfficialPoints: value.initialOfficialPoints.trim(),
    userIncrementRatioBps: Number(value.userIncrementRatioBps),
    defaultTargetNetReturnPercent: Number(value.defaultTargetNetReturnPercent),
    settlementMode: value.settlementMode,
    maxOfficialContributionPoints: value.maxOfficialContributionPoints.trim(),
    rewardBudgetLimitPoints: value.rewardBudgetLimitPoints.trim(),
  };
}

function formFromSettings(value: AiSettings): SettingsForm {
  return {
    effectiveDate: value.effectiveDate,
    cutoffOffsetMinutes: String(value.cutoffOffsetMinutes),
    endDate: value.endDate ?? "",
    initialOfficialPoints: value.initialOfficialPoints,
    userIncrementRatioBps: String(value.userIncrementRatioBps),
    defaultTargetNetReturnPercent: String(value.defaultTargetNetReturnPercent),
    settlementMode: value.settlementMode,
    maxOfficialContributionPoints: value.maxOfficialContributionPoints,
    rewardBudgetLimitPoints: value.rewardBudgetLimitPoints,
    reason: "",
  };
}

function catalogNames(catalog: AdminCatalog | null): {
  lotteries: ReadonlyMap<string, string>;
  plays: ReadonlyMap<string, string>;
} {
  const lotteries = new Map<string, string>();
  const plays = new Map<string, string>();
  catalog?.lotteries.forEach((lottery) => {
    lotteries.set(lottery.id, lottery.name);
    lottery.plays.forEach((play) => plays.set(play.id, play.name));
  });
  return { lotteries, plays };
}
