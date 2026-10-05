"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ActionButton, InlineNotice, MetricStrip, PageHeader, Panel, StatusBadge } from '@/components/admin-workspace/admin-workspace';
import { ListExport, ListPagination } from '@/components/list-controls';
import { PageState } from '@/components/page-state/page-state';
import { ChangeNotesButton } from '@/features/change-notes/change-notes';
import { useAdminSession } from '@/session/admin-session';
import { useRoute } from '@/demo/router';
import { state } from '@/demo/state';
import { orderExportRows, orderStatusName, queryOrders } from '@/demo/list-workspaces';
import { reportDate } from '@/demo/operational-reports';
import { cents, money } from '@/demo/operational-records';
import type { Row } from '@/demo/seed';
import type { TaskAccepted } from './order-models';
import { OrderRetryDialog } from './order-retry-dialog';
import styles from '@/features/operational-reports/operational-reports.module.css';

const empty = { account: '', businessNumber: '', lotteryId: '', playId: '', issueCode: '', status: '', from: '', to: '' };
const statuses = ['RESERVED', 'LOCKED', 'WAITING_DRAW', 'SETTLING', 'AWARD_PENDING_BUDGET', 'SETTLED', 'CANCELLING', 'CANCELLED', 'CORRECTING', 'CORRECTED', 'EXCEPTION_PENDING'];
function initialFilters() {
  const p = new URLSearchParams(location.hash.split('?')[1] || '');
  return { ...empty, account: p.get('account') || state.members.find((m: Row) => m.id === p.get('memberId'))?.account || '' };
}
export function OrdersPage() {
  const session = useAdminSession(), route = useRoute();
  const permissions = session.identity?.permissions || [], canView = permissions.includes('order:view') || permissions.includes('member:orders:view'), canRetry = permissions.includes('order:settlement:retry');
  const [draft, setDraft] = useState(initialFilters), [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1), [size, setSize] = useState(10), [retryOrderId, setRetryOrderId] = useState<string | null>(null), [accepted, setAccepted] = useState<TaskAccepted | null>(null), [error, setError] = useState('');
  const [, refresh] = useState(0);
  useEffect(() => { const f = initialFilters(); setDraft(f); setFilters(f); setPage(1); }, [route]);
  if (session.status === 'authenticated' && !canView) return <PageState kind="forbidden" title="无订单查看权限" />;
  const all = queryOrders(state, filters), current = Math.min(page, Math.max(1, Math.ceil(all.length / size))), rows = all.slice((current - 1) * size, current * size);
  const input = (key: keyof typeof empty, label: string, type = 'text') => <label className={styles.field}><span>{label}</span><input type={type} value={draft[key]} onInput={e => { const value = e.currentTarget.value; setDraft(f => ({ ...f, [key]: value })); }} /></label>;
  return <>
    <PageHeader pageId="A22" title="普通参与订单(修改)" description="用中文彩票名称、玩法和下注内容查看普通订单，并导出完整筛选结果。" actions={<div className={styles.actions}><ActionButton onClick={() => refresh(n => n + 1)}>刷新订单</ActionButton><ChangeNotesButton module="orders" /></div>} />
    <InlineNotice title="使用说明">彩票和玩法显示中文名称，下注内容来自下单时的号码快照；积分保留两位小数，未结算应返显示待结算。导出包含全部筛选订单。</InlineNotice>
    <Panel title="订单筛选" description="默认全部本地演示订单；按会员账号、彩票、玩法、期号、状态和下注日期查询。">
      <form className={styles.filters} onSubmit={e => { e.preventDefault(); if (draft.from && draft.to && draft.from > draft.to) { setError('开始日期不能晚于结束日期。'); return; } setFilters({ ...draft }); setPage(1); setError(''); }}>
        {input('account', '会员账号 / 名称')}{input('businessNumber', '订单号')}
        <label className={styles.field}><span>彩票名称</span><select value={draft.lotteryId} onChange={e => setDraft(f => ({ ...f, lotteryId: e.target.value, playId: '' }))}><option value="">全部彩票</option>{state.catalog.lotteries.map((l: Row) => <option value={l.id} key={l.id}>{l.name}</option>)}</select></label>
        <label className={styles.field}><span>玩法</span><select value={draft.playId} onChange={e => setDraft(f => ({ ...f, playId: e.target.value }))}><option value="">全部玩法</option>{state.catalog.lotteries.filter((l: Row) => !draft.lotteryId || l.id === draft.lotteryId).flatMap((l: Row) => l.plays.map((p: Row) => <option key={p.id} value={p.id}>{p.name}</option>))}</select></label>
        {input('issueCode', '期号')}<label className={styles.field}><span>订单状态</span><select value={draft.status} onChange={e => setDraft(f => ({ ...f, status: e.target.value }))}><option value="">全部状态</option>{statuses.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></label>
        {input('from', '下注开始日期', 'date')}{input('to', '下注结束日期（含）', 'date')}
        <div className={styles.filterActions}><ActionButton type="submit" variant="primary">查询</ActionButton><ActionButton onClick={() => { setDraft(empty); setFilters(empty); setPage(1); setError(''); }}>重置</ActionButton></div>
      </form>{error ? <p role="alert" className={styles.error}>{error}</p> : null}
    </Panel>
    {accepted ? <InlineNotice title="本地恢复操作已执行" tone="success">相关订单状态和结算历史已更新，可在详情及会员投注记录核对。</InlineNotice> : null}
    <MetricStrip items={[{ label: '筛选订单数', value: String(all.length), detail: '完整筛选结果' }, { label: '投注积分', value: money(all.reduce((n, o) => n + cents(o.purchasePoints), 0)), detail: '含待结算与退款订单' }, { label: '已净发积分', value: money(all.reduce((n, o) => n + cents(o.netPostedAwardPoints), 0)), detail: '已记录到账' }, { label: '异常/预算待处理', value: String(all.filter(o => ['EXCEPTION_PENDING', 'AWARD_PENDING_BUDGET'].includes(o.status)).length), detail: '正常待开奖不算异常' }]} />
    <Panel title="订单列表" description={`共 ${all.length} 条；导出包含完整筛选结果，彩票、玩法、状态及下注区域均用中文。`} flush actions={<ListExport rows={orderExportRows(all)} name="普通参与订单" />}>
      <div className={styles.tableWrap}><table className={styles.table}><thead><tr>{['会员账号', '订单号', '彩票名称', '玩法', '期号', '下注内容', '状态', '投注积分', '应返积分', '已净发积分', '退款积分', '下注时间', '结算时间', '操作'].map(t => <th key={t}>{t}</th>)}</tr></thead><tbody>{rows.map(o => <tr key={o.id}>
        <td><Link className={styles.link} href={`/members/${o.memberId}`}>{o.memberAccount}</Link></td><td>{o.businessNumber}</td><td>{o.lotteryName}</td><td>{o.playName}</td><td>{o.issueCode}</td><td title={o.selectionText}>{o.selectionText}</td><td><StatusBadge status={o.status} label={statusLabel(o.status)} /></td><td>{money(cents(o.purchasePoints))}</td><td>{o.dueAwardPoints == null ? '待结算' : money(cents(o.dueAwardPoints))}</td><td>{money(cents(o.netPostedAwardPoints))}</td><td>{money(cents(o.refundPoints))}</td><td>{formatDateTime(o.createdAt)}</td><td>{o.settledAt ? formatDateTime(o.settledAt) : '尚未结算'}</td>
        <td><div className={styles.actions}><Link className={styles.link} href={`/orders/${o.id}`}>查看详情</Link>{canRetry && ['SETTLING', 'AWARD_PENDING_BUDGET', 'EXCEPTION_PENDING', 'CORRECTING'].includes(o.status) ? <button className={styles.textButton} onClick={() => setRetryOrderId(o.id)}>恢复结算</button> : null}</div></td>
      </tr>)}{!rows.length ? <tr><td className={styles.empty} colSpan={14}>当前筛选没有订单。</td></tr> : null}</tbody></table></div>
      <ListPagination count={all.length} page={current} size={size} onPage={setPage} onSize={n => { setSize(n); setPage(1); }} />
    </Panel>
    <OrderRetryDialog orderId={retryOrderId} onClose={() => setRetryOrderId(null)} onAccepted={task => { setAccepted(task); refresh(n => n + 1); }} />
  </>;
}
export const statusLabel = orderStatusName;
export const formatDateTime = reportDate;
