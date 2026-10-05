import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { state, persist } from '../src/demo/state';
import { createSeed, type Row } from '../src/demo/seed';
import { cents, ensureOperationalState, floorRate, aiMemberAmounts } from '../src/demo/operational-records';
import { emptyOperationalFilters as base, operationalExportRows, queryOperationalReport as query, reportDate, reportValue, validateOperationalFilters } from '../src/demo/operational-reports';
import { aiAction } from '../src/demo/ai';
import { businessAction } from '../src/demo/business';
import { reportFile } from '../src/demo/export-file';
import { operationalChanges } from '../src/features/operational-reports/report-notes';
import { reportDefinitions, type ReportKind } from '../src/features/operational-reports/report-config';

let checked = 0;
const snapshot = structuredClone(state);
function reset() { for (const key of Object.keys(state)) delete state[key]; Object.assign(state, structuredClone(snapshot)); }
function check(name: string, fn: () => void) { reset(); fn(); checked++; console.log(`PASS ${name}`); }
globalThis.fetch = (() => { throw new Error('Business network forbidden'); }) as typeof fetch;

check('六个报表、说明及超过10条明细', () => {
  for (const kind of ['finance', 'changes', 'ai', 'referrals', 'vip', 'bets'] as ReportKind[]) {
    assert.equal(operationalChanges[kind].name, reportDefinitions[kind].name);
    assert(operationalChanges[kind].functions?.length);
    assert(query(kind, base).rows.length > 10);
  }
});
check('加减分净额与冲正只计一次', () => {
  const r = query('finance', base);
  assert.equal(r.rows.length, 48); assert.deepEqual(r.metrics.map(m => m.value), ['13440.00', '1440.00', '12000.00', '12']);
  assert(r.rows.every(row => row.entry.ownerType === 'MEMBER' && row.accountType === 'AVAILABLE'));
  assert(!r.rows.some(row => row.rootType === 'ADMIN_GRANT'));
});
check('所有演示交易分录平衡且前后数值正确', () => {
  for (const tx of state.ledgers as Row[]) {
    assert.equal(tx.entries.reduce((n: number, e: Row) => n + cents(e.changePoints), 0), 0, tx.id);
    for (const e of tx.entries) assert.equal(cents(e.balanceBefore) + cents(e.changePoints), cents(e.balanceAfter), e.id);
  }
});
check('帐变全部必需字段组合筛选、冻结账户与额度分开', () => {
  const rows = query('changes', { ...base, account: 'member_demo_01', stationId: 'demo-station-1', stationMasterId: 'demo-station-master-1', accountType: 'AVAILABLE', type: 'STATION_DEBIT', deltaMin: '-120', deltaMax: '-120', balanceMin: '1000', balanceMax: '1000' }).rows;
  assert.equal(rows.length, 1); assert.equal(rows[0].after, '1000.00');
  assert(query('changes', { ...base, accountType: 'RESERVED' }).rows.length > 10);
  const quota = query('changes', { ...base, accountType: 'AI_QUOTA' });
  assert.equal(quota.metrics[0].value, '0.00'); assert.equal(quota.metrics[3].value, '5025.00'); assert.equal(quota.metrics[4].value, '25.00');
});
check('北京时间精确秒区间及非法筛选', () => {
  assert.equal(query('finance', { ...base, from: '2026-09-25T10:12:01', to: '2026-09-25T10:12:01' }).rows.length, 12);
  assert.equal(query('finance', { ...base, from: '2026-09-25T10:12:02', to: '2026-09-25T10:12:02' }).rows.length, 0);
  assert.equal(reportDate('2026-10-03T02:12:34Z'), '2026-10-03 10:12:34');
  assert(validateOperationalFilters({ ...base, from: '2026-10-03T12:00:00', to: '2026-10-03T11:00:00' }));
  assert(validateOperationalFilters({ ...base, deltaMin: '2', deltaMax: '1' }));
  assert(validateOperationalFilters({ ...base, amountMin: '1.111' }));
});
check('AI多次认购合并、待开奖与净收益', () => {
  const r = query('ai', base), settled = r.rows.filter(row => row.pool.id === 'demo-pool-4');
  assert.equal(settled.length, 10); assert.equal(settled.reduce((n, row) => n + cents(row.posted), 0), 110000);
  assert.equal(settled.reduce((n, row) => n + cents(row.profit), 0), 10000);
  const first = settled.find(row => row.memberId === 'demo-member-1')!; assert.equal(first.participationCount, 2); assert.equal(first.purchase, '100.00');
  const open = r.rows.find(row => row.pool.id === 'demo-pool-1')!;
  assert.equal(open.due, null); assert.equal(open.profit, null); assert.equal(reportValue({ key: 'due', label: '', format: 'money' }, open), '待开奖');
  const later = query('ai', { ...base, from: first.lastParticipationAt.slice(0, 19), to: first.lastParticipationAt.slice(0, 19) }).rows;
  assert(later.some(row => row.id === first.id && row.purchase === '100.00'));
});
check('AI部分到账、重试补差且不重复发放', () => {
  const before = query('ai', base).rows.filter(row => row.pool.id === 'demo-pool-5');
  assert.equal(before.reduce((n, row) => n + cents(row.posted), 0), 27500);
  assert.equal(before.reduce((n, row) => n + cents(row.pending), 0), 82500);
  const ledgers = state.ledgers.length;
  aiAction('/payout-batches/report-payout-partial/retries', 'POST', {}, {});
  const after = query('ai', base).rows.filter(row => row.pool.id === 'demo-pool-5');
  assert.equal(after.reduce((n, row) => n + cents(row.posted), 0), 110000);
  assert(after.every(row => row.pending === '0.00' && row.profit === '10.00'));
  const generated = state.ledgers.slice(0, state.ledgers.length - ledgers);
  assert.equal(generated.reduce((n: number, tx: Row) => n + cents(tx.economicPoints), 0), 82500);
  aiAction('/payout-batches/report-payout-partial/retries', 'POST', {}, {}); assert.equal(state.ledgers.length, ledgers + generated.length);
});
check('AI按实际会员认购发放而非默认截取名单', () => {
  const pool = state.pools[0], extra = { ...structuredClone(state.subscriptions[0]), id: 'extra-member-sub', memberId: 'demo-member-12', memberAccount: 'member_demo_12', points: '100.00' };
  state.subscriptions.push(extra); pool.userPurchasePoints = '1100.00'; pool.totalPurchasePoints = '3100.00';
  const policyVersion = state.referral.aiSharePolicyVersion;
  aiAction(`/ai-pools/${pool.id}/funding-closure`, 'POST', {}, {});
  state.referral.aiSharePolicyVersion = 'later-policy';
  aiAction(`/ai-pools/${pool.id}/quick-settlement`, 'POST', {}, {});
  const batch = state.payouts.find((p: Row) => p.poolIssueId === pool.id);
  assert.equal(batch.items.length, 11); assert(batch.items.some((r: Row) => r.memberId === 'demo-member-12'));
  assert.equal(batch.postedPoints, '1210.00');
  assert(state.reportFacts.referralRewards.filter((r: Row) => r.sourceId === pool.id).every((r: Row) => r.policyVersion === policyVersion));
});
check('推广比例与AI尾差按分精确计算',()=>{
  assert.equal(floorRate(1400,'0.29'),406);
  const pool=state.pools[0];pool.userWinningPoints='1000.01';
  const amounts=aiMemberAmounts(state,pool);assert.equal(amounts.reduce((n,r)=>n+r.due,0),100001);
});
check('推广名单、有效门槛、奖励净额和历史快照', () => {
  const parent = query('referrals', base).rows.find(r => r.memberId === 'demo-member-1')!;
  assert.equal(parent.directCount, 11); assert.equal(parent.validCount, 10);
  const r = query('referrals', { ...base, referralTab: 'rewards' }).rows;
  assert(r.some(row => row.status === 'ZERO')); assert(r.some(row => row.status === 'PENDING_BUDGET'));
  const recovered = r.find(row => cents(row.recovered) > 0)!;
  assert.equal(recovered.posted, '8.00'); assert.equal(recovered.pending, '0.00');
  const historical = structuredClone(r.find(row => row.sourceMemberId === 'demo-member-2'));
  businessAction('/members/demo-member-2/membership-migrations', 'POST', { referrerMemberId: 'demo-member-3', targetStationId: 'demo-station-2', targetStationMasterId: 'demo-station-master-2' }, {});
  assert.equal(query('referrals', base).rows.find(row => row.memberId === 'demo-member-1')!.directCount, 10);
  assert.deepEqual(query('referrals', { ...base, referralTab: 'rewards' }).rows.find(row => row.id === historical.id), historical);
});
check('VIP默认升级、跨级、降级与规则重算留痕', () => {
  assert.equal(query('vip', base).rows.length, 24); assert.equal(query('vip', { ...base, vipMode: 'all' }).rows.length, 25);
  const m = state.members[1], tx = state.ledgers.find((tx: Row) => tx.id === 'demo-transaction-2');
  businessAction('/ledger-reversals', 'POST', { originalTransactionId: tx.id, points: '100.00', reason: '测试有效加分冲正' }, {});
  assert.equal(m.qualifiedRechargePoints, '2900.00'); assert.equal(m.vipName, 'VIP3');
  assert(query('vip', { ...base, vipMode: 'all' }).rows.some(row => row.memberId === m.id && row.status === 'DOWNGRADE' && row.reason === '有效站长加分冲正'));
});
check('部分冲正数额、前后余额及原单关联', () => {
  const tx = state.ledgers.find((r: Row) => r.id === 'demo-transaction-1');
  businessAction('/ledger-reversals', 'POST', { originalTransactionId: tx.id, points: '25.00', reason: '测试部分冲正' }, {});
  const reversal = state.ledgers[0]; assert.equal(reversal.economicPoints, '25.00'); assert.equal(reversal.referenceTransactionId, tx.id);
  assert.equal(reversal.entries.find((e: Row) => e.ownerType === 'MEMBER').changePoints, '-25.00');
  for (const e of reversal.entries) assert.equal(cents(e.balanceBefore) + cents(e.changePoints), cents(e.balanceAfter));
  assert.equal(query('finance', base).metrics[2].value, '11975.00');
});
check('普通投注输赢排除未结算和退款，结算恢复留痕', () => {
  const r = query('bets', base);
  assert(r.rows.some(row => row.profit === '-20.00')); assert(r.rows.some(row => row.profit === '50.00'));
  assert(r.rows.filter(row => row.status === 'CANCELLED').every(row => row.profit === null && row.refund && row.posted === '0.00'));
  assert(r.rows.filter(row => row.status === 'WAITING_DRAW').every(row => row.profit === null));
  const order = state.orders[0]; businessAction(`/ordinary-orders/${order.id}/settlement-retries`, 'POST', { reason: '测试恢复结算' }, {});
  const after = query('bets', base).rows.find(row => row.id === order.id)!;
  assert.equal(after.profit, '30.00'); assert(after.settledAt); assert(after.settlementHistory.at(-1).ledgerTransactionId);
});
check('汇总和中文导出始终覆盖完整筛选结果', () => {
  const r = query('changes', { ...base, stationId: 'demo-station-1' }), rows = operationalExportRows(r);
  assert(r.rows.length > 10); assert.equal(rows.length, r.rows.length + 1);
  assert(rows[0].includes('变动后额度')); assert(rows[0].includes('会员账号'));
  assert.equal(query('changes', { ...base, stationId: 'demo-station-1' }).metrics[5].value, String(r.rows.length));
});
check('旧浏览器数据迁移保留数据，未知历史不填0，迁移幂等', () => {
  const old = createSeed(), accounts = old.members.map((m: Row) => m.account), oldLedgerCount = old.ledgers.length;
  old.payouts[0].items=old.members.slice(0,10).map((m:Row)=>({maskedBeneficiary:m.displayName,duePoints:'110.00',postedPoints:'110.00',status:'POSTED',transactionId:null}));
  old.members[0].customNote = '保留自定义内容'; ensureOperationalState(old, false);
  assert.deepEqual(old.members.map((m: Row) => m.account), accounts); assert.equal(old.members[0].customNote, '保留自定义内容');
  assert.equal(old.ledgers.length, oldLedgerCount); assert.equal(old.reportFacts.qualificationChanges.length, 0);
  assert(old.reportFacts.quotaEvents.every((r: Row) => r.before === null && r.after === null));
  assert(old.payouts[0].items.every((r:Row)=>r.memberId&&r.postedAt));assert.equal(old.subscriptions[0].stationName,'未记录');assert.equal(old.subscriptions[0].referrerSnapshot,null);
  const count = old.subscriptions.length; ensureOperationalState(old, false); assert.equal(old.subscriptions.length, count);
  persist();
});
const exportResult = query('bets', base);
const csv = await reportFile(operationalExportRows(exportResult), 'CSV').text();
assert(csv.includes('会员账号') && csv.includes('输赢值'));
const xlsx = new Uint8Array(await reportFile(operationalExportRows(exportResult), 'XLSX').arrayBuffer());
assert.equal(xlsx[0], 0x50); assert.equal(xlsx[1], 0x4b); checked++;
writeFileSync('.local/report-export-check.csv',csv);
writeFileSync('.local/report-export-check.xlsx',xlsx);
console.log(`${checked} targeted checks passed; business network forbidden.`);
