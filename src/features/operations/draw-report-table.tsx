import { useEffect, useState } from 'react';
import { ActionButton, Dialog, InlineNotice, Panel, StatusBadge } from '@/components/admin-workspace/admin-workspace';
import { ListPagination } from '@/components/list-controls';
import { ChangeNotesButton } from '@/features/change-notes/change-notes';
import { useRoute } from '@/demo/router';
import { state, persist } from '@/demo/state';
import { confirmDrawEdit, drawRules, prepareDrawEdit, queryDraws, selectionText } from '@/demo/list-workspaces';
import { reportDate } from '@/demo/operational-reports';
import type { Row } from '@/demo/seed';
import styles from '@/features/operational-reports/operational-reports.module.css';

const statusName: Record<string, string> = { DRAWN: '已开奖', PENDING_REVIEW: '待复核', WAITING_DRAW: '待开奖', REJECTED: '复核驳回' };
const sourceName = (source?: string) => ({ SYSTEM: '系统来源（演示）', MANUAL: '人工录入', MANUAL_REVIEWED: '人工复核', LOCAL_DOUBLE_CONFIRMED: '本地二次确认' } as Record<string, string>)[source || ''] || '未记录';
function initialFilters() {
  const p = new URLSearchParams(location.hash.split('?')[1] || '');
  return { lotteryId: p.get('lotteryId') || state.catalog.lotteries[0]?.id || '', issueCode: p.get('issueCode') || '', from: '', to: '', status: '' };
}
export function DrawReportTable({ canEdit }: { canEdit: boolean }) {
  const route = useRoute();
  const [draft, setDraft] = useState(initialFilters), [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1), [size, setSize] = useState(10), [error, setError] = useState(''), [saved, setSaved] = useState('');
  const [editing, setEditing] = useState<Row | null>(null), [history, setHistory] = useState<Row | null>(null), [values, setValues] = useState<Record<string, string>>({}), [reason, setReason] = useState(''), [intent, setIntent] = useState<Row | null>(null), [editError, setEditError] = useState('');
  const [, refresh] = useState(0);
  useEffect(() => { const f = initialFilters(); setDraft(f); setFilters(f); setPage(1); setEditing(null); setHistory(null); }, [route]);
  const all = queryDraws(state, filters.lotteryId, filters), current = Math.min(page, Math.max(1, Math.ceil(all.length / size))), rows = all.slice((current - 1) * size, current * size);
  function edit(row: Row) {
    const areas = row.areas.length ? row.areas : row.candidateAreas;
    setEditing(row); setIntent(null); setEditError(''); setReason('');
    setValues(Object.fromEntries(drawRules(row.lotteryCode).map(r => [r.key, areas.find((a: Row) => a.key === r.key)?.chosen.join(' ') || ''])));
  }
  function next() { try { setIntent(prepareDrawEdit(state, editing!, values, reason)); setEditError(''); } catch (e) { setEditError((e as Error).message); } }
  function save() { try { const draw = confirmDrawEdit(state, intent!); persist(); setSaved(`${editing!.lotteryName} ${draw.issueCode} 期已保存开奖版本${draw.version}。`); setEditing(null); setIntent(null); refresh(n => n + 1); } catch (e) { setEditError((e as Error).message); } }
  const input = (key: 'issueCode' | 'from' | 'to', label: string, type = 'text') => <label className={styles.field}><span>{label}</span><input type={type} value={draft[key]} onInput={e => { const value = e.currentTarget.value; setDraft(f => ({ ...f, [key]: value })); }} /></label>;
  return <>
    <InlineNotice title="开奖报表与修改说明">按彩种查看全部本地期次，日期按计划开奖日查询；“待复核”号码作为候选展示。行末修改开奖号码，核对前后号码后二次确认保存，旧版本保留。</InlineNotice>
    {saved ? <InlineNotice tone="success" title="修改成功">{saved}</InlineNotice> : null}
    <Panel title="开奖查询" description="选择彩种立即展示该彩种全部记录；可按日期、期号和开奖状态查询。">
      <form className={styles.filters} onSubmit={e => { e.preventDefault(); if (draft.from && draft.to && draft.from > draft.to) { setError('开始日期不能晚于结束日期。'); return; } setFilters({ ...draft }); setPage(1); setError(''); }}>
        <label className={styles.field}><span>彩票名称</span><select value={draft.lotteryId} onChange={e => { const next = { ...initialFilters(), lotteryId: e.target.value, issueCode: '' }; setDraft(next); setFilters(next); setPage(1); setError(''); setSaved(''); }}>{state.catalog.lotteries.map((l: Row) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
        {input('issueCode', '期号')}{input('from', '开奖开始日期', 'date')}{input('to', '开奖结束日期（含）', 'date')}
        <label className={styles.field}><span>开奖状态</span><select value={draft.status} onChange={e => setDraft(f => ({ ...f, status: e.target.value }))}><option value="">全部状态</option>{Object.entries(statusName).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <div className={styles.filterActions}><ActionButton type="submit" variant="primary">查询</ActionButton><ActionButton onClick={() => { const f = { ...initialFilters(), lotteryId: filters.lotteryId, issueCode: '' }; setDraft(f); setFilters(f); setPage(1); setError(''); }}>重置</ActionButton><ActionButton onClick={() => refresh(n => n + 1)}>刷新开奖</ActionButton></div>
      </form>{error ? <p className={styles.error} role="alert">{error}</p> : null}
    </Panel>
    <Panel title="开奖记录" description={`共 ${all.length} 条；一行一个期次，显示当前有效开奖版本，右侧直接操作。`} flush>
      <div className={styles.tableWrap}><table className={styles.table} style={{ minWidth: 1400 }}><thead><tr>{['期号', '彩票名称', '计划开奖时间', '开奖号码', '开奖状态', '当前版本', '来源', '确认时间', '操作人', '操作'].map(t => <th key={t}>{t}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.id}>
        <td>{r.issueCode}</td><td>{r.lotteryName}</td><td>{reportDate(r.drawAt)}</td><td style={{ whiteSpace: 'normal', minWidth: 300 }}><div>{r.numbers}</div>{r.candidateAreas.length ? <span className={styles.caption}>候选：{selectionText(r.lotteryCode, { areas: r.candidateAreas })}</span> : null}</td><td><StatusBadge label={statusName[r.status]} status={r.status} /></td><td>{r.version || '尚未确认'}</td><td>{sourceName(r.source)}</td><td>{r.confirmedAt ? reportDate(r.confirmedAt) : '尚未确认'}</td><td>{r.operatorName}</td>
        <td><div className={styles.actions}><button className={styles.textButton} disabled={!canEdit} onClick={() => edit(r)}>{r.version ? '修改开奖号码' : '录入开奖号码'}</button><button className={styles.textButton} onClick={() => setHistory(r)}>查看历史</button></div></td>
      </tr>)}{!rows.length ? <tr><td className={styles.empty} colSpan={10}>当前筛选没有开奖记录。</td></tr> : null}</tbody></table></div>
      <ListPagination count={all.length} page={current} size={size} onPage={setPage} onSize={n => { setSize(n); setPage(1); }} />
    </Panel>
    <Dialog open={editing !== null} title={intent ? '二次确认开奖号码' : editing?.version ? '修改开奖号码' : '录入开奖号码'} description="本地原型操作，保存时新增版本并保留修改原因和操作记录。" width="wide" onClose={() => { setEditing(null); setIntent(null); }} footer={<><ActionButton onClick={() => { setEditing(null); setIntent(null); }}>取消</ActionButton>{intent ? <><ActionButton onClick={() => { setIntent(null); setEditError(''); }}>返回修改</ActionButton><ActionButton variant="danger" onClick={save}>确认修改开奖号码</ActionButton></> : <ActionButton variant="primary" onClick={next}>下一步：二次确认</ActionButton>}</>}>
      {editing ? <><div className={styles.detailActions}><ChangeNotesButton module="draws" /></div><dl className={styles.facts}><div><dt>彩票名称</dt><dd>{editing.lotteryName}</dd></div><div><dt>期号</dt><dd>{editing.issueCode}</dd></div><div><dt>修改前开奖号码</dt><dd>{editing.numbers}</dd></div></dl>
        {intent ? <dl className={styles.facts}><div><dt>修改后开奖号码</dt><dd>{intent.after}</dd></div><div><dt>修改原因</dt><dd>{intent.reason}</dd></div><div><dt>保存方式</dt><dd>新增版本、保留旧版</dd></div></dl> : <div className={styles.filters}>{drawRules(editing.lotteryCode).map(r => <label className={styles.field} key={r.key}><span>{r.label}（{r.count}个，{r.min}–{r.max}）</span><input value={values[r.key] || ''} inputMode="numeric" placeholder="多个号码以空格分隔" onInput={e => { const value = e.currentTarget.value; setValues(v => ({ ...v, [r.key]: value })); }} /></label>)}<label className={styles.field}><span>修改原因</span><input maxLength={500} value={reason} onInput={e => setReason(e.currentTarget.value)} placeholder="填写录入或更正原因" /></label></div>}
        {editError ? <p className={styles.error} role="alert">{editError}</p> : null}
      </> : null}
    </Dialog>
    <Dialog open={history !== null} title="开奖版本历史" description="按版本保留确认记录；未确认候选与实际开奖分别展示。" width="wide" onClose={() => setHistory(null)}>
      {history ? <><div className={styles.detailActions}><ChangeNotesButton module="draws" /></div><p>{history.lotteryName} · {history.issueCode} 期</p><div className={styles.tableWrap}><table className={styles.detailTable}><thead><tr>{['开奖版本', '开奖号码', '来源', '确认时间', '原因'].map(t => <th key={t}>{t}</th>)}</tr></thead><tbody>{[...history.versions].sort((a, b) => Number(b.version) - Number(a.version)).map((v: Row, i) => <tr key={`${v.version}:${i}`}><td>{v.version}</td><td>{selectionText(history.lotteryCode, { areas: v.areas || v.numbers?.areas })}</td><td>{sourceName(v.source)}</td><td>{reportDate(v.confirmedAt)}</td><td>{v.reason || '未记录'}</td></tr>)}{!history.versions.length ? <tr><td colSpan={5}>尚无确认版本。</td></tr> : null}</tbody></table></div></> : null}
    </Dialog>
  </>;
}
