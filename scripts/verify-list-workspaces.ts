import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createSeed, areasFor, type Row } from '../src/demo/seed';
import { confirmDrawEdit, drawRules, inDateRange, orderExportRows, orderPresentation, prepareDrawEdit, queryDraws, queryLedger, queryOrders, selectionText } from '../src/demo/list-workspaces';
import { reportFile } from '../src/demo/export-file';
globalThis.fetch = async () => { throw new Error('network forbidden'); };
let checked = 0;
function check(name: string, fn: () => void) { fn(); checked++; console.log('PASS ' + name); }
const valuesFor = (code: string) => Object.fromEntries(areasFor(code).map(a => [a.key, a.chosen.join(' ')]));
check('账本每笔交易仅列一次，账号与方向匹配同一分录', () => {
  const s = createSeed(); assert.equal(queryLedger(s, {}).length, 12);
  assert.equal(queryLedger(s, { account: 'member_demo_01', direction: 'DEBIT' }).length, 0);
  const rows = queryLedger(s, { account: 'member_demo_01', direction: 'CREDIT' }); assert.equal(rows.length, 1); assert.equal(rows[0].entries.length, 2);
  assert.equal(queryLedger(s, { from: '2026-10-03', to: '2026-10-03' }).length, 12);
});
check('订单彩票、玩法、下注内容和全部筛选导出使用中文', () => {
  const s = createSeed(), rows = queryOrders(s, {}), exported = orderExportRows(rows); assert.equal(rows.length, 24); assert.equal(exported.length, 25);
  const text = exported.flat().join(' '); assert(text.includes('双色球基本玩法')); assert(text.includes('红球：')); assert(text.includes('百位：')); assert(!text.includes('10000000-')); assert(!text.includes('20000000-')); assert(!text.includes('SSQ_STANDARD')); assert(!text.includes('WAITING_DRAW'));
  const lotteryId = s.catalog.lotteries[2].id, playId = s.catalog.lotteries[2].plays[0].id;
  const filtered = queryOrders(s, { lotteryId, playId, account: 'member_demo_03' }); assert(filtered.length > 0); assert(filtered.every(r => r.memberId === 'demo-member-3' && r.lotteryName === '福彩3D'));
  assert.equal(orderExportRows(filtered).length, filtered.length + 1);
});
check('下注快照含中文胆码拖码；未知名称不以内部编号替代', () => {
  assert.equal(selectionText('SSQ', { areas: [{ key: 'RED', chosen: [], dan: [1, 2], tuo: [3, 4] }] }), '红球：胆码 01 02；拖码 03 04');
  const s = createSeed(), row = orderPresentation(s, { ...s.orders[0], lotteryId: 'missing-lottery', playId: 'missing-play', selection: null }); assert.equal(row.lotteryName, '彩票名称未记录'); assert.equal(row.playName, '玩法名称未记录'); assert.equal(row.selectionText, '下注内容未记录');
});
check('当前彩种全部12期可查询，状态及日期边界正确', () => {
  const s = createSeed(); for (const l of s.catalog.lotteries) { const rows = queryDraws(s, l.id); assert.equal(rows.length, 12); assert.equal(rows.filter(r => r.status === 'DRAWN').length, 11); assert.equal(rows.filter(r => r.status === 'PENDING_REVIEW').length, 1); }
  const id = s.catalog.lotteries[0].id; assert.equal(queryDraws(s, id, { from: '2026-10-03', to: '2026-10-03' }).length, 12); assert.equal(queryDraws(s, id, { from: '2026-10-04' }).length, 0); assert.equal(queryDraws(s, id, { status: 'DRAWN' }).length, 11);
  assert(inDateRange('2026-10-03T23:59:59.999+08:00', '2026-10-03', '2026-10-03')); assert(!inDateRange('2026-10-04T00:00:00+08:00', '2026-10-03', '2026-10-03'));
});
check('八种彩种号码个数、范围、重复及特别号校验', () => {
  const s = createSeed(); for (const l of s.catalog.lotteries) { const row = queryDraws(s, l.id)[1], values = valuesFor(l.code); assert(prepareDrawEdit(s, row, values, '测试修改').areas.length > 0); const rule = drawRules(l.code)[0]; assert.throws(() => prepareDrawEdit(s, row, { ...values, [rule.key]: String(rule.max + 1) }, '测试'), /整数/); }
  const row = queryDraws(s, s.catalog.lotteries[0].id)[1]; assert.throws(() => prepareDrawEdit(s, row, { RED: '1 1 2 3 4 5', BLUE: '6' }, '测试'), /重复/); assert.throws(() => prepareDrawEdit(s, row, valuesFor('SSQ'), ''), /原因/);
  const qlc = s.catalog.lotteries.find((l: Row) => l.code === 'QLC'); assert.throws(() => prepareDrawEdit(s, queryDraws(s, qlc.id)[1], { ...valuesFor('QLC'), SPECIAL: '2' }, '测试'), /不能与基本号码重复/);
  const qxc = s.catalog.lotteries.find((l: Row) => l.code === 'QXC'); assert.equal(prepareDrawEdit(s, queryDraws(s, qxc.id)[1], { ...valuesFor('QXC'), LAST: '14' }, '测试').areas.at(-1).chosen[0], 14);
});
check('第一次提交不写入；二次确认追加版本、旧版和订单快照保持', () => {
  const s = createSeed(), row = queryDraws(s, s.catalog.lotteries[0].id)[1], old = structuredClone(row.versions), orders = structuredClone(s.orders), before = structuredClone(s);
  const intent = prepareDrawEdit(s, row, { RED: '1 2 3 4 5 6', BLUE: '16' }, '核对来源后更正'); assert.deepEqual(s, before);
  const draw = confirmDrawEdit(s, intent), current = queryDraws(s, row.lotteryId, { issueCode: row.issueCode })[0]; assert.equal(draw.version, '2'); assert.equal(current.status, 'DRAWN'); assert(current.numbers.includes('蓝球：16')); assert.equal(current.versions.length, 2); assert.deepEqual(current.versions.find(v => v.version === '1'), old[0]); assert.deepEqual(s.orders, orders); assert.equal(s.audits[0].reason, '核对来源后更正');
  const reloaded = JSON.parse(JSON.stringify(s)); assert.equal(queryDraws(reloaded, row.lotteryId, { issueCode: row.issueCode })[0].version, '2');
});
check('过期二次确认拒绝重复保存，确认时重新校验号码', () => {
  const s = createSeed(), row = queryDraws(s, s.catalog.lotteries[0].id)[1], intent = prepareDrawEdit(s, row, valuesFor('SSQ'), '更正'); confirmDrawEdit(s, intent); const count = s.drawVersions.length; assert.throws(() => confirmDrawEdit(s, intent), /已有新版本/); assert.equal(s.drawVersions.length, count);
  const nextRow = queryDraws(s, row.lotteryId)[2], invalid = prepareDrawEdit(s, nextRow, valuesFor('SSQ'), '测试'); invalid.areas[0].chosen = [100]; assert.throws(() => confirmDrawEdit(s, invalid), /整数/); assert.equal(s.drawVersions.length, count);
});
check('待复核期次直接二次确认后旧候选留痕，其他彩种不变', () => {
  const s = createSeed(), id = s.catalog.lotteries[0].id, row = queryDraws(s, id).find(r => r.status === 'PENDING_REVIEW')!, other = structuredClone(queryDraws(s, s.catalog.lotteries[1].id));
  confirmDrawEdit(s, prepareDrawEdit(s, row, valuesFor('SSQ'), '人工核对录入')); const updated = queryDraws(s, id).find(r => r.issueCode === row.issueCode)!; assert.equal(updated.status, 'DRAWN'); assert.equal(updated.version, '1'); assert(updated.candidates.some(c => c.status === 'SUPERSEDED')); assert(updated.candidates.some(c => c.confirmationMode === 'DOUBLE_CONFIRM')); assert.deepEqual(queryDraws(s, s.catalog.lotteries[1].id), other);
});
const exportRows = orderExportRows(queryOrders(createSeed(), {})), csv = await reportFile(exportRows, 'CSV').text(), xlsx = new Uint8Array(await reportFile(exportRows, 'XLSX').arrayBuffer());
assert(csv.includes('彩票名称') && csv.includes('下注内容') && csv.includes('双色球')); assert.equal(xlsx[0], 0x50); assert.equal(xlsx[1], 0x4b); checked++;
writeFileSync('.local/orders-chinese-export.csv', csv); writeFileSync('.local/orders-chinese-export.xlsx', xlsx);
console.log(`${checked} targeted list-workspace checks passed; network forbidden.`);
