"use client";
import { ChangeNotesButton } from "@/features/change-notes/change-notes";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ActionButton,
  InlineNotice,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/admin-workspace/admin-workspace";
import { PageState } from "@/components/page-state/page-state";
import { useAdminSession } from "@/session/admin-session";
import { getAdminOrder, orderFailure, type OrderFailureKind } from "./order-api";
import type { AdminOrderDetail, Selection, TaskAccepted } from "./order-models";
import { OrderRetryDialog } from "./order-retry-dialog";
import { formatDateTime, statusLabel } from "./orders-page";
import styles from "./order-management.module.css";

export function OrderDetailPage({ orderId }: Readonly<{ orderId: string }>) {
  const session = useAdminSession();
  const permissions = session.identity?.permissions ?? [];
  const canView = permissions.includes("order:view");
  const canRetry = permissions.includes("order:settlement:retry");
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | OrderFailureKind>("loading");
  const [error, setError] = useState<string | null>(null);
  const [retryOpen, setRetryOpen] = useState(false);
  const [task, setTask] = useState<TaskAccepted | null>(null);

  const load = useCallback(async () => {
    if (!canView) {
      setStatus("forbidden");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      setDetail(await getAdminOrder(orderId));
      setStatus("ready");
    } catch (cause) {
      const failure = orderFailure(cause);
      setError(failure.message);
      setStatus(failure.kind);
    }
  }, [canView, orderId]);

  useEffect(() => {
    if (session.status === "authenticated") {
      void load();
    }
  }, [load, session.status]);

  return (
    <>
      <PageHeader
        actions={(
          <>
            <Link className={styles.backLink} href="/orders">返回订单列表</Link>
            <ActionButton onClick={() => void load()}>刷新详情</ActionButton><ChangeNotesButton module="orders" />
          </>
        )}
        description="查看下单时固定的选号、规则、冻结账本、结算版本、退款和更正链。"
        pageId="A22"
        title="普通订单详情(修改)"
      />

      {task === null ? null : (
        <InlineNotice title={`结算恢复任务已受理 · ${task.taskId}`} tone="success">
          当前状态 {task.status}；该回执不代表积分已到账，最终状态需重新读取订单和账本事实。
        </InlineNotice>
      )}
      {status === "loading" ? <PageState kind="loading" title="正在读取订单详情" /> : null}
      {status === "forbidden" ? <PageState description={error ?? "当前员工无权读取此订单。"} kind="forbidden" /> : null}
      {status === "not-ready" ? <PageState description={error ?? undefined} kind="not-ready" /> : null}
      {status === "version" ? <PageState action={<ActionButton onClick={() => void load()}>重新加载</ActionButton>} description={error ?? undefined} kind="error" title="版本已失效" /> : null}
      {status === "error" ? <PageState action={<ActionButton onClick={() => void load()}>重试</ActionButton>} description={error ?? undefined} kind="error" /> : null}

      {status === "ready" && detail !== null ? (
        <div className={styles.detailGrid}>
          <Panel
            actions={<StatusBadge label={statusLabel(detail.order.status)} status={detail.order.status} />}
            description={`订单 ${detail.order.id}`}
            title="订单与规则快照"
          >
            <dl className={styles.definitionGrid}>
              <Detail label="彩票 / 玩法" value={`${detail.order.lotteryId} / ${detail.order.playId}`} />
              <Detail label="期号" value={detail.order.issueCode} />
              <Detail label="注数 × 倍数" value={`${detail.betCount} × ${detail.multiple}`} />
              <Detail label="参与积分" value={`${detail.order.purchasePoints} 积分`} />
              <Detail label="规则版本" value={detail.ruleVersion} mono />
              <Detail label="模拟返奖规则" value={detail.simulationRuleVersion} mono />
              <Detail label="来源大师" value={detail.recommendationId ?? "自选或未关联"} mono />
              <Detail label="创建时间" value={formatDateTime(detail.order.createdAt)} />
              <Detail label="锁定时间" value={detail.lockedAt === null ? "尚未锁定" : formatDateTime(detail.lockedAt)} />
            </dl>
          </Panel>

          <Panel description="号码来自订单不可变内容快照，完整展示全部区域。" title="固定选号内容">
            <SelectionView selection={detail.selection} />
          </Panel>

          <Panel description="冻结、锁定与结算交易分别保留引用，不以页面状态代替账本。" title="账本引用">
            <dl className={styles.definitionGrid}>
              <Detail label="下单冻结交易" value={detail.ledgerTransactionId} mono />
              <Detail label="截止锁定交易" value={detail.lockTransactionId ?? "尚未产生"} mono />
              <Detail label="应返积分" value={detail.order.dueAwardPoints ?? "待可信结算"} />
              <Detail label="已净发积分" value={detail.order.netPostedAwardPoints} />
              <Detail label="退款积分" value={detail.order.refundPoints} />
              <Detail label="当前结算版本" value={detail.order.settlementVersion ?? "尚未生成"} mono />
            </dl>
          </Panel>

          <Panel
            actions={(
              <ActionButton
                disabled={!canRetry || !["SETTLING", "AWARD_PENDING_BUDGET", "EXCEPTION_PENDING", "CORRECTING"].includes(detail.order.status)}
                onClick={() => setRetryOpen(true)}
                variant="primary"
              >恢复原结算任务</ActionButton>
            )}
            description="每个版本显示命中项、应返、经济差额、实际入账和平台承担。"
            flush
            title="结算与更正版本"
          >
            {detail.settlements.length === 0 ? <div className={styles.inPanelState}><PageState kind="empty" title="尚无结算版本" /></div> : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>版本 / 开奖</th><th>命中项</th><th>应返 / 差额</th><th>动作</th><th>申请 / 入账</th><th>账本交易</th><th>完成时间</th></tr></thead>
                  <tbody>{detail.settlements.map((settlement) => (
                    <tr key={`${settlement.settlementVersion}-${settlement.createdAt}`}>
                      <td><div className={styles.entity}><strong>{settlement.settlementVersion}</strong><small>开奖 {settlement.drawVersionId}</small><small>计算 {settlement.calculationReference}</small></div></td>
                      <td>{settlement.awardCodes === null ? "历史结构不可用" : settlement.awardCodes.length === 0 ? "未命中" : settlement.awardCodes.join("、")}</td>
                      <td><div className={styles.entity}><strong>{settlement.dueAwardPoints}</strong><small>经济差额 {settlement.economicDeltaPoints}</small></div></td>
                      <td><div className={styles.entity}><strong>{settlement.actionType}</strong><small>{settlement.actionStatus}</small></div></td>
                      <td><div className={styles.entity}><strong>{settlement.requestedPoints} / {settlement.postedPoints}</strong><small>平台承担 {settlement.platformBornePoints}</small></div></td>
                      <td><code className={styles.mono}>{settlement.ledgerTransactionId ?? "未入账"}</code></td>
                      <td>{settlement.completedAt === null ? "未完成" : formatDateTime(settlement.completedAt)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel description="退款与中奖返奖分开记录；取消不会被展示为未中奖结算。" title="退款事实">
            {detail.refund === null ? <PageState kind="empty" title="没有退款记录" /> : (
              <dl className={styles.definitionGrid}>
                <Detail label="退款积分" value={detail.refund.refundPoints} />
                <Detail label="已回收返奖" value={detail.refund.recoveredAwardPoints} />
                <Detail label="平台承担" value={detail.refund.platformBornePoints} />
                <Detail label="退款交易" value={detail.refund.refundTransactionId} mono />
                <Detail label="回收交易" value={detail.refund.recoveryTransactionId ?? "无"} mono />
                <Detail label="退款时间" value={formatDateTime(detail.refund.refundedAt)} />
                <Detail label="原因" value={detail.refund.reason} wide />
              </dl>
            )}
          </Panel>
        </div>
      ) : null}

      <OrderRetryDialog
        onAccepted={(accepted) => { setTask(accepted); void load(); }}
        onClose={() => setRetryOpen(false)}
        orderId={retryOpen ? orderId : null}
      />
    </>
  );
}

function SelectionView({ selection }: Readonly<{ selection: Selection }>) {
  return (
    <div className={styles.selectionBlock}>
      <div className={styles.selectionMeta}><span>模式 {selection.mode}</span><span>结构 {selection.schemaId}</span><span>版本 {selection.schemaVersion}</span></div>
      <div className={styles.areaList}>{selection.areas.map((area) => (
        <section className={styles.area} key={area.key}>
          <strong>{area.key}</strong>
          {area.chosen.length > 0 ? <NumberLine label="号码" values={area.chosen} /> : null}
          {area.dan.length > 0 ? <NumberLine label="胆码" values={area.dan} /> : null}
          {area.tuo.length > 0 ? <NumberLine label="拖码" values={area.tuo} /> : null}
        </section>
      ))}</div>
    </div>
  );
}

function NumberLine({ label, values }: Readonly<{ label: string; values: readonly number[] }>) {
  return <div className={styles.numberLine}><span>{label}</span><div>{values.map((value, index) => <b key={`${value}-${index}`}>{String(value).padStart(2, "0")}</b>)}</div></div>;
}

function Detail({ label, value, mono = false, wide = false }: Readonly<{ label: string; value: string; mono?: boolean; wide?: boolean }>) {
  return <div className={styles.definition} data-wide={wide || undefined}><dt>{label}</dt><dd className={mono ? styles.mono : undefined}>{value}</dd></div>;
}
