import { make, uid, type Row } from './seed';
import { cents, money } from './operational-records';
import { reportDate } from './operational-reports';
import { valueLabels } from '@/features/operational-reports/report-config';

export function areaName(code: string, key: string, index: number): string {
  const names: Record<string, Record<string, string>> = {
    SSQ: { RED: '红球', BLUE: '蓝球' }, DLT: { FRONT: '前区', BACK: '后区' },
    QLC: { BASIC: '基本号码', SPECIAL: '特别号码' }, KL8: { MAIN: '选号' },
  };
  if (names[code]?.[key]) return names[code][key];
  if (['FC3D', 'PL3'].includes(code)) return ['百位', '十位', '个位'][index] || '选号';
  if (code === 'PL5') return ['万位', '千位', '百位', '十位', '个位'][index] || '选号';
  return code === 'QXC' ? `第${index + 1}位` : `选号区${index + 1}`;
}
export const positional = (code: string) => ['FC3D', 'PL3', 'PL5', 'QXC'].includes(code);
export const numberText = (code: string, values: number[]) => values.map(n => String(n).padStart(positional(code) ? 1 : 2, '0')).join(' ');
export function selectionText(code: string, selection?: Row): string {
  if (!selection?.areas?.length) return '下注内容未记录';
  return selection.areas.map((a: Row, i: number) => `${areaName(code, a.key, i)}：${[
    a.chosen?.length ? numberText(code, a.chosen) : '',
    a.dan?.length ? `胆码 ${numberText(code, a.dan)}` : '',
    a.tuo?.length ? `拖码 ${numberText(code, a.tuo)}` : '',
  ].filter(Boolean).join('；') || '未记录'}`).join(' / ');
}
export function orderPresentation(s: Row, o: Row): Row {
  const lottery = s.catalog.lotteries.find((l: Row) => l.id === o.lotteryId);
  const member = s.members.find((m: Row) => m.id === o.memberId);
  return { ...o, businessNumber: o.businessNumber || o.orderNumber || (o.id.startsWith('demo-order-') ? `演示订单${o.id.slice(11)}` : '历史单号未记录'),
    memberAccount: o.memberAccount || member?.account || '未记录', memberName: o.memberName || member?.displayName || '未记录',
    lotteryName: o.lotteryName || lottery?.name || '彩票名称未记录', lotteryCode: lottery?.code || '',
    playName: o.playName || lottery?.plays.find((p: Row) => p.id === o.playId)?.name || '玩法名称未记录',
    selectionText: selectionText(lottery?.code || '', o.selection),
    stationName: o.stationName || s.stations.find((r: Row) => r.id === o.stationId)?.name || '未记录',
    stationMasterName: o.stationMasterName || s.stationMasters.find((r: Row) => r.id === o.stationMasterId)?.name || '未记录',
  };
}
export function inDateRange(value: unknown, from = '', to = ''): boolean {
  if (!from && !to) return true;
  if (!value) return false;
  const time = new Date(String(value)).getTime();
  const parse = (date: string, end: boolean) => new Date(date.length === 10 ? `${date}T${end ? '23:59:59.999' : '00:00:00'}+08:00` : /[zZ]|[+-]\d\d:\d\d$/.test(date) ? date : `${date}+08:00`).getTime();
  return Number.isFinite(time) && (!from || time >= parse(from, false)) && (!to || time <= parse(to, true));
}
const contains = (value: unknown, query = '') => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase());
export function queryOrders(s: Row, f: Row): Row[] {
  return s.orders.filter((o: Row) => o.type === 'ORDINARY').map((o: Row) => orderPresentation(s, o)).filter((o: Row) =>
    contains(`${o.memberAccount} ${o.memberName}`, f.account) && contains(o.businessNumber, f.businessNumber) &&
    (!f.lotteryId || o.lotteryId === f.lotteryId) && (!f.playId || o.playId === f.playId) &&
    contains(o.issueCode, f.issueCode) && (!f.status || o.status === f.status) && inDateRange(o.createdAt, f.from, f.to)
  ).sort((a: Row, b: Row) => String(b.createdAt).localeCompare(String(a.createdAt)) || a.id.localeCompare(b.id));
}
export const orderStatusName = (status: string) => ({ RESERVED: '已冻结', LOCKED: '已锁定', WAITING_DRAW: '等待开奖', SETTLING: '结算中', AWARD_PENDING_BUDGET: '等待返奖预算', SETTLED: '已结算', CANCELLING: '退款处理中', CANCELLED: '已退款取消', CORRECTING: '更正中', CORRECTED: '已更正', EXCEPTION_PENDING: '异常待处理' } as Record<string, string>)[status] || '状态未记录';
export function orderExportRows(rows: Row[]): string[][] {
  return [['订单号', '会员账号', '会员名称', '所属站点', '所属站长', '彩票名称', '玩法', '期号', '下注内容', '投注积分', '订单状态', '应返积分', '已净发积分', '退款积分', '下注时间', '结算时间'],
    ...rows.map(o => [o.businessNumber, o.memberAccount, o.memberName, o.stationName, o.stationMasterName, o.lotteryName, o.playName, o.issueCode, o.selectionText, money(cents(o.purchasePoints)), orderStatusName(o.status), o.dueAwardPoints == null ? '待结算' : money(cents(o.dueAwardPoints)), money(cents(o.netPostedAwardPoints)), money(cents(o.refundPoints)), reportDate(o.createdAt), o.settledAt ? reportDate(o.settledAt) : ['SETTLED','CORRECTED'].includes(o.status) ? '未记录' : '尚未结算'])];
}
export function queryLedger(s: Row, f: Row): Row[] {
  return s.ledgers.filter((t: Row) => contains(t.businessNumber, f.businessNumber) && contains(`${t.stationMasterName} ${t.stationMasterCode}`, f.stationMaster) && contains(t.issueCode, f.issueCode) &&
    inDateRange(t.createdAt, f.from, f.to) && t.entries.some((e: Row) => (!f.direction || e.direction === f.direction) && contains(`${e.ownerName} ${e.ownerAccount}`, f.account))
  ).sort((a: Row, b: Row) => String(b.createdAt).localeCompare(String(a.createdAt)) || String(a.businessNumber).localeCompare(String(b.businessNumber)));
}
export const ledgerTypeName = (type: string) => valueLabels[type] || ({ ADMIN_GRANT: '平台拨付', ADMIN_DEDUCT: '平台扣回', ORDINARY_RESERVE: '普通投注冻结', ORDINARY_LOCK: '普通投注锁定', AI_SUBSCRIPTION_ACCEPTED: 'AI认购', AI_POOL_LOCK: 'AI合买锁定', AI_POOL_CONSUMED: 'AI合买消耗' } as Record<string, string>)[type] || '其他积分业务';
export const accountName = (e: Row) => [e.ownerName, e.ownerAccount].filter(Boolean).join(' · ') || ({ PLATFORM: '平台预算账户', BUDGET_SOURCE: '预算来源账户', SYSTEM: '系统账户' } as Record<string, string>)[e.ownerType] || '历史账户名称未记录';
export const operatorName = (s: Row, id: string) => s.employees.find((e: Row) => e.id === id)?.name || s.stationMasters.find((e: Row) => e.id === id)?.name || (id === 'demo-system' ? '系统（演示）' : '未记录');

export interface DrawAreaRule { key: string; label: string; count: number; min: number; max: number; unique: boolean; }
export function drawRules(code: string): DrawAreaRule[] {
  const area = (key: string, label: string, count: number, min: number, max: number, unique = true) => ({ key, label, count, min, max, unique });
  if (code === 'SSQ') return [area('RED', '红球', 6, 1, 33), area('BLUE', '蓝球', 1, 1, 16)];
  if (code === 'DLT') return [area('FRONT', '前区', 5, 1, 35), area('BACK', '后区', 2, 1, 12)];
  if (code === 'QLC') return [area('BASIC', '基本号码', 7, 1, 30), area('SPECIAL', '特别号码', 1, 1, 30)];
  if (code === 'KL8') return [area('MAIN', '开奖号码', 20, 1, 80)];
  return Array.from({ length: code === 'PL5' ? 5 : code === 'QXC' ? 7 : 3 }, (_, i) => area(code === 'QXC' && i === 6 ? 'LAST' : `P${i + 1}`, areaName(code, '', i), 1, 0, code === 'QXC' && i === 6 ? 14 : 9, false));
}
function latestVersion(s: Row, lotteryId: string, issueCode: string): Row | undefined {
  return s.drawVersions.filter((v: Row) => v.lotteryId === lotteryId && v.issueCode === issueCode).sort((a: Row, b: Row) => Number(b.version) - Number(a.version) || String(b.confirmedAt).localeCompare(String(a.confirmedAt)))[0];
}
export function queryDraws(s: Row, lotteryId: string, f: Row = {}): Row[] {
  const lottery = s.catalog.lotteries.find((l: Row) => l.id === lotteryId);
  const codes = new Set<string>([...s.issues, ...s.drawVersions, ...s.candidates].filter((r: Row) => r.lotteryId === lotteryId).map((r: Row) => r.issueCode));
  return [...codes].map(issueCode => {
    const issue = s.issues.find((i: Row) => i.lotteryId === lotteryId && i.issueCode === issueCode);
    const versions = s.drawVersions.filter((v: Row) => v.lotteryId === lotteryId && v.issueCode === issueCode);
    const current = latestVersion(s, lotteryId, issueCode);
    const candidates = s.candidates.filter((c: Row) => c.lotteryId === lotteryId && c.issueCode === issueCode);
    const pending = candidates.find((c: Row) => c.status === 'PENDING_REVIEW');
    const status = pending ? 'PENDING_REVIEW' : current ? 'DRAWN' : candidates.some((c: Row) => c.status === 'REJECTED') ? 'REJECTED' : 'WAITING_DRAW';
    return { id: `${lotteryId}:${issueCode}`, lotteryId, lotteryName: lottery?.name || '未记录', lotteryCode: lottery?.code || '', issueCode, issue,
      status, drawAt: issue?.drawAt || null, drawDate: issue?.drawDate || (current?.confirmedAt ? reportDate(current.confirmedAt).slice(0, 10) : null),
      areas: current?.areas || current?.numbers?.areas || [], candidateAreas: pending?.areas || pending?.numbers?.areas || [],
      numbers: current ? selectionText(lottery?.code || '', { areas: current.areas || current.numbers?.areas }) : '尚未确认开奖',
      version: current?.version || null, source: current?.source || pending?.source || null, confirmedAt: current?.confirmedAt || null,
      operatorName: current?.operatorName || operatorName(s, current?.confirmedBy || current?.operatorId), versions, candidates,
    };
  }).filter(r => contains(r.issueCode, f.issueCode) && (!f.status || r.status === f.status) && inDateRange(r.drawDate, f.from, f.to))
    .sort((a, b) => b.issueCode.localeCompare(a.issueCode));
}
export function prepareDrawEdit(s: Row, row: Row, values: Record<string, string>, reason: string): Row {
  if (!reason.trim()) throw new Error('请填写修改原因。');
  const areas = drawRules(row.lotteryCode).map(rule => {
    const tokens = (values[rule.key] || '').trim().split(/[\s,，、]+/).filter(Boolean);
    if (tokens.length !== rule.count || tokens.some(t => !/^\d+$/.test(t) || Number(t) < rule.min || Number(t) > rule.max)) throw new Error(`${rule.label}需要${rule.count}个${rule.min}–${rule.max}之间的整数。`);
    const chosen = tokens.map(Number);
    if (rule.unique && new Set(chosen).size !== chosen.length) throw new Error(`${rule.label}号码不能重复。`);
    return { key: rule.key, chosen, dan: [], tuo: [] };
  });
  if (row.lotteryCode === 'QLC' && areas[0].chosen.includes(areas[1].chosen[0])) throw new Error('特别号码不能与基本号码重复。');
  return { lotteryId: row.lotteryId, issueCode: row.issueCode, expectedVersion: row.version, areas, reason: reason.trim(), before: row.numbers, after: selectionText(row.lotteryCode, { areas }) };
}
export function confirmDrawEdit(s: Row, intent: Row): Row {
  const current = latestVersion(s, intent.lotteryId, intent.issueCode);
  if ((current?.version || null) !== intent.expectedVersion) throw new Error('该期开奖已有新版本，请关闭弹窗刷新后重新修改。');
  const lottery = s.catalog.lotteries.find((l: Row) => l.id === intent.lotteryId);
  const checked = prepareDrawEdit(s, { lotteryId: intent.lotteryId, issueCode: intent.issueCode, lotteryCode: lottery.code, version: intent.expectedVersion, numbers: intent.before }, Object.fromEntries(intent.areas.map((a: Row) => [a.key, a.chosen.join(' ')])), intent.reason);
  const time = new Date().toISOString(), version = String(Number(current?.version || 0) + 1);
  const draw = make('operations', 'DrawVersion', { id: uid('local-draw'), lotteryId: intent.lotteryId, lotteryCode: lottery.code, issueCode: intent.issueCode, version, areas: checked.areas, status: 'CONFIRMED', source: 'LOCAL_DOUBLE_CONFIRMED', confirmedAt: time, confirmedBy: s.identity.employeeId, operatorName: operatorName(s, s.identity.employeeId), reason: checked.reason, replacesDrawVersion: intent.expectedVersion, prizeReferenceStatus: 'FINAL' });
  s.drawVersions.unshift(draw);
  for (const c of s.candidates.filter((c: Row) => c.lotteryId === intent.lotteryId && c.issueCode === intent.issueCode && c.status === 'PENDING_REVIEW')) Object.assign(c, { status: 'SUPERSEDED', reviewedAt: time });
  s.candidates.unshift(make('operations', 'DrawCandidate', { id: uid('local-candidate'), lotteryId: intent.lotteryId, issueCode: intent.issueCode, version, areas: checked.areas, status: 'APPROVED', source: 'MANUAL', authorId: s.identity.employeeId, createdAt: time, reason: checked.reason, confirmationMode: 'DOUBLE_CONFIRM' }));
  const issue = s.issues.find((i: Row) => i.lotteryId === intent.lotteryId && i.issueCode === intent.issueCode);
  if (issue) Object.assign(issue, { status: 'DRAWN', version: String(Number(issue.version || 0) + 1) });
  s.audits.unshift({ id: uid('local-draw-audit'), actorId: s.identity.employeeId, operationId: 'confirmLocalDrawCorrection', resourceId: `${intent.lotteryId}:${intent.issueCode}`, beforeVersion: intent.expectedVersion, afterVersion: version, reason: checked.reason, resultCode: 'COMPLETED', createdAt: time, traceId: '本地二次确认演示' });
  return draw;
}
