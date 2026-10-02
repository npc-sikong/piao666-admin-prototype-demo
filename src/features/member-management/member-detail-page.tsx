"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionButton,
  Dialog,
  InlineNotice,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/admin-workspace/admin-workspace";
import { PageState } from "@/components/page-state/page-state";
import { useAdminSession } from "@/session/admin-session";
import { availablePointsFormula, ChangeNotesButton } from "@/features/change-notes/change-notes";
import {
  getAdminMember,
  listAdminMemberLedgers,
  listAdminMemberOrders,
  migrateMembership,
  newIntentKey,
  presentApiError,
  setMemberStatus,
} from "./member-api";
import { formatDateTime, formatPoints, pointsTone } from "./member-format";
import { MemberNavigation } from "./member-navigation";
import type {
  CommandReceipt,
  LedgerViewPage,
  MemberAdmin,
  MemberOrderPage,
  StatusToggle,
} from "./member-models";
import styles from "./member-management.module.css";

interface MemberSnapshot {
  member: MemberAdmin;
  etag: string;
}

interface StatusForm {
  status: StatusToggle;
  reason: string;
}

interface StatusIntent extends StatusForm {
  idempotencyKey: string;
}

interface MigrationForm {
  stationId: string;
  stationMasterId: string;
  referrerMemberId: string;
  reason: string;
  proofCode: string;
}

interface MigrationIntent {
  stationId: string;
  stationMasterId: string;
  referrerMemberId: string | null;
  reason: string;
  idempotencyKey: string;
}

export function MemberDetailPage({ memberId }: Readonly<{ memberId: string }>) {
  const session = useAdminSession();
  const permissions = session.identity?.permissions ?? [];
  const canView = permissions.includes("member:view");
  const canStatus = permissions.includes("member:status");
  const canMigrate = permissions.includes("member:membership:migrate");
  const canLedger = permissions.includes("member:ledger:view");
  const canOrders = permissions.includes("member:orders:view");
  const [snapshot, setSnapshot] = useState<MemberSnapshot | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const [error, setError] = useState<string | null>(null);
  const [ledgers, setLedgers] = useState<LedgerViewPage | null>(null);
  const [orders, setOrders] = useState<MemberOrderPage | null>(null);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusForm, setStatusForm] = useState<StatusForm>({ status: "DISABLED", reason: "" });
  const [statusIntent, setStatusIntent] = useState<StatusIntent | null>(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [migrationOpen, setMigrationOpen] = useState(false);
  const [migrationForm, setMigrationForm] = useState<MigrationForm>({
    stationId: "",
    stationMasterId: "",
    referrerMemberId: "",
    reason: "",
    proofCode: "",
  });
  const [migrationIntent, setMigrationIntent] = useState<MigrationIntent | null>(null);
  const [migrationSubmitting, setMigrationSubmitting] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState<string | null>(null);
  const [migrationReceipt, setMigrationReceipt] = useState<CommandReceipt | null>(null);

  const loadMember = useCallback(async () => {
    if (!canView) {
      setStatus("forbidden");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const result = await getAdminMember(memberId);
      setSnapshot({ member: result.data, etag: result.etag });
      setStatus("ready");
    } catch (cause) {
      const presented = presentApiError(cause);
      setStatus(presented.kind === "forbidden" ? "forbidden" : "error");
      setError(presented.message);
    }
  }, [canView, memberId]);

  const loadLedgers = useCallback(async (cursor?: string) => {
    if (!canLedger) return;
    setLedgerError(null);
    try {
      const result = await listAdminMemberLedgers(memberId, cursor);
      setLedgers((current) => cursor === undefined || current === null
        ? result
        : { ...result, items: [...current.items, ...result.items] });
    } catch (cause) {
      setLedgerError(presentApiError(cause).message);
    }
  }, [canLedger, memberId]);

  const loadOrders = useCallback(async (cursor?: string) => {
    if (!canOrders) return;
    setOrderError(null);
    try {
      const result = await listAdminMemberOrders(memberId, cursor);
      setOrders((current) => cursor === undefined || current === null
        ? result
        : { ...result, items: [...current.items, ...result.items] });
    } catch (cause) {
      setOrderError(presentApiError(cause).message);
    }
  }, [canOrders, memberId]);

  useEffect(() => {
    if (session.status === "authenticated") {
      void loadMember();
      void loadLedgers();
      void loadOrders();
    }
  }, [loadLedgers, loadMember, loadOrders, session.status]);

  const member = snapshot?.member ?? null;
  const targetStatus: StatusToggle = member?.status === "ENABLED" ? "DISABLED" : "ENABLED";
  const statusActionLabel = targetStatus === "DISABLED" ? "停用会员" : "恢复会员";

  const migrationChanged = useMemo(() => {
    if (member === null) return false;
    const currentReferrer = member.scope.referrerMember?.id ?? "";
    return migrationForm.stationId.trim() !== member.scope.station.id
      || migrationForm.stationMasterId.trim() !== member.scope.stationMaster.id
      || migrationForm.referrerMemberId.trim() !== currentReferrer;
  }, [member, migrationForm.referrerMemberId, migrationForm.stationId, migrationForm.stationMasterId]);

  function openStatus() {
    setStatusForm({ status: targetStatus, reason: "" });
    setStatusIntent(null);
    setStatusMessage(null);
    setStatusOpen(true);
  }

  async function submitStatus() {
    if (snapshot === null) return;
    const intent = statusIntent ?? {
      status: statusForm.status,
      reason: statusForm.reason.trim(),
      idempotencyKey: newIntentKey("setMemberStatus"),
    };
    setStatusIntent(intent);
    setStatusSubmitting(true);
    setStatusMessage(null);
    try {
      const result = await setMemberStatus({
        memberId: snapshot.member.id,
        status: intent.status,
        reason: intent.reason,
        etag: snapshot.etag,
        idempotencyKey: intent.idempotencyKey,
      });
      setSnapshot({ member: result.data, etag: result.etag });
      setStatusMessage("服务端已确认会员状态更新，详情已使用最新版本。" );
      setStatusIntent(null);
      setStatusOpen(false);
    } catch (cause) {
      const presented = presentApiError(cause);
      setStatusMessage(presented.message);
      if (!presented.submissionUnknown) setStatusIntent(null);
    } finally {
      setStatusSubmitting(false);
    }
  }

  function openMigration() {
    if (member === null) return;
    setMigrationForm({
      stationId: member.scope.station.id,
      stationMasterId: member.scope.stationMaster.id,
      referrerMemberId: member.scope.referrerMember?.id ?? "",
      reason: "",
      proofCode: "",
    });
    setMigrationIntent(null);
    setMigrationMessage(null);
    setMigrationReceipt(null);
    setMigrationOpen(true);
  }

  async function submitMigration() {
    if (snapshot === null) return;
    const intent = migrationIntent ?? {
      stationId: migrationForm.stationId.trim(),
      stationMasterId: migrationForm.stationMasterId.trim(),
      referrerMemberId: migrationForm.referrerMemberId.trim() === ""
        ? null
        : migrationForm.referrerMemberId.trim(),
      reason: migrationForm.reason.trim(),
      idempotencyKey: newIntentKey("migrateMembership"),
    };
    setMigrationIntent(intent);
    setMigrationSubmitting(true);
    setMigrationMessage(null);
    setMigrationReceipt(null);
    try {
      const receipt = await migrateMembership({
        member: snapshot.member,
        ...intent,
        proofCode: migrationForm.proofCode,
        etag: snapshot.etag,
      });
      setMigrationReceipt(receipt);
      setMigrationMessage(receipt.status === "COMPLETED"
        ? "服务端已完成归属纠正；旧流水仍保留事件发生时归属。"
        : "服务端已受理归属纠正，当前回执尚未表示完成。" );
      setMigrationIntent(null);
      setMigrationForm((value) => ({ ...value, proofCode: "" }));
      if (receipt.status === "COMPLETED") {
        await loadMember();
      }
    } catch (cause) {
      const presented = presentApiError(cause);
      setMigrationMessage(presented.message);
      setMigrationForm((value) => ({ ...value, proofCode: "" }));
      if (!presented.submissionUnknown) setMigrationIntent(null);
    } finally {
      setMigrationSubmitting(false);
    }
  }

  if (status === "loading") {
    return <><MemberNavigation /><PageState kind="loading" title="正在读取会员详情" /></>;
  }
  if (status === "forbidden") {
    return <><MemberNavigation /><PageState description={error ?? undefined} kind="forbidden" /></>;
  }
  if (status === "error" || member === null || snapshot === null) {
    return (
      <>
        <MemberNavigation />
        <PageState
          action={<ActionButton onClick={() => void loadMember()}>重试</ActionButton>}
          description={error ?? undefined}
          kind="error"
        />
      </>
    );
  }

  return (
    <>
      <MemberNavigation />
      <PageHeader
        actions={(
          <div className={styles.pageActions}>
            {canStatus ? <ActionButton onClick={openStatus} variant={targetStatus === "DISABLED" ? "danger" : "primary"}>{statusActionLabel}</ActionButton> : null}
            {canMigrate ? <ActionButton onClick={openMigration}>纠正归属</ActionButton> : null}
            <ActionButton onClick={() => void loadMember()}>刷新详情</ActionButton>
            <ChangeNotesButton />
          </div>
        )}
        description={`${availablePointsFormula}；净输赢值对应已结算净收益。`}
        meta={<Link className={styles.backLink} href="/members">← 返回会员列表</Link>}
        pageId="A18"
        title={`${member.displayName || member.account} · 会员详情(修改)`}
      />

      {member.quota.eligibilityStatus !== "READY" ? (
        <InlineNotice title="资格水位未就绪" tone="warning">
          当前资格状态为 {member.quota.eligibilityStatus}，只读事实可查看；依赖权益的写入仍由服务端受控。
        </InlineNotice>
      ) : null}

      <Panel flush title="会员事实">
        <div className={styles.detailHero}>
          <div className={styles.identityBlock}>
            <StatusBadge status={member.status} label={member.status === "ENABLED" ? "会员启用" : "会员停用"} />
            <h2>{member.displayName || "未设置昵称"}</h2>
            <p>{member.account} · <span className={styles.mono}>{member.id}</span></p>
            <small className={styles.muted}>记录版本 {member.version} · 归属版本 {member.scope.version}</small>
          </div>
          <div className={styles.factGrid}>
            <Fact label="可用积分" value={formatPoints(member.wallet.availablePoints)} />
            <Fact label="冻结积分" value={formatPoints(member.wallet.reservedPoints)} />
            <Fact label="累计充值积分" value={formatPoints(member.qualifiedRechargePoints)} />
            <Fact label="历史站长扣除" value={formatPoints(member.stationDeductedPoints)} />
            <Fact label="VIP / 推广" value={`${member.vipName} / ${member.referralName}`} />
            <Fact label="AI分红" value={formatPoints(member.aiDividendPoints)} />
            <Fact label="总推广积分" value={formatPoints(member.totalReferralPoints)} />
            <Fact label="AI总额度" value={formatPoints(member.quota.totalLimit)} />
            <Fact label="AI使用额度" value={formatPoints(member.quota.usedPoints)} />
            <Fact label="AI剩余额度" value={formatPoints(member.quota.remainingPoints)} />
            <Fact label="总参与积分" value={formatPoints(member.totalBetPoints)} />
            <Fact label="已结算净收益" value={formatPoints(member.netProfitPoints, true)} tone={pointsTone(member.netProfitPoints)} />
          </div>
        </div>
      </Panel>

      <div className={styles.detailColumns}>
        <Panel title="当前管理归属">
          <dl className={styles.definitionList}>
            <Detail label="所属站点" value={`${member.scope.station.name} · ${member.scope.station.code}`} />
            <Detail label="所属站长" value={`${member.scope.stationMaster.name} · ${member.scope.stationMaster.code}`} />
            <Detail label="直属上级会员" value={member.scope.referrerMember === null ? "无（站长直推）" : `${member.scope.referrerMember.name} · ${member.scope.referrerMember.code}`} />
            <Detail label="直属会员数" value={member.directMemberCount.toLocaleString("zh-CN")} />
            <Detail label="下级总会员" value={member.descendantMemberCount.toLocaleString("zh-CN")} />
            <Detail label="直属会员可用积分" value={formatPoints(member.directMemberAvailableTotal)} />
            <Detail label="下级会员总可用积分" value={formatPoints(member.descendantMemberAvailableTotal)} />
            <Detail label="邀请码" value={member.inviteCode} />
          </dl>
        </Panel>
        <Panel title="AI 合买日额度">
          <dl className={styles.definitionList}>
            <Detail label="额度日" value={`${member.quota.businessDate} · ${member.quota.timeZone}`} />
            <Detail label="VIP 基础额度" value={formatPoints(member.quota.vipBaseLimit)} />
            <Detail label="推广附加额度" value={formatPoints(member.quota.referralExtraLimit)} />
            <Detail label="已占用 / 剩余" value={`${formatPoints(member.quota.usedPoints)} / ${formatPoints(member.quota.remainingPoints)}`} />
            <Detail label="配置版本" value={`VIP ${member.quota.vipConfigVersion} / 推广 ${member.quota.referralConfigVersion}`} />
            <Detail label="资格版本" value={member.quota.qualificationVersion} />
          </dl>
        </Panel>
      </div>

      <InlineNotice title="积分管理边界">
        员工后台不提供任意编辑余额入口。会员积分只能经站长正式加减、订单结算、奖励义务或受控冲正写入账本；本页仅查看流水。
      </InlineNotice>

      <Panel description="服务端授权范围内的不可变积分分录；余额变化与累计充值资格不能互相替代。" flush title="最近积分流水">
        {!canLedger ? <PageState kind="forbidden" title="无积分流水查看权限" /> : null}
        {canLedger && ledgerError !== null ? <PageState description={ledgerError} kind="error" /> : null}
        {canLedger && ledgerError === null && ledgers === null ? <PageState kind="loading" /> : null}
        {canLedger && ledgers !== null && ledgers.items.length === 0 ? <PageState kind="empty" /> : null}
        {canLedger && ledgers !== null && ledgers.items.length > 0 ? (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>时间</th><th>类型</th><th>分桶</th><th>变化</th><th>余额前</th><th>余额后</th><th>来源</th><th>说明</th><th>交易号</th></tr></thead>
                <tbody>
                  {ledgers.items.map((ledger) => (
                    <tr key={ledger.id}>
                      <td>{formatDateTime(ledger.createdAt)}</td>
                      <td><strong>{ledger.type}</strong></td>
                      <td><StatusBadge status={ledger.bucket} /></td>
                      <td className={styles[pointsTone(ledger.changePoints)]}>{formatPoints(ledger.changePoints, true)}</td>
                      <td className={styles.points}>{formatPoints(ledger.balanceBefore)}</td>
                      <td className={styles.points}>{formatPoints(ledger.balanceAfter)}</td>
                      <td><div className={styles.entity}><strong>{ledger.sourceType}</strong><small>{ledger.sourceId}</small></div></td>
                      <td>{ledger.remark || "—"}</td>
                      <td className={styles.mono}>{ledger.transactionId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.pagination}>
              <span>已加载 {ledgers.items.length} 条</span>
              <ActionButton disabled={!ledgers.hasMore || ledgers.nextCursor === null} onClick={() => {
                if (ledgers.nextCursor !== null) void loadLedgers(ledgers.nextCursor);
              }}>加载更多</ActionButton>
            </div>
          </>
        ) : null}
      </Panel>

      <Panel description="普通积分参与与 AI 合买记录只读展示；状态、中奖和返奖结论来自服务端。" flush title="最近参与记录">
        {!canOrders ? <PageState kind="forbidden" title="无参与记录查看权限" /> : null}
        {canOrders && orderError !== null ? <PageState description={orderError} kind="error" /> : null}
        {canOrders && orderError === null && orders === null ? <PageState kind="loading" /> : null}
        {canOrders && orders !== null && orders.items.length === 0 ? <PageState kind="empty" /> : null}
        {canOrders && orders !== null && orders.items.length > 0 ? (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>时间</th><th>类型</th><th>项目 / 彩票</th><th>期号</th><th>状态</th><th>参与积分</th><th>应返</th><th>净入账</th><th>退款</th><th>结算版本</th></tr></thead>
                <tbody>
                  {orders.items.map((order) => (
                    <tr key={order.id}>
                      <td>{formatDateTime(order.createdAt)}</td>
                      <td>{order.type === "AI_POOL" ? "AI 合买" : "普通参与"}</td>
                      <td><div className={styles.entity}><strong>{order.projectName ?? order.lotteryId}</strong><small>{order.playId}</small></div></td>
                      <td>{order.issueCode}</td>
                      <td><StatusBadge status={order.status} /></td>
                      <td className={styles.points}>{formatPoints(order.purchasePoints)}</td>
                      <td className={styles.points}>{formatPoints(order.dueAwardPoints)}</td>
                      <td className={styles[pointsTone(order.netPostedAwardPoints)]}>{formatPoints(order.netPostedAwardPoints, true)}</td>
                      <td className={styles.points}>{formatPoints(order.refundPoints)}</td>
                      <td>{order.settlementVersion ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.pagination}>
              <span>已加载 {orders.items.length} 条</span>
              <ActionButton disabled={!orders.hasMore || orders.nextCursor === null} onClick={() => {
                if (orders.nextCursor !== null) void loadOrders(orders.nextCursor);
              }}>加载更多</ActionButton>
            </div>
          </>
        ) : null}
      </Panel>

      <Dialog
        description="状态命令使用当前会员版本、原因和稳定幂等键；服务端回执前页面不会先行改状态。"
        footer={(
          <div className={styles.dialogActions}>
            <ActionButton disabled={statusSubmitting} onClick={() => setStatusOpen(false)}>关闭</ActionButton>
            <ActionButton
              disabled={statusSubmitting || statusForm.reason.trim().length < 2}
              onClick={() => void submitStatus()}
              variant={statusForm.status === "DISABLED" ? "danger" : "primary"}
            >{statusSubmitting ? "提交中" : statusIntent === null ? `确认${statusActionLabel}` : "按原幂等意图重试"}</ActionButton>
          </div>
        )}
        onClose={() => setStatusOpen(false)}
        open={statusOpen}
        title={statusActionLabel}
      >
        <label className={styles.dialogField}>
          <span>操作原因</span>
          <textarea
            disabled={statusIntent !== null}
            maxLength={500}
            onChange={(event) => setStatusForm((value) => ({ ...value, reason: event.target.value }))}
            placeholder="至少 2 个字符，将进入审计"
            value={statusIntent?.reason ?? statusForm.reason}
          />
        </label>
        {statusMessage === null ? null : <p className={styles.inlineMessage} data-tone={statusMessage.includes("已确认") ? "success" : "danger"}>{statusMessage}</p>}
      </Dialog>

      <Dialog
        description="受控纠正站点、站长或直属上级会员。站点管理归属与推广关系分别提交，旧流水不迁移。"
        footer={(
          <div className={styles.dialogActions}>
            <ActionButton disabled={migrationSubmitting} onClick={() => setMigrationOpen(false)}>关闭</ActionButton>
            <ActionButton
              disabled={migrationSubmitting || migrationForm.proofCode.length < 6 || migrationForm.reason.trim().length < 2 || (!migrationChanged && migrationIntent === null)}
              onClick={() => void submitMigration()}
              variant="primary"
            >{migrationSubmitting ? "授权并提交中" : migrationIntent === null ? "强认证并提交" : "重试原迁移意图"}</ActionButton>
          </div>
        )}
        onClose={() => setMigrationOpen(false)}
        open={migrationOpen}
        title="纠正会员归属"
        width="wide"
      >
        <div className={styles.dialogGrid}>
          <label className={styles.dialogField}>
            <span>目标站点 ID</span>
            <input disabled={migrationIntent !== null} onChange={(event) => setMigrationForm((value) => ({ ...value, stationId: event.target.value }))} value={migrationIntent?.stationId ?? migrationForm.stationId} />
          </label>
          <label className={styles.dialogField}>
            <span>目标站长 ID</span>
            <input disabled={migrationIntent !== null} onChange={(event) => setMigrationForm((value) => ({ ...value, stationMasterId: event.target.value }))} value={migrationIntent?.stationMasterId ?? migrationForm.stationMasterId} />
          </label>
          <label className={styles.dialogField} data-span="2">
            <span>直属上级会员 ID</span>
            <input disabled={migrationIntent !== null} onChange={(event) => setMigrationForm((value) => ({ ...value, referrerMemberId: event.target.value }))} placeholder="留空表示无直属上级（站长直推）" value={migrationIntent === null ? migrationForm.referrerMemberId : migrationIntent.referrerMemberId ?? ""} />
            <small className={styles.fieldHint}>上级关系与站点/站长管理归属相互独立；服务端会校验无环和目标范围。</small>
          </label>
          <label className={styles.dialogField} data-span="2">
            <span>纠正原因</span>
            <textarea disabled={migrationIntent !== null} maxLength={500} onChange={(event) => setMigrationForm((value) => ({ ...value, reason: event.target.value }))} value={migrationIntent?.reason ?? migrationForm.reason} />
          </label>
          <label className={styles.dialogField} data-span="2">
            <span>员工 MFA / 动作凭据</span>
            <input autoComplete="one-time-code" maxLength={200} onChange={(event) => setMigrationForm((value) => ({ ...value, proofCode: event.target.value }))} type="password" value={migrationForm.proofCode} />
            <small className={styles.fieldHint}>凭据仅用于本次动作授权，不会写入页面状态回执。</small>
          </label>
        </div>
        {migrationReceipt === null ? null : <p className={styles.inlineMessage}>命令 {migrationReceipt.commandId} · {migrationReceipt.status}</p>}
        {migrationMessage === null ? null : <p className={styles.inlineMessage} data-tone={migrationReceipt === null ? "danger" : migrationReceipt.status === "COMPLETED" ? "success" : undefined}>{migrationMessage}</p>}
      </Dialog>
    </>
  );
}

function Fact({ label, value, tone = "neutral" }: Readonly<{
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}>) {
  return <div className={styles.fact}><span>{label}</span><strong className={tone === "neutral" ? undefined : styles[tone]}>{value}</strong></div>;
}

function Detail({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}
