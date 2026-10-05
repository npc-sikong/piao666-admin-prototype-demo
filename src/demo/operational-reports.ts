import { state } from './state';
import { cents, money, isFinalOrder, memberSnapshot, aiMemberAmounts } from './operational-records';
import type { Row } from './seed';
import { reportDefinitions, rewardColumns, valueLabels, type ReportColumn, type ReportKind, type ReferralTab } from '@/features/operational-reports/report-config';

export interface OperationalFilters {
  account: string; stationId: string; stationMasterId: string; from: string; to: string; dateField: string;
  keyword: string; status: string; type: string; accountType: string; direction: string;
  deltaMin: string; deltaMax: string; balanceMin: string; balanceMax: string; amountMin: string; amountMax: string;
  projectId: string; issueCode: string; lotteryId: string; playId: string; winLoss: string;
  drawStatus: string; participationStatus: string; reversal: string;
  beforeLevel: string; afterLevel: string; referralLevel: string; sourceMember: string;
  vipMode: 'upgrades' | 'all'; referralTab: ReferralTab;
}
export const emptyOperationalFilters: OperationalFilters = { account: '', stationId: '', stationMasterId: '', from: '', to: '', dateField: 'createdAt',
  keyword: '', status: '', type: '', accountType: '', direction: '', deltaMin: '', deltaMax: '', balanceMin: '', balanceMax: '', amountMin: '', amountMax: '',
  projectId: '', issueCode: '', lotteryId: '', playId: '', winLoss: '', drawStatus:'', participationStatus:'', reversal:'', beforeLevel: '', afterLevel: '', referralLevel: '', sourceMember: '', vipMode: 'upgrades', referralTab: 'relations' };
export interface ReportMetric { label: string; value: string; detail: string; }
export interface OperationalReportResult { rows: Row[]; sourceRows: Row[]; columns: ReportColumn[]; metrics: ReportMetric[]; asOf: string; }

export function reportDate(value: unknown): string {
  if (!value) return '未记录';
  const timestamp = new Date(String(value)).getTime();
  return Number.isFinite(timestamp) ? new Date(timestamp + 8 * 3600000).toISOString().slice(0, 19).replace('T', ' ') : '未记录';
}
export function reportValue(column: ReportColumn, row: Row): string {
  const value = row[column.key];
  if (value === null || value === undefined || value === '') {
    if (['due', 'profit', 'pending'].includes(column.key)) return row.valueState || '待结算';
    if (column.key === 'postedAt') return '尚未发放';
    return '未记录';
  }
  if (column.format === 'time') return reportDate(value);
  if (column.format === 'money') return Number.isFinite(Number(value))?money(cents(value)):'未记录';
  if (column.format === 'rate') return `${(Number(value) * 100).toFixed(2)}%`;
  if (['accountType', 'bucket'].includes(column.key)) return ({AVAILABLE:'积分账户·可用积分',RESERVED:'积分账户·冻结积分',AI_QUOTA:'AI合买日额度'} as Record<string,string>)[String(value)] || String(value);
  return column.format === 'status' ? valueLabels[String(value)] || String(value) : String(value);
}
function operatorName(tx: Row): string {
  if (tx.operatorRealm === 'SYSTEM') return '系统（演示）';
  return state.employees.find((m: Row) => m.id === tx.operatorId)?.name || state.stationMasters.find((m: Row) => m.id === tx.operatorId)?.name || (tx.operatorId ? `历史操作人 ${tx.operatorId}` : '未记录');
}
function rootTransaction(tx: Row): Row {
  return tx.referenceTransactionId ? state.ledgers.find((r: Row) => r.id === tx.referenceTransactionId) || tx : tx;
}
function transactionSource(tx: Row): { name: string; href: string | null } {
  const source = rootTransaction(tx);
  if (source.sourceType === 'AI_POOL') return { name: `AI合买 ${source.issueCode || ''}`, href: `/ai-pools/${source.sourceId}` };
  if (source.sourceType === 'ORDINARY_ORDER') return { name: '普通投注订单', href: `/orders/${source.sourceId}` };
  if (source.sourceType === 'REFERRAL_REWARD') return { name: '会员推广奖励', href: '/reports/referrals' };
  if (source.type?.startsWith('STATION_')) return { name: '站长会员积分调整', href: '/finance/recharge-withdrawals' };
  return { name: source.sourceType || '历史业务未记录', href: null };
}
function changeRows(): Row[] {
  const rows: Row[] = [];
  for (const tx of state.ledgers as Row[]) for (const entry of tx.entries as Row[]) {
    if (entry.ownerType !== 'MEMBER') continue;
    const member = state.members.find((m: Row) => m.id === entry.ownerId), source = transactionSource(tx), root = rootTransaction(tx);
    rows.push({ id: `${tx.id}:${entry.id}`, memberId: entry.ownerId, memberAccount: entry.ownerAccount || member?.account || '历史账号未记录',
      memberName: entry.ownerName || member?.displayName || '', stationId: tx.stationId, stationName: tx.stationName || '未记录',
      stationMasterId: tx.stationMasterId, stationMasterName: tx.stationMasterName || '未记录',
      delta: entry.changePoints, amount: money(Math.abs(cents(entry.changePoints))), before: entry.balanceBefore, after: entry.balanceAfter,
      accountType: entry.bucket, type: tx.type, createdAt: tx.createdAt, businessNumber: tx.businessNumber, operatorName: operatorName(tx),
      sourceName: source.name, sourceHref: source.href, remark: tx.reason, operation: cents(entry.changePoints) < 0 ? '减分' : '加分',
      reversal: tx.referenceTransactionId ? '冲正记录' : cents(tx.reversedPoints) ? '原单·有冲正' : '原始记录',
      rootType: root.type, transaction: tx, entry, finance: ['STATION_VIP_CREDIT', 'STATION_DEBIT'].includes(root.type) && entry.bucket === 'AVAILABLE' });
  }
  for (const q of state.reportFacts.quotaEvents as Row[]) {
    rows.push({ ...q, accountType: 'AI_QUOTA', businessNumber: q.subscriptionId, delta: q.delta, before: q.before, after: q.after,
      operatorName: '系统（演示）', sourceName: `AI认购·额度日 ${q.businessDate}`, sourceHref: `/ai-pools/${q.poolIssueId}`,
      remark: q.reason, amount: money(Math.abs(cents(q.delta))) });
  }
  return rows;
}

function aiRows(): Row[] {
  const groups = new Map<string, Row[]>();
  for (const sub of state.subscriptions as Row[]) {
    const key = `${sub.poolIssueId}:${sub.memberId}`;
    groups.set(key, [...(groups.get(key) || []), sub]);
  }
  return [...groups.entries()].map(([id, unsorted]) => {
    const subs = [...unsorted].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), first = subs[0];
    const pool = state.pools.find((p: Row) => p.id === first.poolIssueId), active = subs.filter(s => s.status !== 'REFUNDED');
    const purchase = active.reduce((n, s) => n + cents(s.points), 0), refund = subs.filter(s => s.status === 'REFUNDED').reduce((n, s) => n + cents(s.points), 0);
    const batches = state.payouts.filter((b: Row) => b.poolIssueId === pool.id), items = batches.flatMap((b: Row) => (b.items || []).filter((i: Row) => i.memberId === first.memberId));
    const posted = items.reduce((n: number, item: Row) => n + cents(item.postedPoints), 0);
    let due = aiMemberAmounts(state,pool).find(r=>r.memberId===first.memberId)?.due ?? (pool.userWinningPoints===null?null:0);
    if (items.length) due = items.reduce((n: number, item: Row) => n + cents(item.duePoints), 0);
    const payoutTimes = items.filter((r: Row) => cents(r.postedPoints) && r.postedAt).map((r: Row) => r.postedAt).sort();
    const final = pool.status === 'SETTLED' && due !== null && posted >= due;
    const draw = pool.totalWinningPoints !== null || state.allocations.some((a: Row) => a.poolIssueId === pool.id && a.drawVersion);
    return { id, ...first, subscriptions: subs, pool, batches, payoutItems: items,
      projectId: pool.projectId, projectName: state.projects.find((p: Row) => p.id === pool.projectId)?.name || '未记录', issueCode: pool.issueCode,
      purchase: money(purchase), refundPoints: money(refund), participationCount: subs.length, lastParticipationAt: subs.at(-1)?.createdAt,
      postedAt: payoutTimes.at(-1) || null, drawStatus: draw ? '已开奖' : '未开奖', posted: money(posted), due: due === null ? null : money(due),
      pending: due === null ? null : money(Math.max(due - posted, 0)), profit: final ? money(posted - purchase) : null,
      participationStatus: active.length ? pool.status === 'SETTLED' ? 'SETTLED' : pool.status === 'OPEN' ? 'RESERVED' : 'LOCKED' : 'REFUNDED',
      status: pool.status, valueState: draw ? '待完成结算' : '待开奖', sourceHref: `/ai-pools/${pool.id}` };
  });
}

function rewardRows(): Row[] {
  return state.reportFacts.referralRewards.map((r: Row) => ({ ...r, pending: money(Math.max(cents(r.targetDue) - cents(r.posted), 0)),
    status: cents(r.targetDue) === 0 && cents(r.posted) === 0 ? 'ZERO' : r.status,
    sourceHref: r.sourceKind === 'AI_POOL' ? `/ai-pools/${r.sourceId}` : `/members/${r.sourceMemberId}` }));
}
export function directMembers(memberId: string): Row[] {
  const parent = state.members.find((m: Row) => m.id === memberId), policy = state.referral.levels.find((l: Row) => l.name === parent?.referralName) || state.referral.levels[0];
  return state.members.filter((m: Row) => m.scope.referrerMember?.id === memberId).map((m: Row) => {
    const rewards = rewardRows().filter(r => r.memberId === memberId && r.sourceMemberId === m.id);
    return { ...memberSnapshot(state, m.id), boundAt: state.reportFacts.bindings[m.id] || null, vipName: m.vipName,
      qualifiedPoints: m.qualifiedRechargePoints, threshold: policy.validRechargePoints,
      eligible: m.status === 'ENABLED' && cents(m.qualifiedRechargePoints) >= cents(policy.validRechargePoints),
      posted: money(rewards.reduce((n, r) => n + cents(r.posted), 0)), status: m.status };
  });
}
function relationRows(): Row[] {
  const rewards = rewardRows();
  return state.members.map((m: Row) => {
    const children = directMembers(m.id), r = rewards.filter(r => r.memberId === m.id);
    return { id: m.id, ...memberSnapshot(state, m.id), level: m.referralName, directCount: children.length, validCount: children.filter(c => c.eligible).length,
      fixedPosted: money(r.filter(x => x.type === 'FIXED_REFERRAL').reduce((n, x) => n + cents(x.posted), 0)),
      aiPosted: money(r.filter(x => x.type === 'AI_REFERRAL_SHARE').reduce((n, x) => n + cents(x.posted), 0)),
      posted: money(r.reduce((n, x) => n + cents(x.posted), 0)), targetDue: money(r.reduce((n, x) => n + cents(x.targetDue), 0)),
      pending: money(r.reduce((n, x) => n + cents(x.pending), 0)), children, rewards: r,
      createdAt: children.map(c => c.boundAt).filter(Boolean).sort().at(-1) || null };
  });
}
function betRows(): Row[] {
  return state.orders.filter((o: Row) => o.type === 'ORDINARY').map((o: Row) => {
    const member = state.members.find((m: Row) => m.id === o.memberId), lottery = state.catalog.lotteries.find((l: Row) => l.id === o.lotteryId);
    const effectivePosted = cents(o.netPostedAwardPoints) - (o.refund && !o.reportRefundNetted ? cents(o.refund.recoveredAwardPoints) : 0);
    const posted = Math.max(effectivePosted, 0), final = isFinalOrder(o), profit = final ? money(posted - cents(o.purchasePoints)) : null;
    return { ...o, memberAccount: o.memberAccount || member?.account || '未记录', memberName: o.memberName || member?.displayName,
      stationName: o.stationName || state.stations.find((r: Row) => r.id === o.stationId)?.name || '未记录',
      stationMasterName: o.stationMasterName || state.stationMasters.find((r: Row) => r.id === o.stationMasterId)?.name || '未记录',
      businessNumber: o.id, lotteryName: lottery?.name || '未记录', playName: lottery?.plays.find((p: Row) => p.id === o.playId)?.name || '未记录',
      purchase: o.purchasePoints, due: o.dueAwardPoints, posted: money(posted), profit, effective: final,
      drawStatus: o.drawNumbers || o.dueAwardPoints !== null ? '已开奖' : '待开奖',
      valueState: cents(o.refundPoints) ? '已退款·不计输赢' : '待完成结算',
      winLoss: !final ? 'PENDING' : cents(profit) > 0 ? 'WIN' : cents(profit) < 0 ? 'LOSS' : 'EVEN', sourceHref: `/orders/${o.id}` };
  });
}
function shanghaiInput(value: string): number { return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}+08:00`).getTime(); }
function timeMatches(value: unknown, filters: OperationalFilters): boolean {
  if (!filters.from && !filters.to) return true;
  if (!value) return false;
  const time = new Date(String(value)).getTime(), from = filters.from ? shanghaiInput(filters.from) : -Infinity;
  const to = filters.to ? shanghaiInput(filters.to) + 999 : Infinity;
  return Number.isFinite(time) && time >= from && time <= to;
}
function range(value: unknown, min: string, max: string): boolean {
  if (!min && !max) return true;
  if (value === null || value === undefined) return false;
  return (!min || cents(value) >= cents(min)) && (!max || cents(value) <= cents(max));
}
export function validateOperationalFilters(f: OperationalFilters): string | null {
  if (f.from && !Number.isFinite(shanghaiInput(f.from)) || f.to && !Number.isFinite(shanghaiInput(f.to))) return '请输入有效的起止时间。';
  if (f.from && f.to && shanghaiInput(f.from) > shanghaiInput(f.to)) return '开始时间不能晚于结束时间。';
  for (const [min, max, name] of [[f.deltaMin, f.deltaMax, '变动额'], [f.balanceMin, f.balanceMax, '变动后额度'], [f.amountMin, f.amountMax, '金额']]) {
    if ([min, max].some(v => v && !/^-?\d+(\.\d{1,2})?$/.test(v))) return `${name}最多填写两位小数。`;
    if (min && max && cents(min) > cents(max)) return `${name}下限不能大于上限。`;
  }
  return null;
}
function matches(row: Row, kind: ReportKind, f: OperationalFilters): boolean {
  if (f.account && !`${row.memberAccount} ${row.memberName || ''}`.toLowerCase().includes(f.account.trim().toLowerCase())) return false;
  for (const key of ['stationId', 'stationMasterId', 'status', 'type', 'accountType', 'projectId', 'lotteryId', 'playId', 'winLoss', 'drawStatus','participationStatus','reversal','beforeLevel', 'afterLevel'] as const) if (f[key] && row[key] !== f[key]) return false;
  if (f.issueCode && !String(row.issueCode || '').includes(f.issueCode.trim())) return false;
  if (f.referralLevel && row.level !== f.referralLevel) return false;
  if (f.sourceMember && !String(row.sourceMemberAccount || '').toLowerCase().includes(f.sourceMember.trim().toLowerCase())) return false;
  if (f.direction && (f.direction === 'CREDIT' ? cents(row.delta) < 0 : cents(row.delta) >= 0)) return false;
  if (!range(row.delta, f.deltaMin, f.deltaMax) || !range(row.after, f.balanceMin, f.balanceMax) || !range(row.amount ?? row.purchase ?? row.targetDue, f.amountMin, f.amountMax)) return false;
  if (f.keyword && !Object.values(row).filter(v => typeof v === 'string' || typeof v === 'number').join(' ').toLowerCase().includes(f.keyword.trim().toLowerCase())) return false;
  if (kind === 'vip' && f.vipMode === 'upgrades' && row.status !== 'UPGRADE') return false;
  if (kind === 'ai' && f.dateField === 'createdAt') return row.subscriptions.some((s: Row) => timeMatches(s.createdAt, f));
  if (kind === 'referrals' && f.referralTab === 'relations') return (!f.from && !f.to) || row.children.some((s: Row) => timeMatches(s.boundAt, f));
  return timeMatches(row[f.dateField], f);
}
function metricsFor(kind: ReportKind, rows: Row[], f: OperationalFilters): ReportMetric[] {
  const sum = (key: string, list = rows) => money(list.reduce((n, r) => n + cents(r[key]), 0));
  const metric = (label: string, value: string, detail = '当前筛选全部记录') => ({ label, value, detail });
  const count = new Set(rows.map(r => r.memberId)).size;
  if (kind === 'finance') return [metric('加分净额', sum('delta', rows.filter(r => r.rootType === 'STATION_VIP_CREDIT'))),
    metric('减分净额', money(-cents(sum('delta', rows.filter(r => r.rootType === 'STATION_DEBIT'))))), metric('净变动', sum('delta')), metric('涉及会员数', String(count))];
  if (kind === 'changes') {
    const wallet = rows.filter(r => r.accountType !== 'AI_QUOTA'), quota = rows.filter(r => r.accountType === 'AI_QUOTA');
    return [metric('积分收入', sum('delta', wallet.filter(r => cents(r.delta) > 0))), metric('积分支出', money(-cents(sum('delta', wallet.filter(r => cents(r.delta) < 0))))),
      metric('积分净变动', sum('delta', wallet)), metric('日额度占用', money(-cents(sum('delta', quota.filter(r => cents(r.delta) < 0))))), metric('日额度释放', sum('delta', quota.filter(r => cents(r.delta) > 0))), metric('账变笔数', String(rows.length))];
  }
  if (kind === 'ai') return [metric('参与会员数', String(count)), metric('参与积分', sum('purchase')), metric('已到账返还', sum('posted')), metric('待到账积分', sum('pending'), '已形成应返的未到账部分')];
  if (kind === 'referrals') return [metric(f.referralTab === 'relations' ? '推广会员数' : '来源会员数', f.referralTab === 'relations' ? String(rows.reduce((n, r) => n + r.directCount, 0)) : String(new Set(rows.map(r => r.sourceMemberId)).size)),
    metric('应发奖励净额', sum('targetDue')), metric('已发奖励净额', sum('posted')), metric('待发奖励', sum('pending'))];
  if (kind === 'vip') {
    const upgrades = rows.filter(r => r.status === 'UPGRADE');
    return [metric('升级会员数', String(new Set(upgrades.map(r => r.memberId)).size)), metric('升级次数', String(upgrades.length)), metric('跨级次数', String(upgrades.filter(r => r.afterNo - r.beforeNo > 1).length)),
      metric('升级增加AI基础日额度', money(upgrades.reduce((n, r) => n + cents(r.afterQuota) - cents(r.beforeQuota), 0)))];
  }
  const closed = rows.filter(r => r.effective);
  return [metric('有效投注积分', sum('purchase', closed), '已结算且未退款'), metric('已到账返还', sum('posted')), metric('已结算净输赢', sum('profit', closed)),
    metric('待结算订单数', String(rows.filter(r => !r.effective && !['CANCELLED', 'CANCELLING'].includes(r.status)).length))];
}

export function queryOperationalReport(kind: ReportKind, filters: OperationalFilters): OperationalReportResult {
  let sourceRows: Row[];
  if (kind === 'finance' || kind === 'changes') sourceRows = changeRows().filter(r => kind === 'changes' || r.finance);
  else if (kind === 'ai') sourceRows = aiRows();
  else if (kind === 'referrals') sourceRows = filters.referralTab === 'relations' ? relationRows() : rewardRows();
  else if (kind === 'vip') sourceRows = state.reportFacts.qualificationChanges.map((r: Row) => ({ ...r, amount:r.qualifiedPoints, status: r.afterNo > r.beforeNo ? 'UPGRADE' : r.afterNo < r.beforeNo ? 'DOWNGRADE' : 'REBUILD' }));
  else sourceRows = betRows();
  const rows = sourceRows.filter(r => matches(r, kind, filters)).sort((a, b) => new Date(b[filters.dateField] || 0).getTime() - new Date(a[filters.dateField] || 0).getTime() || a.id.localeCompare(b.id));
  return { rows, sourceRows, columns: kind === 'referrals' && filters.referralTab === 'rewards' ? rewardColumns : reportDefinitions[kind].columns,
    metrics: metricsFor(kind, rows, filters), asOf: new Date().toISOString() };
}
export function operationalExportRows(result: OperationalReportResult): string[][] {
  return [result.columns.map(c => c.label), ...result.rows.map(r => result.columns.map(c => reportValue(c, r)))];
}
