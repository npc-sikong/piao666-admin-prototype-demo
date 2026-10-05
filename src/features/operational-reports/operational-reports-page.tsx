import Link from 'next/link';
import { useRoute } from '@/demo/router';
import { useEffect, useState, type ReactNode } from 'react';
import { ActionButton, Dialog, InlineNotice, MetricStrip, PageHeader, Panel, StatusBadge, Tabs } from '@/components/admin-workspace/admin-workspace';
import { ChangeNotesButton } from '@/features/change-notes/change-notes';
import { state, persist } from '@/demo/state';
import { createDemoReconciliation } from '@/demo/management-records';
import { isManagementReport } from '@/demo/management-reports';
import { cents, money } from '@/demo/operational-records';
import { emptyOperationalFilters, operationalExportRows, queryOperationalReport, reportDate, reportValue, validateOperationalFilters, type OperationalFilters } from '@/demo/operational-reports';
import { reportFile } from '@/demo/export-file';
import type { Row } from '@/demo/seed';
import { reportDefinitions, valueLabels, type ReportColumn, type ReportKind, type ReferralTab } from './report-config';
import styles from './operational-reports.module.css';

function initialFilters(): OperationalFilters {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const account = params.get('account') || state.members.find((m: Row) => m.id === params.get('memberId'))?.account || '';
  const filters={...emptyOperationalFilters,account,referralTab:params.get('tab')==='rewards'?'rewards' as const:'relations' as const};
  for(const key of ['stationId','stationMasterId','from','to','dateField','projectId','issueCode','status','type','ownerType','budgetType'] as const)if(params.has(key))filters[key]=params.get(key)||'';
  return filters;
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className={styles.field}><span>{label}</span>{children}</label>; }
function pageNumbers(current: number, count: number): Array<number | string> {
  const selected = count <= 12 ? Array.from({ length: count }, (_, i) => i + 1) : [...new Set([1, 2, 3, current - 2, current - 1, current, current + 1, current + 2, count - 1, count])].filter(p => p >= 1 && p <= count).sort((a, b) => a - b);
  const result: Array<number | string> = [];
  for (const p of selected) { const previous = result.at(-1); if (typeof previous === 'number' && p - previous > 1) result.push(`gap-${p}`); result.push(p); }
  return result;
}

export function OperationalReportPage({ kind }: { kind: ReportKind }) {
  const definition = reportDefinitions[kind];
  const route = useRoute();
  const [draft, setDraft] = useState<OperationalFilters>(initialFilters), [applied, setApplied] = useState<OperationalFilters>(initialFilters);
  const [currentPage, setPage] = useState(1), [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Row | null>(null), [error, setError] = useState<string | null>(null), [exported, setExported] = useState('');
  const [file,setFile]=useState<{url:string;name:string;format:string}|null>(null);
  useEffect(()=>()=>{if(file)URL.revokeObjectURL(file.url);},[file]);
  const [, refresh] = useState(0);
  const result = queryOperationalReport(kind, applied), totalPages = Math.max(1, Math.ceil(result.rows.length / pageSize));
  const page = Math.min(currentPage, totalPages), rows = result.rows.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => {
    const record = new URLSearchParams(location.hash.split('?')[1] || '').get('record');
    const filters = initialFilters();setDraft(filters);setApplied(filters);setPage(1);
    const rows=queryOperationalReport(kind,filters).sourceRows;
    setSelected(record ? rows.find(r => r.id === record || r.transaction?.id === record) || null : null);
  }, [route]);
  function change<K extends keyof OperationalFilters>(key: K, value: OperationalFilters[K]) { setDraft(d => ({ ...d, [key]: value })); }
  function apply() { const invalid = validateOperationalFilters(draft); setError(invalid); if (!invalid) { setApplied({ ...draft }); setPage(1); setExported(''); } }
  function reset() { const value = { ...emptyOperationalFilters, referralTab: applied.referralTab, vipMode: applied.vipMode,budgetMode:applied.budgetMode,groupBy:applied.groupBy }; setDraft(value); setApplied(value); setPage(1); setError(null); setExported(''); }
  function tab(value: ReferralTab) { const next = { ...emptyOperationalFilters, account: applied.account, stationId: applied.stationId, stationMasterId: applied.stationMasterId, referralTab: value }; setDraft(next); setApplied(next); setPage(1); setSelected(null); setError(null); setExported(''); }
  function view(key:'groupBy'|'budgetMode',value:string){const next={...applied,[key]:value,deltaMin:'',deltaMax:'',balanceMin:'',balanceMax:'',type:'',status:'',direction:'',stationMasterId:key==='groupBy'&&value==='station'?'':applied.stationMasterId} as OperationalFilters;setDraft(next);setApplied(next);setPage(1);setSelected(null);setError(null);setExported('');}
  function download(format: 'CSV' | 'XLSX') {
    const url=URL.createObjectURL(reportFile(operationalExportRows(result),format));
    setFile({url,name:`${definition.name.replace('(新增)', '')}_${reportDate(result.asOf).replace(/[-: ]/g, '')}.${format.toLowerCase()}`,format});
    setExported(`已生成当前筛选全部 ${result.rows.length} 条记录（${format}），点击下载保存文件。`);
  }
  const choices = (key: string): Array<[string, string]> => [...new Set(result.sourceRows.map(r => r[key]).filter(v => v !== undefined && v !== null && v !== ''))].map(v => [String(v), valueLabels[String(v)] || String(v)]);
  const input = (key: keyof OperationalFilters, label: string, type = 'text', placeholder = '') => <Field label={label}><input type={type} step={type === 'datetime-local' ? '1' : type === 'number' ? '0.01' : undefined} value={draft[key]} placeholder={placeholder} onInput={type === 'datetime-local' ? e => change(key, e.currentTarget.value as never) : undefined} onChange={e => change(key, e.target.value as never)} /></Field>;
  const select = (key: keyof OperationalFilters, label: string, options: Array<[string, string]>) => <Field label={label}><select value={draft[key]} onChange={e => key==='lotteryId'?setDraft(f=>({...f,lotteryId:e.target.value,playId:''})):change(key, e.target.value as never)}><option value="">全部</option>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></Field>;
  const management=isManagementReport(kind), scoped=kind!=='aiBusiness'&&kind!=='reconciliations';
  const amountLabel=kind==='daily'||kind==='stationBusiness'?'参与积分':kind==='reconciliations'?'差异绝对值':kind==='budgetFlows'?applied.budgetMode==='snapshot'?'当前可用预算':'变动额绝对值':kind==='aiBusiness'?'会员有效参与积分':kind==='exceptions'?'待办相关积分':kind==='finance'?'金额':kind==='referrals'?'应发奖励':kind==='vip'?'累计有效加分':'参与/投注积分';
  const dateChoices: Array<[string, string]> = kind==='aiBusiness'?[['createdAt','期次创建时间'],['postedAt','实际发放时间']]:kind === 'ai' ? [['createdAt', '任一次参与时间'], ['lastParticipationAt', '最近参与时间'], ['postedAt', '分红到账时间']]
    : kind === 'bets' ? [['createdAt', '投注时间'], ['settledAt', '结算时间']]
    : kind === 'referrals' && applied.referralTab === 'rewards' ? [['createdAt', '奖励形成时间'], ['postedAt', '发放时间']] : [['createdAt', kind === 'referrals' ? '推荐绑定时间' : '记录发生时间']];
  return <>
    <PageHeader pageId={definition.pageId} title={definition.name} description={definition.purpose} actions={<div className={styles.actions}>{kind==='reconciliations'?<ActionButton onClick={()=>{const record=createDemoReconciliation(state);persist();refresh(n=>n+1);setPage(1);setSelected(queryOperationalReport(kind,emptyOperationalFilters).rows.find(r=>r.id===record.id)||null);}}>本地模拟对账</ActionButton>:null}<ActionButton onClick={() => { refresh(n => n + 1); setExported(''); }}>刷新报表</ActionButton><ChangeNotesButton module={kind} /></div>} />
    <InlineNotice title="报表口径与使用说明">{definition.business[0]} <span className={styles.demoNote}>本地虚构演示数据，历史记录仅用于演示操作与分析。</span></InlineNotice>
    {kind === 'referrals' ? <div className={styles.tabs}><Tabs label="会员推广视图" value={applied.referralTab} onChange={tab} items={[{ id: 'relations', label: '推荐关系' }, { id: 'rewards', label: '奖励明细' }]} /></div> : null}
    {kind === 'vip' ? <div className={styles.tabs}><Tabs label="VIP变更范围" value={applied.vipMode} onChange={value => { setApplied(f => ({ ...f, vipMode: value })); setDraft(f => ({ ...f, vipMode: value })); setPage(1); }} items={[{ id: 'upgrades', label: '仅升级记录' }, { id: 'all', label: '全部等级变更' }]} /></div> : null}
    {kind==='stationBusiness'?<div className={styles.tabs}><Tabs label="经营汇总维度" value={applied.groupBy} onChange={value=>view('groupBy',value)} items={[{id:'stationMaster',label:'站长经营'},{id:'station',label:'站点经营'}]}/></div>:null}
    {kind==='budgetFlows'?<div className={styles.tabs}><Tabs label="预算报表视图" value={applied.budgetMode} onChange={value=>view('budgetMode',value)} items={[{id:'flows',label:'账户分录'},{id:'snapshot',label:'当前预算'}]}/></div>:null}
    <Panel title="筛选条件" description="默认全部演示记录。站点与站长联动选择，时间精确到秒；查询及重置返回第一页。">
      <form onSubmit={e => { e.preventDefault(); apply(); }} className={styles.filters}>
        {!management||kind==='budgetFlows'||kind==='exceptions'?input('account',kind==='budgetFlows'?'预算类别 / 站长账号':kind === 'referrals' ? '推荐人账号 / 名称' : '会员账号 / 名称', 'text', '输入账号或名称'):null}
        {scoped?<><Field label="所属站点"><select value={draft.stationId} onChange={e => setDraft(f => ({ ...f, stationId: e.target.value, stationMasterId: '' }))}><option value="">全部站点</option>{state.stations.map((s: Row) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        {!(kind==='stationBusiness'&&applied.groupBy==='station')?<Field label="所属站长"><select value={draft.stationMasterId} onChange={e => change('stationMasterId', e.target.value)}><option value="">全部站长</option>{state.stationMasters.filter((m: Row) => !draft.stationId || m.station.id === draft.stationId).map((m: Row) => <option key={m.id} value={m.id}>{m.name} · {m.account}</option>)}</select></Field>:null}</>:null}
        <Field label="时间口径"><select value={draft.dateField} onChange={e => change('dateField', e.target.value)}>{dateChoices.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></Field>
        {input('from', '开始时间（北京时间）', 'datetime-local')}{input('to', '结束时间（北京时间）', 'datetime-local')}
        {input('keyword', kind === 'finance' || kind === 'changes' ? '业务单号 / 操作人 / 备注' : '关键词', 'text', '输入关键字')}
        {kind==='budgetFlows'?<>{select('ownerType','账户归属',[['PLATFORM','平台'],['STATION_MASTER','站长']])}{select('budgetType','预算类别',[...state.budgets.map((b:Row)=>[b.type,valueLabels[b.type]] as [string,string]),['DISPOSABLE','站长可用预算']])}{applied.budgetMode==='flows'?<>{select('type','业务类型',choices('type'))}{select('direction','变动方向',[['CREDIT','增加'],['DEBIT','减少']])}{input('deltaMin','变动额下限','number')}{input('deltaMax','变动额上限','number')}</>:null}</>:null}
        {kind==='reconciliations'?select('status','对账结果',choices('status')):null}
        {kind==='exceptions'?<>{select('type','待办类型',choices('type'))}{select('priority','处理顺序',choices('priority'))}{select('status','当前状态',choices('status'))}</>:null}
        {kind==='aiBusiness'?<>{select('projectId','合买项目',state.projects.map((p:Row)=>[p.id,p.name]))}{select('lotteryId','彩种',state.catalog.lotteries.map((l:Row)=>[l.id,l.name]))}{input('issueCode','期号')}{select('status','结算状态',choices('status'))}</>:null}
        {kind === 'finance' ? <>{select('direction', '操作', [['CREDIT', '加分'], ['DEBIT', '减分']])}{select('reversal','冲正标识',choices('reversal'))}</> : null}
        {kind === 'changes' ? <>{select('accountType', '变动账户', [['AVAILABLE', '积分账户·可用积分'], ['RESERVED', '积分账户·冻结积分'], ['AI_QUOTA', 'AI合买日额度']])}{select('type', '类型', choices('type'))}
          {input('deltaMin', '变动额下限', 'number')}{input('deltaMax', '变动额上限', 'number')}{input('balanceMin', '变动后额度下限', 'number')}{input('balanceMax', '变动后额度上限', 'number')}{select('direction', '变动方向', [['CREDIT', '增加'], ['DEBIT', '减少']])}</> : null}
        {['ai', 'bets'].includes(kind) ? input('issueCode', '期号') : null}
        {kind === 'ai' ? <>{select('projectId', '合买项目', state.projects.map((p: Row) => [p.id, p.name]))}{select('status', '结算状态', choices('status'))}{select('drawStatus','是否开奖',[['已开奖','已开奖'],['未开奖','未开奖']])}{select('participationStatus','参与状态',choices('participationStatus'))}</> : null}
        {kind === 'referrals' ? <>{select('referralLevel', '推广级别', choices('level'))}{applied.referralTab === 'rewards' ? <>{input('sourceMember', '来源会员账号')}{select('type', '奖励类型', [['FIXED_REFERRAL', '固定推广奖励'], ['AI_REFERRAL_SHARE', 'AI推广分红']])}{select('status', '发放状态', choices('status'))}</> : null}</> : null}
        {kind === 'vip' ? <>{select('beforeLevel', '初始等级', choices('beforeLevel'))}{select('afterLevel', '升级/变更后等级', choices('afterLevel'))}{applied.vipMode === 'all' ? select('status', '变更类型', [['UPGRADE', '升级'], ['DOWNGRADE', '降级'], ['REBUILD', '规则重算']]) : null}</> : null}
        {kind === 'bets' ? <>{select('lotteryId', '彩种', state.catalog.lotteries.map((l: Row) => [l.id, l.name]))}
          {select('playId', '玩法', state.catalog.lotteries.filter((l: Row) => !draft.lotteryId || l.id === draft.lotteryId).flatMap((l: Row) => l.plays.map((p: Row) => [p.id, `${l.name}·${p.name}`])))}
          {select('status', '订单状态', choices('status'))}{select('drawStatus','开奖状态',[['已开奖','已开奖'],['待开奖','待开奖']])}{select('winLoss', '输赢状态', [['WIN', '盈利'], ['LOSS', '亏损'], ['EVEN', '持平'], ['PENDING', '未结算或退款']])}</> : null}
        {kind !== 'changes' ? <>{input('amountMin',`${amountLabel}下限`, 'number')}{input('amountMax',`${amountLabel}上限`, 'number')}</> : null}
        <div className={styles.filterActions}><ActionButton variant="primary" type="submit">查询</ActionButton><ActionButton onClick={reset}>重置</ActionButton></div>
      </form>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </Panel>
    <MetricStrip items={result.metrics} />
    <Panel title={kind === 'referrals' ? applied.referralTab === 'relations' ? '推荐关系' : '奖励明细' : '记录列表'} description={`共 ${result.rows.length} 条 · 汇总和导出覆盖当前筛选全部记录 · 数据读取时间 ${reportDate(result.asOf)}（北京时间）`}
      actions={<div className={styles.actions}><ActionButton disabled={!result.rows.length} onClick={() => download('CSV')}>导出 CSV</ActionButton><ActionButton disabled={!result.rows.length} onClick={() => download('XLSX')}>导出 XLSX</ActionButton></div>} flush>
      <div className={styles.tableWrap}><table className={styles.table}><thead><tr>{result.columns.map(c => <th key={c.key}>{c.label}</th>)}<th>操作</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.id}>{result.columns.map((c, i) => <td key={c.key} className={c.format === 'money' && cents(r[c.key]) < 0 ? styles.negative : undefined}>
          {i === 0 && (r.memberId||r.primaryHref) ? <Link className={styles.link} href={r.primaryHref||`/members/${r.memberId}`}>{reportValue(c, r)}</Link>
            : ['directCount','validCount','memberCount','activeCount'].includes(c.key) ? <button className={styles.textButton} onClick={() => setSelected({ ...r, validOnly: c.key === 'validCount' })}>{reportValue(c, r)} 位 · 查看</button>
            : c.format === 'status' ? <StatusBadge status={r[c.key] || 'UNKNOWN'} label={reportValue(c, r)} /> : reportValue(c, r)}</td>)}
          <td><button className={styles.textButton} onClick={() => setSelected(r)}>查看详情</button></td></tr>)}
          {!rows.length ? <tr><td className={styles.empty} colSpan={result.columns.length + 1}>当前筛选没有记录，可调整条件或重置。尚未留存的历史会在新的本地模拟操作后形成。</td></tr> : null}</tbody></table></div>
      <div className={styles.pagination}>
        <label className={styles.pageSize}>每页展示<select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>{[10, 20, 40, 60, 80, 100].map(n => <option key={n} value={n}>{n} 条</option>)}</select></label>
        <span>共 {result.rows.length} 条 · {result.rows.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, result.rows.length)} 条</span>
        <nav className={styles.pageNumbers} aria-label="报表分页"><button disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</button>{pageNumbers(page, totalPages).map(n => typeof n === 'string' ? <span key={n}>…</span> : <button key={n} data-active={page === n} aria-current={page === n ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button>)}
          <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>下一页</button><button disabled={page === totalPages} onClick={() => setPage(totalPages)}>最后一页</button></nav>
        <label className={styles.jump}>选择第几页<select value={page} disabled={!result.rows.length} onChange={e => setPage(Number(e.target.value))}>{Array.from({ length: totalPages }, (_, i) => <option key={i} value={i + 1}>第 {i + 1} 页</option>)}</select></label>
      </div>
      {exported&&file ? <div className={styles.exportMessage} role="status">{exported} <a className={styles.link} href={file.url} download={file.name}>下载 {file.format}</a></div> : null}
    </Panel>
    <details className={styles.business}><summary>展开业务口径与关联说明</summary><ul>{definition.business.map(text => <li key={text}>{text}</li>)}</ul></details>
    <RecordDetails kind={kind} row={selected} columns={result.columns} onClose={() => setSelected(null)} onSelect={setSelected} />
  </>;
}

function SmallTable({ columns, rows }: { columns: ReportColumn[]; rows: Row[] }) {
  return <div className={styles.tableWrap}><table className={styles.detailTable}><thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={r.id || i}>{columns.map(c => <td key={c.key}>{c.key==='sourceHref'&&r.sourceHref?<Link className={styles.link} href={r.sourceHref}>关联业务 →</Link>:reportValue(c, r)}</td>)}</tr>)}{!rows.length ? <tr><td colSpan={columns.length}>没有记录</td></tr> : null}</tbody></table></div>;
}
function RecordDetails({ kind, row, columns, onClose, onSelect }: { kind: ReportKind; row: Row | null; columns: ReportColumn[]; onClose(): void; onSelect(row: Row): void }) {
  const tx = row?.transaction;
  const original = tx?.referenceTransactionId ? state.ledgers.find((r: Row) => r.id === tx.referenceTransactionId) : tx;
  const related = original ? state.ledgers.filter((r: Row) => r.id === original.id || r.referenceTransactionId === original.id) : [];
  const allocation = row?.pool ? state.allocations.filter((a: Row) => a.poolIssueId === row.pool.id && a.status !== 'SUPERSEDED').at(-1) : null;
  return <Dialog open={row !== null} title={`${reportDefinitions[kind].name} · 详情`} description="字段、关联记录和历史快照均来自本地演示数据。" onClose={onClose} width="wide">
    {row ? <><div className={styles.detailActions}>{row.memberId?<Link className={styles.link} href={`/members/${row.memberId}`}>会员详情 →</Link>:null}{row.sourceHref ? <Link className={styles.link} href={row.sourceHref}>关联业务 →</Link> : null}<ChangeNotesButton module={kind} /></div>
      <dl className={styles.facts}>{columns.map(c => <div key={c.key}><dt>{c.label}</dt><dd>{reportValue(c, row)}</dd></div>)}</dl>
      {row.detailRows?<><h3>{kind==='reconciliations'?'差异项与资料缺失':kind==='aiBusiness'?'该期会员参与与返还':'组成记录'}</h3><SmallTable columns={row.detailColumns} rows={row.detailRows}/></>:null}
      {row.currentMembers?<><h3>本组当前会员账号</h3><div className={styles.related}>{row.currentMembers.map((m:Row)=><Link key={m.id} className={styles.link} href={`/members/${m.id}`}>{m.account} · {m.status==='ENABLED'?'启用':'禁用'}</Link>)}</div></>:null}
      {row.drillLinks?<div className={styles.detailActions}>{row.drillLinks.map((l:Row)=><Link key={l.href} className={styles.link} href={l.href}>{l.label} →</Link>)}</div>:null}
      {tx ? <>
        <h3>原始交易与关联冲正</h3><div className={styles.related}>{related.map((r: Row) => <button key={r.id} className={styles.textButton} onClick={() => {
          const found = queryOperationalReport(kind, emptyOperationalFilters).sourceRows.find(v => v.transaction?.id === r.id); if (found) onSelect(found);
        }}>{r.businessNumber} · {valueLabels[r.type] || r.type} · {r.economicPoints} 积分</button>)}</div>
        <h3>本笔交易完整分录</h3><p className={styles.caption}>{kind==='budgetFlows'?'预算报表只计预算主账户分录；以下包含来源与其他对手账户，供核对追溯。':'会员帐变汇总仅计会员分录；以下包含对手账户，供核对追溯。'}</p>
        <SmallTable columns={[{ key: 'ownerName', label: '账户名称' }, { key: 'ownerType', label: '账户归属',format:'status' }, { key: 'bucket', label: '账户', format: 'status' }, { key: 'changePoints', label: '变动额', format: 'money' }, { key: 'balanceBefore', label: '变动前', format: 'money' }, { key: 'balanceAfter', label: '变动后', format: 'money' }]} rows={tx.entries} />
      </> : null}
      {row.accountType === 'AI_QUOTA' ? <p className={styles.caption}>额度业务日：{row.businessDate}；认购记录：{row.subscriptionId}。额度不是可提现余额。</p> : null}
      {kind === 'ai' ? <>
        <h3>逐次认购明细</h3><SmallTable columns={[{ key: 'id', label: '认购记录' }, { key: 'points', label: '参与积分', format: 'money' }, { key: 'quotaDate', label: '额度业务日' }, { key: 'status', label: '状态', format: 'status' }, { key: 'createdAt', label: '参与时间', format: 'time' }, { key: 'lockedAt', label: '锁定时间', format: 'time' }, { key: 'refundedAt', label: '退款时间', format: 'time' }]} rows={row.subscriptions} />
        <h3>开奖与返还</h3><p className={styles.caption}>开奖状态：{row.drawStatus}；开奖号码：{allocation?.winningNumberCode || '未记录'}；开奖版本：{allocation?.drawVersion || '未记录'}。应返包含本金；已结算净收益另行展示。</p>
        <SmallTable columns={[{ key: 'id', label: '发放明细' }, { key: 'duePoints', label: '应返积分', format: 'money' }, { key: 'postedPoints', label: '已到账', format: 'money' }, { key: 'status', label: '状态', format: 'status' }, { key: 'postedAt', label: '到账时间', format: 'time' }, { key: 'transactionId', label: '账本交易' }]} rows={row.payoutItems} />
        <div className={styles.detailActions}><Link className={styles.link} href={`/ai-pools/${row.pool.id}`}>合买期次 →</Link><Link className={styles.link} href={`/ai-pools/${row.pool.id}/payout`}>发放批次 →</Link></div>
      </> : null}
      {kind === 'referrals' && row.children ? <><h3>{row.validOnly ? '有效' : '全部'}直属会员账号</h3><p className={styles.caption}>当前直属关系；筛选和分页不会截断此处名单。有效资格按当前配置门槛判断。</p>
        <div className={styles.tableWrap}><table className={styles.detailTable}><thead><tr><th>会员账号</th><th>绑定时间</th><th>所属站点 / 站长</th><th>VIP</th><th>累计有效加分</th><th>有效门槛</th><th>有效资格</th><th>已发奖励净额</th></tr></thead><tbody>{row.children.filter((r: Row) => !row.validOnly || r.eligible).map((r: Row) => <tr key={r.memberId}><td><Link className={styles.link} href={`/members/${r.memberId}`}>{r.memberAccount}</Link></td><td>{reportDate(r.boundAt)}</td><td>{r.stationName} / {r.stationMasterName}</td><td>{r.vipName}</td><td>{r.qualifiedPoints}</td><td>{r.threshold}</td><td>{r.eligible ? '有效' : '未达标或已禁用'}</td><td>{r.posted}</td></tr>)}{!row.children.length ? <tr><td colSpan={8}>暂无直属会员</td></tr> : null}</tbody></table></div>
        <div className={styles.detailActions}><Link className={styles.link} href={`/reports/referrals?tab=rewards&account=${encodeURIComponent(row.memberAccount)}`}>查看该推荐人奖励明细 →</Link></div>
      </> : null}
      {kind === 'referrals' && row.history ? <><h3>奖励发放与回收</h3><p className={styles.caption}>本次奖励的等级和比例取历史快照；来源会员更换推荐人后，历史收益方保持不变。待发金额不计入已发奖励。</p>
        <SmallTable columns={[{ key: 'action', label: '操作' }, { key: 'points', label: '积分', format: 'money' }, { key: 'time', label: '时间', format: 'time' }, { key: 'transactionId', label: '账本交易' }]} rows={row.history} />
        <div className={styles.related}>{row.ledgerIds.map((id: string) => <Link key={id} className={styles.link} href={`/finance/member-changes?record=${encodeURIComponent(id)}`}>查看关联帐变 →</Link>)}</div>
      </> : null}
      {kind === 'vip' ? <><p className={styles.caption}>历史门槛和 AI 基础日额度不会随当前配置修改。升级依据为有效加分；有效投注流水仅用于运营分析。加分流水引用：{row.relatedTransactionId || '历史未关联'}。</p><div className={styles.detailActions}><Link className={styles.link} href="/members/vip">VIP配置 →</Link><Link className={styles.link} href={`/finance/recharge-withdrawals?memberId=${row.memberId}`}>会员加减分记录 →</Link></div></> : null}
      {kind === 'bets' ? <>
        <h3>号码及开奖</h3><p className={styles.caption}>{row.selection?.areas?.map((area: Row, i: number) => `区域${i + 1}：${area.chosen?.join(' ') || '未记录'}`).join('；') || '历史选号未记录'}<br />开奖号码：{row.drawNumbers || '未记录'}；注数 × 倍数：{row.betCount || '未记录'} × {row.multiple || '未记录'}；规则版本：{row.ruleVersion || '未记录'}。</p>
        <h3>结算与更正记录</h3><SmallTable columns={[{ key: 'settlementVersion', label: '结算版本' }, { key: 'actionType', label: '动作', format: 'status' }, { key: 'dueAwardPoints', label: '应返', format: 'money' }, { key: 'postedPoints', label: '本次入账', format: 'money' }, { key: 'platformBornePoints', label: '平台承担', format: 'money' }, { key: 'completedAt', label: '完成时间', format: 'time' }]} rows={row.settlementHistory || []} />
        <h3>退款与追回</h3>{row.refund ? <SmallTable columns={[{ key: 'refundPoints', label: '退款积分', format: 'money' }, { key: 'recoveredAwardPoints', label: '追回返还', format: 'money' }, { key: 'platformBornePoints', label: '平台承担', format: 'money' }, { key: 'refundedAt', label: '退款时间', format: 'time' }, { key: 'reason', label: '原因' }]} rows={[row.refund]} /> : <p className={styles.caption}>没有退款记录。</p>}
      </> : null}
    </> : null}
  </Dialog>;
}

export const RechargeWithdrawalsPage = () => <OperationalReportPage kind="finance" />;
export const MemberChangesPage = () => <OperationalReportPage kind="changes" />;
export const AiParticipationsPage = () => <OperationalReportPage kind="ai" />;
export const ReferralRecordsPage = () => <OperationalReportPage kind="referrals" />;
export const VipUpgradeRecordsPage = () => <OperationalReportPage kind="vip" />;
export const MemberBetRecordsPage = () => <OperationalReportPage kind="bets" />;
export const BusinessDailyPage = () => <OperationalReportPage kind="daily" />;
export const StationBusinessPage = () => <OperationalReportPage kind="stationBusiness" />;
export const BudgetFlowsPage = () => <OperationalReportPage kind="budgetFlows" />;
export const ReconciliationReportPage = () => <OperationalReportPage kind="reconciliations" />;
export const ExceptionBacklogPage = () => <OperationalReportPage kind="exceptions" />;
export const AiBusinessReportPage = () => <OperationalReportPage kind="aiBusiness" />;
