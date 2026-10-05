import { ApiError } from '../../shared/api-client';
import { createSeed, EMPLOYEE, make, page, points, ref, STAMP, uid, type Row } from './seed';
import { refreshMemberMetrics } from './member-metrics';
import { ensureOperationalState } from './operational-records';

export const STORAGE_KEY='piao666-admin-prototype-v1';
let freshState = true;
function initial() { try { const saved=localStorage.getItem(STORAGE_KEY);if(saved){const parsed=JSON.parse(saved);if(parsed.schemaVersion===2||parsed.schemaVersion===3){freshState=false;return parsed;}} } catch {} return createSeed(); }
export const state:Row=initial();
refreshMemberMetrics(state.members, state.ledgers);
ensureOperationalState(state, freshState);
persist();
export function persist(){ try { localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); } catch { /* File preview and private mode still work in memory. */ } }
export function fail(code:string,message:string,status=400):never { throw new ApiError({type:'about:blank',title:message,code,status,requestId:'demo',traceId:'demo',retryable:false},null,'REJECTED'); }
export function find(rows:Row[],id:string):Row { const row=rows.find(x=>(x.id||x.robot?.id)===id);return row||fail('NOT_FOUND','演示记录不存在',404); }
export function update(row:Row,props:Row){ Object.assign(row,props,{version:String(Number(row.version||0)+1)});return row; }
export function filtered(rows:Row[],q:Row={}):Row[]{
  return rows.filter(row=>{
    const item=row.robot?{...row,...row.robot}:row;
    if(q.vipLevelId&&item.vipName!==state.vip.levels.find((l:Row)=>l.id===q.vipLevelId)?.name)return false;
    if(q.referralLevelId&&item.referralName!==state.referral.levels.find((l:Row)=>l.id===q.referralLevelId)?.name)return false;
    if(q.drawFrom&&item.drawDate<q.drawFrom)return false;
    if(q.drawTo&&item.drawDate>q.drawTo)return false;
    for(const key of ['status','lotteryId','projectId','memberId','stationId','stationMasterId','issueCode','strategyCode','type','sourceType','actorId','operationId','resourceId']){
      if(!q[key])continue;
      const actual=item[key]??(key==='stationId'?item.station?.id||item.scope?.station?.id:key==='stationMasterId'?item.scope?.stationMaster?.id:null);
      if(key==='lotteryId'&&item.lotteryIds){if(!item.lotteryIds.includes(q[key]))return false;}
      else if(actual!==q[key])return false;
    }
    const keyword=q.keyword||q.account||q.search||q.businessNumber||q.stationMaster;
    if(keyword&&!JSON.stringify(item).toLowerCase().includes(String(keyword).toLowerCase()))return false;
    if(q.assetType&&item.assetType!==q.assetType)return false;
    if(q.direction&&!item.entries?.some((e:Row)=>e.direction===q.direction&&(!q.account||JSON.stringify(e).includes(q.account))))return false;
    const date=item.createdAt;
    if(date){const time=new Date(date).getTime();const start=q.from?new Date(q.from.length===10?q.from+'T00:00:00+08:00':q.from).getTime():-Infinity;const end=q.to?new Date(q.to.length===10?q.to+'T23:59:59+08:00':q.to).getTime():Infinity;if(time<start||time>end)return false;}
    return true;
  });
}
export function paged(rows:Row[],q:Row={}) { const items=filtered(rows,q);const start=Number(q.cursor||0),limit=Number(q.limit||50);return {...page(items.slice(start,start+limit)),totalCount:items.length,hasMore:start+limit<items.length,nextCursor:start+limit<items.length?String(start+limit):null}; }
export function receipt(operationId:string,resourceId:string){return {commandId:uid('command'),operationId,resourceId,status:'COMPLETED',createdAt:STAMP};}
export function task(taskType:string,resultUrl:string|null=null){
  const id=uid('task');const status={id,taskType,status:'SUCCEEDED',progress:1,resultUrl,resultCode:'COMPLETED',failureCode:null,updatedAt:new Date().toISOString()};state.tasks[id]=status;
  return {taskId:id,status:'PENDING',statusUrl:resultUrl||`/api/admin/v1/tasks/${id}`,pollAfterSeconds:1};
}
export function audit(path:string,body:Row){state.audits.unshift(make('employee-security','AuditView',{id:uid('audit'),actorId:state.identity.employeeId,operationId:path.split('/').filter(Boolean).slice(-1)[0],resourceId:body.resourceId||path.split('/').slice(-2,-1)[0]||'demo',reason:body.reason||'演示操作',beforeVersion:'1',afterVersion:'2',resultCode:'COMPLETED',createdAt:new Date().toISOString(),traceId:uid('trace')}));}
export function localLedger(master:Row,amount:number,reason:string,member?:Row){
  const before=Number(master.disposablePoints);master.disposablePoints=points(before+amount);
  const id=uid('demo-transaction');const tx=make('ledger-management','AdminLedgerTransaction',{id,sequence:String(1000+state.ledgers.length),businessNumber:`DEMO${state.ledgers.length+1}`,type:amount>=0?'ADMIN_GRANT':'ADMIN_DEDUCT',sourceType:'ADMIN_ADJUSTMENT',sourceId:master.id,status:'POSTED',economicPoints:points(Math.abs(amount)),reversedPoints:'0.00',stationId:master.station.id,stationCode:master.station.code,stationName:master.station.name,stationMasterId:master.id,stationMasterCode:master.code,stationMasterName:master.name,memberId:member?.id||null,operatorRealm:'ADMIN',operatorId:EMPLOYEE,reason,createdAt:STAMP,
    entries:[make('ledger-management','AdminLedgerEntry',{id:uid('entry'),entryNo:1,accountId:master.id,ownerType:'STATION_MASTER',ownerId:master.id,ownerAccount:master.account,ownerName:master.name,bucket:'DISPOSABLE',direction:amount>=0?'CREDIT':'DEBIT',changePoints:points(amount),balanceBefore:points(before),balanceAfter:master.disposablePoints}),make('ledger-management','AdminLedgerEntry',{id:uid('entry'),entryNo:2,accountId:'demo-budget-1',ownerType:'PLATFORM',ownerId:'demo-platform',bucket:'AVAILABLE',direction:amount>=0?'DEBIT':'CREDIT',changePoints:points(-amount),balanceBefore:state.budgets[0].availablePoints,balanceAfter:points(Number(state.budgets[0].availablePoints)-amount)})]});
  state.ledgers.unshift(tx);state.budgets[0].availablePoints=points(Number(state.budgets[0].availablePoints)-amount);
  return make('station-management','PointChangeReceipt',{transactionId:id,operationType:tx.type,points:points(Math.abs(amount)),stationMasterId:master.id,stationMasterBalanceBefore:points(before),stationMasterBalanceAfter:master.disposablePoints,createdAt:STAMP});
}
export function ledgerViews(q:Row={}) {return filtered(state.ledgers,q).map(tx=>{const entry=tx.entries.find((e:Row)=>q.memberId?e.ownerId===q.memberId:e.ownerType==='STATION_MASTER')||tx.entries[0];return make('member-management','LedgerView',{id:entry.id,transactionId:tx.id,type:tx.type,bucket:entry.bucket,changePoints:entry.changePoints,balanceBefore:entry.balanceBefore,balanceAfter:entry.balanceAfter,sourceType:tx.sourceType,sourceId:tx.sourceId,remark:tx.reason,createdAt:tx.createdAt});});}
// Local presentation state: makes a simulated receipt visible in member and ledger pages.
export function creditDemoMember(memberId:string,amount:number,context:Row){
  const member=find(state.members,memberId),budget=find(state.budgets,context.budgetId),id=uid('demo-transaction');
  const before=Number(member.wallet.availablePoints),budgetBefore=Number(budget.availablePoints);
  const metric = context.type === 'AI_AWARD' ? 'aiDividendPoints' : context.type.startsWith('REFERRAL_') ? 'totalReferralPoints' : 'netProfitPoints';
  member[metric] = points(Number(member[metric]) + amount);
  member.wallet.availablePoints=points(before+amount);budget.availablePoints=points(budgetBefore-amount);
  state.ledgers.unshift(make('ledger-management','AdminLedgerTransaction',{
    id,sequence:String(1001+state.ledgers.length),businessNumber:`DEMO${state.ledgers.length+1}`,assetType:'POINTS',status:'POSTED',
    type:context.type,sourceType:context.sourceType,sourceId:context.sourceId,issueCode:context.issueCode,
    economicPoints:points(amount),reversedPoints:'0.00',stationId:member.scope.station.id,stationCode:member.scope.station.code,stationName:member.scope.station.name,
    stationMasterId:member.scope.stationMaster.id,stationMasterCode:member.scope.stationMaster.code,stationMasterName:member.scope.stationMaster.name,memberId,
    operatorRealm:'ADMIN',operatorId:state.identity.employeeId,reason:context.reason||'本地演示发放',createdAt:new Date().toISOString(),
    entries:[make('ledger-management','AdminLedgerEntry',{id:uid('entry'),entryNo:1,accountId:budget.id,ownerType:'PLATFORM',ownerId:'demo-platform',ownerName:'平台演示预算',bucket:'AVAILABLE',direction:'DEBIT',changePoints:points(-amount),balanceBefore:points(budgetBefore),balanceAfter:budget.availablePoints}),
      make('ledger-management','AdminLedgerEntry',{id:uid('entry'),entryNo:2,accountId:member.id,ownerType:'MEMBER',ownerId:member.id,ownerAccount:member.account,ownerName:member.displayName,bucket:'AVAILABLE',direction:'CREDIT',changePoints:points(amount),balanceBefore:points(before),balanceAfter:member.wallet.availablePoints})],
  }));
  return id;
}
export { make,page,points,ref,STAMP,uid };
