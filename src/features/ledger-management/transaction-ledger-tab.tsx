"use client";
import { useEffect, useState } from 'react';
import { ActionButton, Dialog, StatusBadge } from '@/components/admin-workspace/admin-workspace';
import { ListPagination } from '@/components/list-controls';
import { PageState } from '@/components/page-state/page-state';
import { state } from '@/demo/state';
import { accountName, ledgerTypeName, operatorName, queryLedger } from '@/demo/list-workspaces';
import { cents, money } from '@/demo/operational-records';
import { reportDate } from '@/demo/operational-reports';
import { valueLabels } from '@/features/operational-reports/report-config';
import type { Row } from '@/demo/seed';
import styles from '@/features/operational-reports/operational-reports.module.css';

const empty = { businessNumber: '', account: '', stationMaster: '', issueCode: '', direction: '', from: '', to: '' };
export function TransactionLedgerTab({ canView, refreshToken, onReverse }: { canView: boolean; refreshToken: number; onReverse?: (tx: Row) => void }) {
  const [draft, setDraft] = useState(empty), [filters, setFilters] = useState(empty);
  const [page, setPage] = useState(1), [size, setSize] = useState(10), [selected, setSelected] = useState<Row | null>(null), [error, setError] = useState('');
  useEffect(() => { setPage(1); setSelected(null); }, [refreshToken]);
  if (!canView) return <PageState kind="forbidden" title="无账本查看权限" />;
  const all = queryLedger(state, filters), current = Math.min(page, Math.max(1, Math.ceil(all.length / size))), rows = all.slice((current - 1) * size, current * size);
  const input = (key: keyof typeof empty, label: string, type = 'text') => <label className={styles.field}><span>{label}</span><input type={type} value={draft[key]} onInput={e => { const value = e.currentTarget.value; setDraft(f => ({ ...f, [key]: value })); }} /></label>;
  const parties = (tx: Row, direction: string) => tx.entries.filter((e: Row) => e.direction === direction).map(accountName).join('；');
  return <>
    <form className={styles.filters} onSubmit={e => { e.preventDefault(); if (draft.from && draft.to && draft.from > draft.to) { setError('开始日期不能晚于结束日期。'); return; } setFilters({ ...draft }); setPage(1); setError(''); }}>
      {input('businessNumber', '业务单号')}{input('account', '账户名称 / 账号')}{input('stationMaster', '站长名称 / 账号')}{input('issueCode', '期号')}
      <label className={styles.field}><span>分录方向</span><select value={draft.direction} onChange={e => setDraft(f => ({ ...f, direction: e.target.value }))}><option value="">全部方向</option><option value="DEBIT">转出</option><option value="CREDIT">转入</option></select></label>
      {input('from', '开始日期', 'date')}{input('to', '结束日期（含）', 'date')}
      <div className={styles.filterActions}><ActionButton type="submit" variant="primary">查询账本</ActionButton><ActionButton onClick={() => { setDraft(empty); setFilters(empty); setPage(1); setError(''); }}>重置</ActionButton></div>
    </form>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    <p className={styles.caption}>每行一笔交易，共 {all.length} 笔。账号与方向筛选命中同一条分录；点击“查看分录”核对完整转出、转入和前后余额。</p>
    <div className={styles.tableWrap}><table className={styles.table}><thead><tr>{['发生时间', '业务单号', '交易类型', '状态', '所属站点', '所属站长', '相关会员', '转出账户', '转入账户', '交易积分', '已冲正积分', '期号', '操作人', '原因', '操作'].map(t => <th key={t}>{t}</th>)}</tr></thead>
      <tbody>{rows.map(tx => <tr key={tx.id}>
        <td>{reportDate(tx.createdAt)}</td><td>{tx.businessNumber}</td><td>{ledgerTypeName(tx.type)}</td><td><StatusBadge status={tx.status} label={tx.status === 'POSTED' ? '已入账' : '状态未记录'} /></td>
        <td>{tx.stationName || '平台全局'}</td><td>{tx.stationMasterName || '平台全局'}</td><td>{tx.entries.filter((e: Row) => e.ownerType === 'MEMBER').map(accountName).join('；') || '不涉及会员'}</td>
        <td>{parties(tx, 'DEBIT')}</td><td>{parties(tx, 'CREDIT')}</td><td>{money(cents(tx.economicPoints))}</td><td>{money(cents(tx.reversedPoints))}</td><td>{tx.issueCode || '非期次业务'}</td><td>{operatorName(state, tx.operatorId)}</td><td>{tx.reason || '未记录'}</td>
        <td><div className={styles.actions}><button className={styles.textButton} onClick={() => setSelected(tx)}>查看分录</button>{onReverse ? <button className={styles.textButton} disabled={!!tx.referenceTransactionId || cents(tx.reversedPoints) >= cents(tx.economicPoints)} onClick={() => onReverse(tx)}>冲正</button> : null}</div></td>
      </tr>)}{!rows.length ? <tr><td className={styles.empty} colSpan={15}>当前筛选没有账本交易。</td></tr> : null}</tbody></table></div>
    <ListPagination count={all.length} page={current} size={size} onPage={setPage} onSize={n => { setSize(n); setPage(1); }} />
    <Dialog open={selected !== null} title="交易分录详情" description="完整保留交易双方，积分总计不将借贷两边重复相加。" onClose={() => setSelected(null)} width="wide">
      {selected ? <><dl className={styles.facts}>{[['业务单号', selected.businessNumber], ['交易类型', ledgerTypeName(selected.type)], ['发生时间', reportDate(selected.createdAt)], ['操作人', operatorName(state, selected.operatorId)], ['原因', selected.reason || '未记录'], ['原交易', state.ledgers.find((t: Row) => t.id === selected.referenceTransactionId)?.businessNumber || '原始交易']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <div className={styles.tableWrap}><table className={styles.detailTable}><thead><tr>{['账户名称', '账户归属', '账户类型', '方向', '变动额', '变动前余额', '变动后余额'].map(t => <th key={t}>{t}</th>)}</tr></thead><tbody>{selected.entries.map((e: Row, i: number) => <tr key={e.id || i}><td>{accountName(e)}</td><td>{valueLabels[e.ownerType] || ({ BUDGET_SOURCE: '预算来源', SYSTEM: '系统' } as Record<string, string>)[e.ownerType] || '其他账户'}</td><td>{valueLabels[e.bucket] || ({ CONSUMPTION: '已消费积分', DISPOSABLE: '可用预算' } as Record<string, string>)[e.bucket] || '其他积分账户'}</td><td>{e.direction === 'DEBIT' ? '转出' : '转入'}</td><td>{money(cents(e.changePoints))}</td><td>{e.balanceBefore == null ? '未记录' : money(cents(e.balanceBefore))}</td><td>{e.balanceAfter == null ? '未记录' : money(cents(e.balanceAfter))}</td></tr>)}</tbody></table></div>
        <p className={styles.caption}>关联冲正：{state.ledgers.filter((t: Row) => t.referenceTransactionId === selected.id).map((t: Row) => t.businessNumber).join('；') || '暂无'}</p>
      </> : null}
    </Dialog>
  </>;
}
