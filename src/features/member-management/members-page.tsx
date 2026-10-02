"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActionButton,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/admin-workspace/admin-workspace";
import { PageState } from "@/components/page-state/page-state";
import { useAdminSession } from "@/session/admin-session";
import { availablePointsFormula, ChangeNotesButton } from "@/features/change-notes/change-notes";
import { listAdminMembers, presentApiError } from "./member-api";
import { formatPoints, pointsTone } from "./member-format";
import { MemberNavigation } from "./member-navigation";
import type { MemberAdminPage } from "./member-models";
import styles from "./member-management.module.css";

interface MemberFilters {
  keyword: string;
  stationId: string;
  stationMasterId: string;
  vipLevelId: string;
  referralLevelId: string;
}

const emptyFilters: MemberFilters = {
  keyword: "",
  stationId: "",
  stationMasterId: "",
  vipLevelId: "",
  referralLevelId: "",
};

const pageSizes = [20, 40, 60, 80, 100] as const;

export function MembersPage() {
  const session = useAdminSession();
  const canView = session.identity?.permissions.includes("member:view") ?? false;
  const [draft, setDraft] = useState<MemberFilters>(emptyFilters);
  const [applied, setApplied] = useState<MemberFilters>(emptyFilters);
  const [page, setPage] = useState<MemberAdminPage | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const [error, setError] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<readonly (string | undefined)[]>([undefined]);
  const [pageSize, setPageSize] = useState<number>(20);
  const loadSequence = useRef(0);
  const currentCursor = cursorStack[cursorStack.length - 1];

  const load = useCallback(async (filters: MemberFilters, cursor?: string) => {
    const sequence = ++loadSequence.current;
    if (!canView) {
      setStatus("forbidden");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const result = await listAdminMembers({ ...filters, cursor, limit: pageSize });
      if (sequence !== loadSequence.current) return;
      setPage(result);
      setStatus("ready");
    } catch (cause) {
      if (sequence !== loadSequence.current) return;
      const presented = presentApiError(cause);
      setStatus(presented.kind === "forbidden" ? "forbidden" : "error");
      setError(presented.message);
    }
  }, [canView, pageSize]);

  useEffect(() => {
    if (session.status === "authenticated") {
      void load(applied, currentCursor);
    }
  }, [applied, currentCursor, load, session.status]);

  function applyFilters() {
    setCursorStack([undefined]);
    setApplied({ ...draft });
  }

  function resetFilters() {
    setDraft(emptyFilters);
    setCursorStack([undefined]);
    setApplied(emptyFilters);
  }

  return (
    <>
      <MemberNavigation />
      <PageHeader
        actions={(
          <div className={styles.pageActions}>
            <Link className={styles.textLink} href="/members/vip">VIP 配置</Link>
            <Link className={styles.textLink} href="/members/referrals">推广配置</Link>
            <ActionButton onClick={() => void load(applied, currentCursor)}>刷新列表</ActionButton>
            <ChangeNotesButton />
          </div>
        )}
        description="查看会员归属、积分、AI 日额度及推荐下级统计；支持筛选、每页条数选择和分页。"
        meta={page?.snapshotId === null || page?.snapshotId === undefined
          ? undefined
          : <span className={styles.mono}>快照 {page.snapshotId}</span>}
        pageId="A18"
        title="会员列表(修改)"
      />

      <Panel description="按当前本地演示数据筛选；查询、重置及切换每页条数均返回第一页。" title="会员筛选">
        <form className={styles.filterBar} onSubmit={(event) => {
          event.preventDefault();
          applyFilters();
        }}>
          <label className={styles.field} data-span="2">
            <span>会员编号 / 昵称 / 登录账号</span>
            <input
              maxLength={100}
              onChange={(event) => setDraft((value) => ({ ...value, keyword: event.target.value }))}
              placeholder="输入关键字"
              value={draft.keyword}
            />
          </label>
          <label className={styles.field}>
            <span>站点 ID</span>
            <input
              onChange={(event) => setDraft((value) => ({ ...value, stationId: event.target.value }))}
              placeholder="留空表示授权范围"
              value={draft.stationId}
            />
          </label>
          <label className={styles.field}>
            <span>站长 ID</span>
            <input
              onChange={(event) => setDraft((value) => ({ ...value, stationMasterId: event.target.value }))}
              placeholder="精确筛选当前归属"
              value={draft.stationMasterId}
            />
          </label>
          <label className={styles.field}>
            <span>VIP 等级 ID</span>
            <input
              onChange={(event) => setDraft((value) => ({ ...value, vipLevelId: event.target.value }))}
              placeholder="留空表示全部"
              value={draft.vipLevelId}
            />
          </label>
          <label className={styles.field}>
            <span>推广等级 ID</span>
            <input
              onChange={(event) => setDraft((value) => ({ ...value, referralLevelId: event.target.value }))}
              placeholder="留空表示全部"
              value={draft.referralLevelId}
            />
          </label>
          <div className={styles.filterActions}>
            <ActionButton type="submit" variant="primary">查询</ActionButton>
            <ActionButton onClick={resetFilters} type="button">重置</ActionButton>
          </div>
        </form>
      </Panel>

      {status === "loading" ? <PageState kind="loading" title="正在读取会员快照" /> : null}
      {status === "forbidden" ? (
        <PageState description={error ?? "当前员工没有会员查看权限。"} kind="forbidden" />
      ) : null}
      {status === "error" ? (
        <PageState
          action={<ActionButton onClick={() => void load(applied, currentCursor)}>重试</ActionButton>}
          description={error ?? undefined}
          kind="error"
        />
      ) : null}

      {status === "ready" && page !== null ? (
        <Panel
          description={`共 ${page.totalCount} 条会员，当前页 ${page.items.length} 条。${availablePointsFormula}；净输赢值对应已结算净收益。`}
          flush
          title="会员清单"
        >
          {page.items.length === 0 ? (
            <PageState kind="empty" title="当前筛选没有会员" />
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table} data-width="members">
                <thead>
                  <tr>
                    <th>会员</th>
                    <th>状态</th>
                    <th>所属站点</th>
                    <th>所属站长</th>
                    <th>直属上级会员</th>
                    <th>VIP</th>
                    <th>推广等级</th>
                    <th>累计充值积分</th>
                    <th>站长扣除积分</th>
                    <th>可用积分</th>
                    <th>冻结积分</th>
                    <th>AI分红</th>
                    <th>已结算净收益</th>
                    <th>总推广积分</th>
                    <th>总参与积分</th>
                    <th>AI总额度</th>
                    <th>AI使用额度</th>
                    <th>AI剩余额度</th>
                    <th>直属会员数</th>
                    <th>下级总会员</th>
                    <th>直属会员可用积分</th>
                    <th>下级会员总可用积分</th>
                    <th>邀请码</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {page.items.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <div className={styles.entity}>
                          <Link href={`/members/${encodeURIComponent(member.id)}`}>{member.displayName || member.account}</Link>
                        </div>
                      </td>
                      <td><StatusBadge status={member.status} label={member.status === "ENABLED" ? "启用" : "停用"} /></td>
                      <td><ScopeCell code={member.scope.station.code} name={member.scope.station.name} /></td>
                      <td><ScopeCell code={member.scope.stationMaster.code} name={member.scope.stationMaster.name} /></td>
                      <td>{member.scope.referrerMember === null ? <span className={styles.muted}>站长直推 / 无上级</span> : <ScopeCell code={member.scope.referrerMember.code} name={member.scope.referrerMember.name} />}</td>
                      <td><strong>{member.vipName}</strong></td>
                      <td><strong>{member.referralName}</strong></td>
                      <td className={styles.points}>{formatPoints(member.qualifiedRechargePoints)}</td>
                      <td className={styles.points}>{formatPoints(member.stationDeductedPoints)}</td>
                      <td className={styles.points}>{formatPoints(member.wallet.availablePoints)}</td>
                      <td className={styles.points}>{formatPoints(member.wallet.reservedPoints)}</td>
                      <td className={styles.points}>{formatPoints(member.aiDividendPoints)}</td>
                      <td className={styles[pointsTone(member.netProfitPoints)]}>{formatPoints(member.netProfitPoints, true)}</td>
                      <td className={styles.points}>{formatPoints(member.totalReferralPoints)}</td>
                      <td className={styles.points}>{formatPoints(member.totalBetPoints)}</td>
                      <td className={styles.points}>{formatPoints(member.quota.totalLimit)}</td>
                      <td className={styles.points}>{formatPoints(member.quota.usedPoints)}</td>
                      <td className={styles.points}>{formatPoints(member.quota.remainingPoints)}</td>
                      <td className={styles.number}>{member.directMemberCount.toLocaleString("zh-CN")}</td>
                      <td className={styles.number}>{member.descendantMemberCount.toLocaleString("zh-CN")}</td>
                      <td className={styles.points}>{formatPoints(member.directMemberAvailableTotal)}</td>
                      <td className={styles.points}>{formatPoints(member.descendantMemberAvailableTotal)}</td>
                      <td className={styles.mono}>{member.inviteCode}</td>
                      <td><Link className={styles.textLink} href={`/members/${encodeURIComponent(member.id)}`}>查看详情</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className={styles.pagination}>
            <label className={styles.pageSize}>
              <span>每页展示</span>
              <select aria-label="每页展示会员条数" value={pageSize} onChange={(event) => {
                setPageSize(Number(event.target.value));
                setCursorStack([undefined]);
              }}>
                {pageSizes.map(size => <option key={size} value={size}>{size} 条</option>)}
              </select>
            </label>
            <span>共 {page.totalCount} 条 · 当前 {page.items.length === 0 ? 0 : Number(currentCursor ?? 0) + 1}–{Number(currentCursor ?? 0) + page.items.length} 条</span>
            <span>第 {cursorStack.length} / {Math.max(1, Math.ceil(page.totalCount / pageSize))} 页</span>
            <ActionButton
              disabled={cursorStack.length === 1}
              onClick={() => setCursorStack((value) => value.slice(0, -1))}
            >上一页</ActionButton>
            <ActionButton
              disabled={!page.hasMore || page.nextCursor === null}
              onClick={() => {
                if (page.nextCursor !== null) {
                  setCursorStack((value) => [...value, page.nextCursor ?? undefined]);
                }
              }}
            >下一页</ActionButton>
          </div>
        </Panel>
      ) : null}
    </>
  );
}

function ScopeCell({ code, name }: Readonly<{ code: string; name: string }>) {
  return (
    <div className={styles.entity}>
      <strong>{name}</strong>
      <small>{code}</small>
    </div>
  );
}
