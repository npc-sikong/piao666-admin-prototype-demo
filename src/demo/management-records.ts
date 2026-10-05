import { cents, money, eventTime } from './operational-records';
import { uid, type Row } from './seed';
export function ensureManagementFacts(s:Row) {
  if(s.managementFacts)return;
  s.managementFacts={version:1,sampleReconciliations:[
    {id:'report-recon-matched',status:'MATCHED',expectedPoints:'1000.00',actualPoints:'1000.00',differencePoints:'0.00',mismatchAccountCount:0,missingCount:0,createdAt:'2026-10-01T10:20:30+08:00',scopeName:'历史演示快照·单一账户',operatorName:'演示管理员',details:[],demoHistory:true},
    {id:'report-recon-mismatch',status:'MISMATCHED',expectedPoints:'5000.00',actualPoints:'4990.00',differencePoints:'-10.00',mismatchAccountCount:1,missingCount:0,createdAt:'2026-10-02T10:20:31+08:00',scopeName:'历史演示快照·AI预算',operatorName:'演示运营员',details:[{accountId:'demo-budget-3',accountName:'AI返还预算',businessNumber:'历史演示快照',expected:'5000.00',actual:'4990.00',difference:'-10.00'}],reason:'独立差异样例；不改变当前预算余额',demoHistory:true},
    {id:'report-recon-running',status:'RUNNING',expectedPoints:null,actualPoints:null,differencePoints:null,mismatchAccountCount:null,missingCount:null,createdAt:'2026-10-03T10:20:32+08:00',scopeName:'历史演示快照·处理中',operatorName:'演示管理员',details:[],reason:'展示待完成状态，不把未知差异填0',demoHistory:true},
  ]};
}
export function recordBudgetApproval(s:Row,batch:Row) {
  const budget=s.budgets.find((b:Row)=>b.type===batch.category),delta=cents(batch.points),before=cents(budget.availablePoints),time=eventTime(),id=uid('budget-transaction');
  budget.availablePoints=money(before+delta);batch.transactionId=id;batch.reviewedAt=time;
  s.ledgers.unshift({id,businessNumber:`DEMO-BUDGET-${batch.id}`,type:batch.kind==='INITIAL'?'PLATFORM_BUDGET_INITIALIZE':'PLATFORM_BUDGET_TOPUP',sourceType:'PLATFORM_BUDGET_BATCH',sourceId:batch.id,status:'POSTED',assetType:'POINTS',economicPoints:money(delta),reversedPoints:'0.00',operatorRealm:'ADMIN',operatorId:s.identity.employeeId,createdAt:time,reason:batch.reason,entries:[
    {id:`${id}-source`,accountId:`demo-source-${batch.id}`,ownerType:'BUDGET_SOURCE',ownerName:'授权演示预算来源',bucket:budget.type,changePoints:money(-delta),balanceBefore:money(delta),balanceAfter:'0.00',direction:'DEBIT'},
    {id:`${id}-main`,accountId:budget.id,ownerId:'demo-platform',ownerType:'PLATFORM',ownerName:'平台预算主账户',bucket:budget.type,changePoints:money(delta),balanceBefore:money(before),balanceAfter:budget.availablePoints,direction:'CREDIT'},
  ]});
}
export function budgetFlowSummary(s:Row,q:Row):Row {
  const now=new Date(),day=new Date(now.getTime()+8*3600000).toISOString().slice(0,10),period=q.period||'REALTIME';
  const from=q.from||(period==='DAY'?`${day}T00:00:00+08:00`:period==='MONTH'?`${day.slice(0,7)}-01T00:00:00+08:00`:null),to=q.to||null;
  const parse=(v:string,end=false)=>new Date(v.length===10?`${v}T${end?'23:59:59.999':'00:00:00'}+08:00`:/[zZ]|[+-]\d\d:\d\d$/.test(v)?v:`${v}+08:00`).getTime();
  const rows=s.budgets.map((budget:Row)=>{let inflow=0,outflow=0;for(const tx of s.ledgers as Row[]){const time=new Date(tx.createdAt).getTime();if(from&&time<parse(from)||to&&time>parse(to,true))continue;for(const e of tx.entries as Row[])if(e.accountId===budget.id&&e.ownerType==='PLATFORM'&&e.bucket!=='CONSUMPTION'){const n=cents(e.changePoints);if(n>0)inflow+=n;else outflow-=n;}}return {category:budget.type,inflowPoints:money(inflow),outflowPoints:money(outflow),netFlowPoints:money(inflow-outflow)};});
  return {from:from||'未限定',to:to||now.toISOString(),asOf:now.toISOString(),rows};
}
export function createDemoReconciliation(s:Row):Row {
  const id=uid('reconciliation'),time=eventTime(),details:Row[]=[];let expectedTotal=0,actualTotal=0,missing=0;
  for(const tx of s.ledgers as Row[]) {
    for(const e of tx.entries as Row[]) {
      const known=[e.balanceBefore,e.changePoints,e.balanceAfter].every(v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v)));
      if(!known){missing++;details.push({accountId:e.accountId,accountName:e.ownerName||e.ownerAccount||'未记录',businessNumber:tx.businessNumber,expected:null,actual:e.balanceAfter,difference:null,sourceHref:'/ledger'});continue;}
      const expected=cents(e.balanceBefore)+cents(e.changePoints),actual=cents(e.balanceAfter);expectedTotal+=expected;actualTotal+=actual;
      if(expected!==actual)details.push({accountId:e.accountId,accountName:e.ownerName||e.ownerAccount||'未记录',businessNumber:tx.businessNumber,expected:money(expected),actual:money(actual),difference:money(actual-expected),sourceHref:'/ledger'});
    }
    const sum=tx.entries.reduce((n:number,e:Row)=>n+cents(e.changePoints),0);
    if(sum)details.push({accountId:tx.id,accountName:'交易借贷合计',businessNumber:tx.businessNumber,expected:'0.00',actual:money(sum),difference:money(sum),sourceHref:'/ledger'});
  }
  const mismatches=details.filter(r=>r.difference!==null&&cents(r.difference)!==0);
  const row={id,status:mismatches.length?'MISMATCHED':missing?'INCOMPLETE':'MATCHED',expectedPoints:money(expectedTotal),actualPoints:money(actualTotal),differencePoints:money(actualTotal-expectedTotal),
    mismatchAccountCount:mismatches.length,missingCount:missing,createdAt:time,asOf:time,operatorId:s.identity.employeeId,scopeName:'本地已留存分录·前后数值与借贷平衡',details,
    reason:missing?'部分旧分录资料缺失，不能声称完整对账一致':mismatches.length?'分录数值或借贷平衡存在差异':'已留存分录校验一致；不代表真实数据库总账核对'};
  s.reconciliations[id]=row;return row;
}
