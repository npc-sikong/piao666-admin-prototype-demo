import { state } from './state';
import { cents, money } from './operational-records';
import type { Row } from './seed';
import { reportDefinitions, valueLabels, type ReportKind, type ReportColumn } from '@/features/operational-reports/report-config';
import { budgetSnapshotColumns, managementDefinitions, type ManagementKind } from '@/features/operational-reports/management-definitions';
import { timeMatches, matches, reportDate, type OperationalFilters, type OperationalReportResult, type ReportMetric } from './operational-reports';
type Query=(kind:ReportKind,f:OperationalFilters)=>OperationalReportResult;
export const isManagementReport=(kind:ReportKind):kind is ManagementKind => kind in managementDefinitions;
const sum=(rows:Row[],key:string)=>rows.reduce((n,r)=>n+(Number.isFinite(Number(r[key]))?cents(r[key]):0),0);
const metric=(label:string,value:string,detail='当前筛选全部记录'):ReportMetric=>({label,value,detail});
const operator=(id:string)=>state.employees.find((r:Row)=>r.id===id)?.name||state.stationMasters.find((r:Row)=>r.id===id)?.name||(id==='demo-system'?'系统（演示）':'未记录');
const detailsColumns:ReportColumn[]=[{key:'memberAccount',label:'会员账号'},{key:'businessNumber',label:'业务单号'},{key:'eventName',label:'业务事件'},{key:'delta',label:'本次积分',format:'money'},{key:'createdAt',label:'发生时间',format:'time'},{key:'sourceHref',label:'关联业务'}];
function base(f:OperationalFilters):OperationalFilters{return {...f,ownerType:'',budgetType:'',priority:'',status:'',type:'',keyword:'',amountMin:'',amountMax:'',deltaMin:'',deltaMax:'',balanceMin:'',balanceMax:'',accountType:'',direction:'',from:'',to:'',dateField:'createdAt',winLoss:'',referralLevel:'',sourceMember:'',beforeLevel:'',afterLevel:'',drawStatus:'',participationStatus:'',reversal:''};}

function businessEvents(f:OperationalFilters,q:Query):Row[] {
  const all:Row[]=[],b=base(f);
  const add=(r:Row,time:unknown,eventName:string,values:Row,isParticipation=false)=>{if(!time||!timeMatches(time,f))return;all.push({...r,id:`${r.id}-${eventName}`,createdAt:time,eventName,...values,isParticipation,businessNumber:r.businessNumber||r.id,delta:values.delta??values.granted??values.deducted??values.ordinaryPurchase??values.aiPurchase??values.ordinaryPosted??values.aiPosted??values.rewardPosted??values.refund??'0.00'});};
  for(const r of q('finance',b).rows)add(r,r.createdAt,r.operation+(r.transaction.referenceTransactionId?'冲正':''),r.rootType==='STATION_VIP_CREDIT'?{granted:r.delta}:{deducted:money(-cents(r.delta))});
  for(const r of q('bets',b).rows){add(r,r.createdAt,'普通下单',{ordinaryPurchase:r.purchase},true);if(r.effective)add(r,r.settledAt,'普通有效结算',{validStake:r.purchase,ordinaryProfit:r.profit});}
  for(const r of q('ai',b).rows)for(const sub of r.subscriptions){add({...r,businessNumber:sub.id},sub.createdAt,'AI认购',{aiPurchase:sub.points},true);if(sub.status==='REFUNDED')add({...r,businessNumber:sub.id},sub.refundedAt,'AI退款',{aiPurchase:money(-cents(sub.points)),refund:sub.points});}
  for(const r of q('changes',{...b,accountType:'AVAILABLE'}).rows){
    if(['ORDINARY_AWARD','ORDINARY_CORRECTION_CREDIT','ORDINARY_CORRECTION_RECOVERY'].includes(r.rootType))add(r,r.createdAt,'普通返还/更正',{ordinaryPosted:r.delta});
    else if(['AI_AWARD','AI_PAYOUT_POSTED'].includes(r.rootType))add(r,r.createdAt,'AI返还',{aiPosted:r.delta});
    else if(['REFERRAL_FIXED_REWARD','REFERRAL_AI_SHARE','REFERRAL_REWARD_RECOVERY'].includes(r.rootType))add(r,r.createdAt,'推广发放/回收',{rewardPosted:r.delta});
    else if(r.rootType==='ORDINARY_REFUND')add(r,r.createdAt,'普通退款',{refund:r.delta});
  }
  return all;
}
const businessKeys=['granted','deducted','ordinaryPurchase','validStake','ordinaryPosted','ordinaryProfit','aiPurchase','aiPosted','rewardPosted','refund'];
function businessGroup(rows:Row[]):Row {return {...Object.fromEntries(businessKeys.map(k=>[k,money(sum(rows,k))])),activeCount:new Set(rows.filter(r=>r.isParticipation).map(r=>r.memberId)).size,detailRows:rows,detailColumns:detailsColumns};}
function dailyRows(events:Row[],f:OperationalFilters):Row[]{
  const grouped=new Map<string,Row[]>();for(const e of events){const day=reportDate(e.createdAt).slice(0,10),key=`${day}:${e.stationId||'unknown'}:${e.stationMasterId||'unknown'}`;grouped.set(key,[...(grouped.get(key)||[]),e]);}
  return [...grouped.entries()].map(([id,rows])=>{const r=rows[0],reportDay=reportDate(r.createdAt).slice(0,10);return {id,reportDay,createdAt:`${reportDay}T00:00:00+08:00`,stationId:r.stationId,stationName:r.stationName,stationMasterId:r.stationMasterId,stationMasterName:r.stationMasterName,...businessGroup(rows),amount:money(sum(rows,'ordinaryPurchase')+sum(rows,'aiPurchase')),sourceHref:'/reports/station-business',drillLinks:drillLinks(r,reportDay,f)};});
}
function drillLinks(r:Row,day?:string,f?:OperationalFilters):Row[]{
  const p=new URLSearchParams();if(r.stationId)p.set('stationId',r.stationId);if(r.stationMasterId)p.set('stationMasterId',r.stationMasterId);if(day){p.set('from',`${day}T00:00:00`);p.set('to',`${day}T23:59:59`);}if(f?.from&&(!day||f.from>`${day}T00:00:00`))p.set('from',f.from);if(f?.to&&(!day||f.to<`${day}T23:59:59`))p.set('to',f.to);
  return [['加减分记录','/finance/recharge-withdrawals'],['普通下单记录','/reports/member-bets'],['普通结算记录','/reports/member-bets?dateField=settledAt'],['AI参与记录','/reports/ai-participations'],['推广奖励明细','/reports/referrals?tab=rewards']].map(([label,href])=>({label,href:`${href}${href.includes('?')?'&':'?'}${p}`}));
}
function stationRows(events:Row[],f:OperationalFilters):Row[]{
  const isStation=f.groupBy==='station',groups=new Map<string,Row>();
  const group=(id:string,name:string,stationId:string,stationName:string,stationMasterId?:string)=>{if(!groups.has(id))groups.set(id,{id,groupName:name,stationId,stationName,stationMasterId,stationMasterName:isStation?null:name,currentMembers:[],events:[]});return groups.get(id)!;};
  for(const m of state.members as Row[]){if(f.stationId&&m.scope.station.id!==f.stationId||f.stationMasterId&&m.scope.stationMaster.id!==f.stationMasterId||f.account&&!`${m.account} ${m.displayName}`.includes(f.account))continue;const ref=isStation?m.scope.station:m.scope.stationMaster;group(ref.id,ref.name,m.scope.station.id,m.scope.station.name,isStation?undefined:ref.id).currentMembers.push(m);}
  for(const e of events){const id=(isStation?e.stationId:e.stationMasterId)||'unknown';group(id,(isStation?e.stationName:e.stationMasterName)||'未记录',e.stationId,e.stationName,isStation?undefined:e.stationMasterId).events.push(e);}
  return [...groups.values()].map(g=>({...g,...businessGroup(g.events),memberCount:g.currentMembers.length,available:money(g.currentMembers.reduce((n:number,m:Row)=>n+cents(m.wallet.availablePoints),0)),reserved:money(g.currentMembers.reduce((n:number,m:Row)=>n+cents(m.wallet.reservedPoints),0)),asOf:new Date().toISOString(),amount:money(sum(g.events,'ordinaryPurchase')+sum(g.events,'aiPurchase')),primaryHref:'/stations',sourceHref:'/stations',drillLinks:drillLinks(g,undefined,f)}));
}

function budgetRows():Row[]{
  const rows:Row[]=[];
  for(const tx of state.ledgers as Row[])for(const e of tx.entries as Row[]){
    const budget=state.budgets.find((b:Row)=>b.id===e.accountId),master=state.stationMasters.find((m:Row)=>m.id===e.accountId||m.id===e.ownerId);
    if(e.ownerType!=='PLATFORM'&&e.ownerType!=='STATION_MASTER'||e.ownerType==='PLATFORM'&&!budget||e.ownerType==='STATION_MASTER'&&!master||e.bucket==='CONSUMPTION')continue;
    rows.push({id:`${tx.id}:${e.id}`,memberAccount:budget?.type||master?.account,accountId:e.accountId,accountName:budget?`${valueLabels[budget.type]||budget.type}`:master.name,ownerType:e.ownerType,budgetType:budget?.type||'DISPOSABLE',stationId:tx.stationId,stationName:tx.stationName||'未记录',stationMasterId:tx.stationMasterId,stationMasterName:tx.stationMasterName||'未记录',createdAt:tx.createdAt,type:tx.type,delta:e.changePoints,amount:money(Math.abs(cents(e.changePoints))),before:e.balanceBefore,after:e.balanceAfter,businessNumber:tx.businessNumber,operatorName:operator(tx.operatorId),remark:tx.reason,transaction:tx,entry:e,sourceHref:'/ledger',primaryHref:budget?'/ledger':'/stations'});
  }
  for(const b of state.budgetBatches.filter((r:Row)=>r.status==='APPROVED'&&!state.ledgers.some((t:Row)=>t.id===r.transactionId))){const budget=state.budgets.find((r:Row)=>r.type===b.category);rows.push({id:`legacy-budget-${b.id}`,memberAccount:b.category,accountId:budget?.id,accountName:`${valueLabels[b.category]||b.category}`,ownerType:'PLATFORM',budgetType:b.category,createdAt:b.reviewedAt||null,type:b.kind==='INITIAL'?'PLATFORM_BUDGET_INITIALIZE':'PLATFORM_BUDGET_TOPUP',delta:b.points,amount:b.points,before:null,after:null,businessNumber:b.id,operatorName:operator(b.reviewedBy),remark:'旧审批记录；历史审批时间/余额未留存时不推算',sourceHref:'/ledger'});}
  return rows;
}
function budgetSnapshots(flows:Row[],f:OperationalFilters):Row[]{
  const accounts=[...state.budgets.map((b:Row)=>({id:b.id,accountName:`${valueLabels[b.type]||b.type}`,memberAccount:b.type,ownerType:'PLATFORM',budgetType:b.type,available:b.availablePoints,reserved:b.reservedPoints})),...state.stationMasters.map((m:Row)=>({id:m.id,accountName:m.name,memberAccount:m.account,ownerType:'STATION_MASTER',budgetType:'DISPOSABLE',stationId:m.station.id,stationName:m.station.name,stationMasterId:m.id,stationMasterName:m.name,available:m.disposablePoints,reserved:m.reservedPoints??null}))];
  return accounts.map(a=>{const detailRows=flows.filter(r=>r.accountId===a.id&&timeMatches(r.createdAt,f)),inflow=sum(detailRows.filter(r=>cents(r.delta)>0),'delta'),outflow=-sum(detailRows.filter(r=>cents(r.delta)<0),'delta');return {...a,inflow:money(inflow),outflow:money(outflow),netFlow:money(inflow-outflow),asOf:new Date().toISOString(),amount:a.available,detailRows,detailColumns:reportDefinitions.budgetFlows.columns,sourceHref:'/ledger'};});
}
function reconciliationRows():Row[]{return [...state.managementFacts.sampleReconciliations,...Object.values(state.reconciliations)].map((r:Row)=>({...r,businessNumber:r.id,scopeName:r.scopeName||'旧对账范围未记录',expected:r.expectedPoints??null,actual:r.actualPoints??null,difference:r.differencePoints??null,mismatchCount:r.mismatchAccountCount??null,missingCount:r.missingCount??null,createdAt:r.createdAt||r.asOf,operatorName:r.operatorName||operator(r.operatorId),sourceHref:'/ledger',amount:r.differencePoints===null||r.differencePoints===undefined?null:money(r.details?.length?r.details.reduce((n:number,d:Row)=>n+Math.abs(cents(d.difference)),0):Math.abs(cents(r.differencePoints))),detailRows:r.details||[],detailColumns:[{key:'accountName',label:'差异账户/校验项'},{key:'businessNumber',label:'关联单号'},{key:'expected',label:'预期',format:'money'},{key:'actual',label:'实测',format:'money'},{key:'difference',label:'差异',format:'money'},{key:'sourceHref',label:'关联业务'}]}));}
function aiBusinessRows(q:Query,f:OperationalFilters):Row[]{
  const members=q('ai',base({...f,account:'',stationId:'',stationMasterId:'',projectId:'',issueCode:'',lotteryId:'',playId:''})).rows;
  return state.pools.map((p:Row)=>{const rows=members.filter(r=>r.pool.id===p.id),allocation=state.allocations.filter((a:Row)=>a.poolIssueId===p.id&&a.status!=='SUPERSEDED').at(-1),batches=state.payouts.filter((b:Row)=>b.poolIssueId===p.id),known=p.totalWinningPoints!==null&&p.totalWinningPoints!==undefined,purchase=sum(rows,'purchase'),due=known?sum(rows,'due'):null,posted=sum(rows,'posted'),total=known?cents(p.totalWinningPoints):null,platformReturn=total===null||due===null?null:total-due,final=p.status==='SETTLED'&&due!==null&&posted>=due,profit=final?posted-purchase:null;
    return {id:p.id,projectId:p.projectId,projectName:state.projects.find((r:Row)=>r.id===p.projectId)?.name||'未记录',lotteryId:p.lotteryId,lotteryName:state.catalog.lotteries.find((r:Row)=>r.id===p.lotteryId)?.name||'未记录',issueCode:p.issueCode,status:p.status,participantCount:rows.filter(r=>cents(r.purchase)>0).length,participationCount:rows.reduce((n:number,r:Row)=>n+r.participationCount,0),purchase:money(purchase),platformPoints:p.platformPoints,totalPurchase:money(purchase+cents(p.platformPoints)),due:due===null?null:money(due),posted:money(posted),pending:due===null?null:money(Math.max(due-posted,0)),platformReturn:platformReturn===null?null:money(platformReturn),platformProfit:platformReturn===null?null:money(platformReturn-cents(p.platformPoints)),profit:profit===null?null:money(profit),memberRate:profit!==null&&purchase?profit/purchase:null,createdAt:p.generatedAt||p.createdAt||null,postedAt:rows.map(r=>r.postedAt).filter(Boolean).sort().at(-1)||null,valueState:known?'待完成发放':'待开奖',effective:final,amount:money(purchase),primaryHref:`/ai-pools/${p.id}`,sourceHref:`/ai-pools/${p.id}`,detailRows:rows,detailColumns:reportDefinitions.ai.columns,drillLinks:[{label:'该期会员参与',href:`/reports/ai-participations?projectId=${p.projectId}&issueCode=${p.issueCode}`},{label:'额度分配与开奖',href:`/ai-pools/${p.id}/allocation`},{label:'发放批次与重试',href:`/ai-pools/${p.id}/payout`}],allocation};
  });
}
function exceptionRows(q:Query,f:OperationalFilters):Row[]{
  const rows:Row[]=[],b=base(f);const add=(id:string,type:string,priority:string,r:Row,reason:string,nextAction:string)=>rows.push({...r,id,type,priority,reason,nextAction,businessNumber:r.businessNumber||id,amount:type==='RECON_BACKLOG'?r.amount:r.pending||r.approvalAmount||money(Math.abs(cents(r.difference))),notApplicableFields:type==='RECON_BACKLOG'?['pending','approvalAmount','memberAccount','stationName','stationMasterName']:type==='BUDGET_REVIEW'?['pending','difference','memberAccount','stationName','stationMasterName']:['difference','approvalAmount']});
  for(const r of aiBusinessRows(q,b))if(r.status==='EXCEPTION_PENDING'||cents(r.pending)>0){add(`ai:${r.id}`,'AI_BACKLOG','P2',{...r,createdAt:r.postedAt||null},r.status==='EXCEPTION_PENDING'?'当前期次计算/结算异常，需在原模块查看失败原因':'已形成会员返还但尚未全部到账','核对开奖及公示，再在发放批次查看或重试');}
  for(const r of q('bets',b).rows)if(['AWARD_PENDING_BUDGET','CORRECTING','SETTLING','CANCELLING'].includes(r.status)){add(`order:${r.id}`,'ORDINARY_BACKLOG','P2',{...r,pending:r.due===null?null:money(Math.max(cents(r.due)-cents(r.posted),0))},r.status==='AWARD_PENDING_BUDGET'?'普通返还预算不足':'订单结算/修正待完成','核对普通返还预算和订单结算记录，进入订单恢复任务');}
  for(const r of q('referrals',{...b,referralTab:'rewards'}).rows)if(cents(r.pending)>0)add(`reward:${r.id}`,'REFERRAL_BACKLOG','P2',{...r,sourceHref:`/reports/referrals?tab=rewards&record=${encodeURIComponent(r.id)}`},r.status==='PENDING_BUDGET'?'推广预算不足':'奖励义务尚未全部发放','查看历史奖励政策、资格和推广预算，在奖励明细核对');
  for(const r of reconciliationRows())if(r.status==='MISMATCHED')add(`recon:${r.id}`,'RECON_BACKLOG','P1',r,'已保存对账快照存在差异，后续操作不会覆盖历史结果','先核对差异项和原始分录，必要时进入账本处理');
  for(const r of state.budgetBatches as Row[])if(r.status==='PENDING_REVIEW')add(`budget:${r.id}`,'BUDGET_REVIEW','P3',{...r,approvalAmount:r.points,operatorName:operator(r.authorId),sourceHref:'/ledger'},'预算申请等待另一名员工独立复核','进入平台预算模块，由非申请人复核；通过后才计入收支');
  return rows;
}

export function queryManagementReport(kind:ManagementKind,f:OperationalFilters,q:Query):OperationalReportResult {
  let sourceRows:Row[],rows:Row[],columns=reportDefinitions[kind].columns,metrics:ReportMetric[]=[];
  if(kind==='daily'||kind==='stationBusiness'){
    const events=businessEvents(f,q);sourceRows=kind==='daily'?dailyRows(events,f):stationRows(events,f);rows=sourceRows.filter(r=>matches(r,kind,{...f,from:'',to:'',account:''}));
    const selected=new Set(rows.map(r=>r.id)),picked=sourceRows.filter(r=>selected.has(r.id)).flatMap(r=>r.detailRows);
    metrics=[metric('期间参与会员数',String(new Set(picked.filter(r=>r.isParticipation).map(r=>r.memberId)).size),'跨日期与站点去重'),metric('会员加分净额',money(sum(rows,'granted'))),metric('普通有效投注',money(sum(rows,'validStake')),'结算日口径'),metric('AI净参与积分',money(sum(rows,'aiPurchase'))),metric('实际返还到账',money(sum(rows,'ordinaryPosted')+sum(rows,'aiPosted'))),metric('推广净发放',money(sum(rows,'rewardPosted')))];
  }else if(kind==='budgetFlows'){
    const flows=budgetRows();sourceRows=f.budgetMode==='snapshot'?budgetSnapshots(flows,f):flows;columns=f.budgetMode==='snapshot'?budgetSnapshotColumns:columns;
    rows=sourceRows.filter(r=>matches(r,kind,f.budgetMode==='snapshot'?{...f,from:'',to:''}:f));const increased=f.budgetMode==='snapshot'?sum(rows,'inflow'):sum(rows.filter(r=>cents(r.delta)>0),'delta'),decreased=f.budgetMode==='snapshot'?sum(rows,'outflow'):-sum(rows.filter(r=>cents(r.delta)<0),'delta');
    metrics=[metric('已记录增加',money(increased)),metric('已记录减少',money(decreased)),metric('已记录净变动',money(increased-decreased),'全部账户包含内部拨付双方，非经营利润'),metric(f.budgetMode==='snapshot'?'当前可用预算':'账户分录数',f.budgetMode==='snapshot'?money(sum(rows,'available')):String(rows.length))];
  }else if(kind==='reconciliations'){
    sourceRows=reconciliationRows();rows=sourceRows.filter(r=>matches(r,kind,f));const failed=rows.filter(r=>r.status==='MISMATCHED');metrics=[metric('对账次数',String(rows.length)),metric('差异任务数',String(failed.length)),metric('差异项数',String(failed.reduce((n,r)=>n+Number(r.mismatchCount||0),0))),metric('差异绝对值合计',money(failed.reduce((n,r)=>n+(r.detailRows.length?r.detailRows.reduce((v:number,d:Row)=>v+Math.abs(cents(d.difference)),0):Math.abs(cents(r.difference))),0)),'各次快照仅用于核对，不能当作余额汇总')];
  }else if(kind==='exceptions'){
    sourceRows=exceptionRows(q,f);rows=sourceRows.filter(r=>matches(r,kind,f));metrics=[metric('待办数',String(rows.length)),metric('待会员到账积分',money(sum(rows.filter(r=>['AI_BACKLOG','ORDINARY_BACKLOG','REFERRAL_BACKLOG'].includes(r.type)),'pending'))),metric('账务差异绝对值',money(sum(rows.filter(r=>r.type==='RECON_BACKLOG'),'amount')),'按各项绝对差异统计，净差额为零仍可能异常'),metric('待审批预算',money(sum(rows,'approvalAmount')),'未计入预算收支')];
  }else{
    sourceRows=aiBusinessRows(q,f);rows=sourceRows.filter(r=>matches(r,kind,f));const completed=rows.filter(r=>r.effective),stake=sum(completed,'purchase'),profit=sum(completed,'profit');metrics=[metric('合买期次数',String(rows.length)),metric('会员有效参与',money(sum(rows,'purchase'))),metric('会员实际到账',money(sum(rows,'posted'))),metric('已知会员待到账',money(sum(rows,'pending'))),metric('会员已结算净收益',money(profit)),metric('会员加权收益率',stake?`${(profit/stake*100).toFixed(2)}%`:'未记录','只包含已完成发放期次')];
  }
  rows.sort((a,b)=>new Date(b.createdAt||0).getTime()-new Date(a.createdAt||0).getTime()||a.id.localeCompare(b.id));
  return {sourceRows,rows,columns,metrics,asOf:new Date().toISOString()};
}
