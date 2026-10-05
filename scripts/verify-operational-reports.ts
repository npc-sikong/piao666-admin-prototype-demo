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
import { managementDefinitions } from '../src/features/operational-reports/management-definitions';
import { ensureManagementFacts } from '../src/demo/management-records';
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
check('五个新增报表和已有AI经营报表共用说明与真实组成记录',()=>{
  for(const kind of Object.keys(managementDefinitions) as ReportKind[]){const r=query(kind,base);assert(r.rows.length>0,kind);assert.equal(operationalExportRows(r).length,r.rows.length+1);}
  assert(query('daily',base).rows.length>10);assert(query('budgetFlows',base).rows.length>10);
});
check('经营日报业务日、积分口径与跨日会员去重',()=>{
  const r=query('daily',base),m=Object.fromEntries(r.metrics.map(m=>[m.label,m.value]));
  assert.equal(m['会员加分净额'],'13440.00');assert.equal(m['普通有效投注'],'180.00');assert.equal(m['AI净参与积分'],'5000.00');assert.equal(m['期间参与会员数'],'12');
  assert.equal(query('daily',{...base,from:'2026-09-25T10:12:01',to:'2026-09-25T10:12:01'}).metrics[1].value,'3840.00');
  assert.equal(query('daily',{...base,from:'2026-09-25T10:12:02',to:'2026-09-25T10:12:02'}).rows.length,0);
});
check('站点站长切换和归属迁移保留历史业务',()=>{
  assert.equal(query('stationBusiness',base).rows.length,6);assert.equal(query('stationBusiness',{...base,groupBy:'station'}).rows.length,3);
  const filter={...base,groupBy:'station'},before=query('stationBusiness',filter).rows.find(r=>r.id==='demo-station-1')!;
  businessAction('/members/demo-member-1/membership-migrations','POST',{targetStationId:'demo-station-2',targetStationMasterId:'demo-station-master-2'},{});
  const after=query('stationBusiness',filter).rows.find(r=>r.id===before.id)!;assert.equal(after.memberCount,before.memberCount-1);assert.equal(after.granted,before.granted);
});
check('预算审批、主账户流水、旧面板汇总和重复复核联动',()=>{
  const batch=state.budgetBatches[0],filter={...base,ownerType:'PLATFORM',budgetType:'DISTRIBUTION_BUDGET',type:'PLATFORM_BUDGET_TOPUP'};
  assert.equal(query('budgetFlows',filter).rows.length,0);const balance=state.budgets[0].availablePoints,ledgerCount=state.ledgers.length;
  businessAction(`/platform-budget-batches/${batch.id}/reviews`,'POST',{decision:'APPROVE',reason:'测试独立复核'},{});
  assert.equal(cents(state.budgets[0].availablePoints)-cents(balance),5000000);assert.equal(query('budgetFlows',filter).rows.length,1);assert.equal(query('budgetFlows',filter).rows[0].delta,'50000.00');
  businessAction(`/platform-budget-batches/${batch.id}/reviews`,'POST',{decision:'APPROVE',reason:'重复'},{});assert.equal(state.ledgers.length,ledgerCount+1);
  const old=businessAction('/platform-budget-flows','GET',{}, {period:'REALTIME'}).rows.find((r:Row)=>r.category==='DISTRIBUTION_BUDGET');assert.equal(old.inflowPoints,'50000.00');
  assert.equal(query('exceptions',{...base,type:'BUDGET_REVIEW'}).rows.length,0);assert.equal(query('budgetFlows',{...base,budgetMode:'snapshot'}).rows.length,10);
});
check('实际分录对账保存一致、差异、缺失三个状态，旧快照不回写',()=>{
  const first=businessAction('/reconciliations','POST',{},{}),id=first.statusUrl.split('/').at(-1),old=structuredClone(state.reconciliations[id]);assert.equal(old.status,'MATCHED');
  const e=state.ledgers[0].entries[0],after=e.balanceAfter;e.balanceAfter=(Number(after)+10).toFixed(2);
  businessAction('/reconciliations','POST',{},{});assert(query('reconciliations',base).rows.some(r=>r.status==='MISMATCHED'&&r.difference==='10.00'));assert.deepEqual(state.reconciliations[id],old);
  const delta=e.changePoints;e.changePoints=(Number(delta)+10).toFixed(2);
  const task=businessAction('/reconciliations','POST',{},{}),mismatchId=task.statusUrl.split('/').at(-1);
  assert.equal(state.reconciliations[mismatchId].differencePoints,'0.00');assert.equal(query('exceptions',base).rows.find(r=>r.id===`recon:${mismatchId}`)!.amount,'10.00');
  e.changePoints=delta;
  e.balanceAfter=after;e.balanceBefore=null;businessAction('/reconciliations','POST',{},{});assert(query('reconciliations',base).rows.some(r=>r.status==='INCOMPLETE'&&r.missingCount===1));
});
check('异常待办排除正常待开奖，合买部分到账不重复计，处理后自动更新',()=>{
  const r=query('exceptions',base);assert(!r.rows.some(r=>r.status==='WAITING_DRAW'||r.status==='OPEN'));const ai=r.rows.filter(r=>r.type==='AI_BACKLOG'&&r.issueCode===state.pools[4].issueCode);assert.equal(ai.length,1);assert.equal(ai[0].pending,'825.00');
  assert(query('exceptions',{...base,priority:'P1'}).rows.every(r=>r.type==='RECON_BACKLOG'));
  aiAction('/payout-batches/report-payout-partial/retries','POST',{},{});assert(!query('exceptions',base).rows.some(r=>r.id===ai[0].id));
});
check('AI经营报表开奖未知、实际对象、加权收益率和筛选正确',()=>{
  const open=query('aiBusiness',base).rows.find(r=>r.id==='demo-pool-1')!;assert.equal(open.due,null);assert.equal(open.platformProfit,null);assert.equal(open.participantCount,10);
  assert.equal(query('aiBusiness',{...base,lotteryId:open.lotteryId}).rows.find(r=>r.id===open.id)!.purchase,'1000.00');
  aiAction('/payout-batches/report-payout-partial/retries','POST',{},{});const sub=state.subscriptions.find((s:Row)=>s.poolIssueId==='demo-pool-4'&&s.status!=='REFUNDED');sub.points=(Number(sub.points)+500).toFixed(2);
  assert.equal(query('aiBusiness',base).metrics.at(-1)!.value,'-12.00%');
});
check('新增演示快照迁移不覆盖已有数据且可重复刷新',()=>{
  const old=createSeed();old.customNote='保留';old.reconciliations.custom={id:'custom',status:'MATCHED',expectedPoints:'5.00',actualPoints:'5.00'};ensureManagementFacts(old);const original=structuredClone(old);ensureManagementFacts(old);assert.deepEqual(old,original);assert.equal(old.customNote,'保留');assert.equal(old.reconciliations.custom.expectedPoints,'5.00');persist();
});
reset();
const exportResult = query('bets', base);
const csv = await reportFile(operationalExportRows(exportResult), 'CSV').text();
assert(csv.includes('会员账号') && csv.includes('输赢值'));
const xlsx = new Uint8Array(await reportFile(operationalExportRows(exportResult), 'XLSX').arrayBuffer());
assert.equal(xlsx[0], 0x50); assert.equal(xlsx[1], 0x4b); checked++;
writeFileSync('.local/report-export-check.csv',csv);
writeFileSync('.local/report-export-check.xlsx',xlsx);
console.log(`${checked} targeted checks passed; business network forbidden.`);
