import { state,find,paged,filtered,make,page,task,update,uid,STAMP,receipt,fail,ref,points,localLedger,ledgerViews,creditDemoMember } from './state';
import { selectionFor,AUTHOR,type Row } from './seed';

export function businessAction(path:string,method:string,b:Row,q:Row):any {
  let m=path.match(/^\/(stations|station-masters|members|employees)(?:\/([^/]+)(?:\/(.+))?)?$/);
  if(m){const [,kind,id,action]=m;const key=kind==='station-masters'?'stationMasters':kind;const rows=state[key] as Row[];
    if(!id){if(method==='GET')return paged(rows,q);
      const newId=uid(`demo-${kind}`);let row:Row;
      if(kind==='stations')row=make('station-management','Station',{...b,id:newId,code:b.code||`ST${String(rows.length+1).padStart(3,'0')}`,status:'ENABLED',stationMasterCount:0,memberCount:0,version:'1'});
      else if(kind==='station-masters'){row=make('station-management','StationMaster',{...b,id:newId,code:`SM${String(rows.length+1).padStart(3,'0')}`,userId:uid('demo-user'),station:ref(find(state.stations,b.stationId)),status:'ENABLED',disposablePoints:'0.00',memberCount:0,operationCredentialConfigured:true,identityVersion:'1',version:'1'});delete row.initialPassword;delete row.operationPassword;delete row.password;if(Number(b.initialDisposablePoints||b.initialPoints||b.initialGrantPoints||0)>0)localLedger(row,Number(b.initialDisposablePoints||b.initialPoints||b.initialGrantPoints),b.reason);find(state.stations,b.stationId).stationMasterCount++;}
      else if(kind==='employees')row={id:newId,account:b.account,name:b.name,status:'ENABLED',roleIds:b.roleIds,scopeStationIds:b.scopeStationIds,version:'1'};
      else return fail('DEMO_UNSUPPORTED','原版没有新增会员入口');
      rows.unshift(row);return row;
    }
    const row=find(rows,id);
    if(!action){if(method==='GET')return row;const patch={...b};delete patch.password;delete patch.newPassword;delete patch.initialPassword;if(b.stationId)patch.station=ref(find(state.stations,b.stationId));return update(row,patch);}
    if(action==='status'){update(row,{status:b.status});return row;}
    if(action==='permissions')return update(row,{roleIds:b.roleIds,scopeStationIds:b.scopeStationIds});
    if(action==='recovery'||action==='password'){update(row,{identityVersion:String(Number(row.identityVersion||0)+1)});return action==='recovery'?row:null;}
    if(action==='membership-migrations'){row.scope={...row.scope,referrerMember:b.referrerMemberId?ref(find(state.members,b.referrerMemberId)):null,station:ref(find(state.stations,b.targetStationId||b.stationId)),stationMaster:ref(find(state.stationMasters,b.targetStationMasterId||b.stationMasterId)),version:String(Number(row.scope.version)+1)};update(row,{});return receipt('migrateMemberMembership',id);}
    if(action==='migrations'){const station=find(state.stations,b.targetStationId);row.station=ref(station);if(b.moveOwnedMembers)for(const member of state.members.filter((x:Row)=>x.scope.stationMaster.id===id))member.scope.station=ref(station);return task('STATION_MASTER_MIGRATION');}
    if(action==='points/adjustments'){const amount=Number(b.points)*(b.type==='ADMIN_DEDUCT'?-1:1);if(Number(row.disposablePoints)+amount<0)fail('INSUFFICIENT_POINTS','演示额度不足');return localLedger(row,amount,b.reason);}
    if(action==='point-ledgers')return paged(ledgerViews({memberId:id}),q);
    if(action==='orders')return paged(state.orders,{...q,memberId:id});
  }
  if(path==='/roles')return page(state.roles);
  if(path==='/audit-events')return paged(state.audits,q);
  if(path==='/station-master-point-ledgers')return paged(ledgerViews(q),{cursor:q.cursor,limit:q.limit});
  m=path.match(/^\/(vip|referral)-level-configurations(?:\/(current))?$/);
  if(m){const key=m[1],history=state[key+'History'];if(!m[2])return page([state[key],...history]);if(method==='GET')return state[key];history.unshift(structuredClone(state[key]));update(state[key],{levels:b.levels,...(key==='referral'?{fixedRewardPolicyVersion:b.fixedRewardPolicyVersion,aiSharePolicyVersion:b.aiSharePolicyVersion}:{}),qualificationStatus:'READY',createdAt:STAMP});return state[key];}
  if(path==='/qualification-rebuilds'){state.vip.qualificationStatus='READY';state.referral.qualificationStatus='READY';return task('QUALIFICATION_REBUILD');}
  m=path.match(/^\/ordinary-orders(?:\/([^/]+)(?:\/(settlement-retries))?)?$/);
  if(m){if(!m[1])return paged(state.orders,q);const order=find(state.orders,m[1]);
    if(m[2]){const remaining=Number(order.dueAwardPoints||0)-Number(order.netPostedAwardPoints);if(remaining>0)order.awardTransactionId=creditDemoMember(order.memberId,remaining,{budgetId:'demo-budget-2',type:'ORDINARY_AWARD',sourceType:'ORDINARY_ORDER',sourceId:order.id,issueCode:order.issueCode,reason:b.reason});order.status='SETTLED';order.netPostedAwardPoints=order.dueAwardPoints||'0.00';return task('ORDINARY_SETTLEMENT');}
    return make('order-management','AdminOrderDetail',{order,selection:order.selection||selectionFor('SSQ'),recommendationId:null,betCount:'10',multiple:1,ruleVersion:'FORMAL-20260919-V1',simulationRuleVersion:'1',ledgerTransactionId:state.ledgers[0].id,lockTransactionId:state.ledgers[0].id,lockedAt:STAMP,settlements:order.dueAwardPoints?[make('order-management','OrdinarySettlement',{settlementVersion:'1',drawVersionId:'demo-draw-version-1',calculationReference:'DEMO-ORDINARY',awardCodes:['DEMO_FIXED'],dueAwardPoints:order.dueAwardPoints,economicDeltaPoints:order.dueAwardPoints,actionType:'AWARD',actionStatus:order.status==='SETTLED'?'COMPLETED':'PENDING',requestedPoints:order.dueAwardPoints,postedPoints:order.netPostedAwardPoints,platformBornePoints:'0.00',ledgerTransactionId:order.status==='SETTLED'?(order.awardTransactionId||'demo-transaction-1'):null,createdAt:STAMP,completedAt:order.status==='SETTLED'?STAMP:null})]:[],refund:null});
  }
  if(path==='/budget-accounts')return paged(state.budgets,q);
  if(path==='/ledger-transactions')return paged(state.ledgers,q);
  if(path==='/ledger-reversals'){const tx=find(state.ledgers,b.originalTransactionId||b.transactionId||b.referenceTransactionId);const amount=Number(b.points);if(amount>Number(tx.economicPoints)-Number(tx.reversedPoints))fail('INVALID_VALUE','冲正积分超过剩余可冲正额');tx.reversedPoints=points(Number(tx.reversedPoints)+amount);const reversal={...structuredClone(tx),id:uid('demo-reversal'),type:'REVERSAL',economicPoints:points(amount),reversedPoints:'0.00',referenceTransactionId:tx.id,reason:b.reason,createdAt:STAMP,entries:tx.entries.map((e:Row)=>({...e,id:uid('entry'),direction:e.direction==='CREDIT'?'DEBIT':'CREDIT',changePoints:points(-Number(e.changePoints)),balanceBefore:e.balanceAfter,balanceAfter:e.balanceBefore}))};state.ledgers.unshift(reversal);return receipt('createLedgerReversal',reversal.id);}
  if(path==='/reconciliations'){const id=uid('reconciliation');state.reconciliations[id]={id,status:'MATCHED',expectedPoints:'1000.00',actualPoints:'1000.00',differencePoints:'0.00',asOf:STAMP};return task('LEDGER_RECONCILIATION',`/api/admin/v1/reconciliations/${id}`);}
  m=path.match(/^\/reconciliations\/([^/]+)$/);if(m)return state.reconciliations[m[1]]||fail('NOT_FOUND','对账任务不存在',404);
  if(path==='/platform-budget-flows')return {from:q.from||'2026-10-01',to:q.to||'2026-10-03',asOf:STAMP,rows:state.budgets.map((budget:Row)=>({category:budget.type,inflowPoints:budget.availablePoints,outflowPoints:'0.00',netFlowPoints:budget.availablePoints}))};
  m=path.match(/^\/platform-budget-batches(?:\/([^/]+)\/reviews)?$/);
  if(m){if(m[1]){const row=find(state.budgetBatches,m[1]);if(row.authorId===state.identity.employeeId)fail('FORBIDDEN','原版要求另一名员工复核',403);row.status=b.decision==='APPROVE'?'APPROVED':'REJECTED';row.reviewedBy=state.identity.employeeId;row.reviewReason=b.reason;if(row.status==='APPROVED'){const budget=state.budgets.find((x:Row)=>x.type===row.category);budget.availablePoints=points(Number(budget.availablePoints)+Number(row.points));row.transactionId=uid('demo-budget-transaction');}return row;}
    if(method==='GET')return page(state.budgetBatches);const row={...b,id:uid('budget-batch'),authorId:state.identity.employeeId,status:'PENDING_REVIEW',reviewedBy:null,reviewReason:null,transactionId:null,createdAt:STAMP};state.budgetBatches.unshift(row);return row;
  }
  if(path==='/robot-strategies')return page(state.strategies);
  m=path.match(/^\/robot-masters(?:\/([^/]+)(?:\/(.+))?)?$/);
  if(m){const [,id,action]=m;
    if(!id){if(method==='GET')return paged(state.robots,q);const strategy=state.strategies.find((s:Row)=>s.code===b.strategy.code);const row=make('robots','RobotAdmin',{robot:make('robots','RobotPublic',{id:uid('demo-robot'),name:b.name,strategyCode:b.strategy.code,strategyLabel:strategy?.label||b.strategy.code,strategyDescription:strategy?.description||'',lotteryIds:b.allowedLotteryIds,performance:{settledGroups:'0',hitGroups:'0',hitRate:null,asOf:STAMP},currentGroups:'0',scoreLabel:'推荐评分'}),status:b.status||'ENABLED',strategy:b.strategy,strategyVersion:'1',generationMode:b.generationMode,generationTime:b.generationTime||null,version:'1'});state.robots.unshift(row);return row;}
    const row=find(state.robots,id);
    if(!action){if(method==='GET')return row;if(method==='DELETE'){state.robots=state.robots.filter((r:Row)=>r.robot.id!==id);return null;}update(row,{strategy:b.strategy,generationMode:b.generationMode,generationTime:b.generationTime||null});Object.assign(row.robot,{name:b.name,lotteryIds:b.allowedLotteryIds,strategyCode:b.strategy.code});return row;}
    if(action==='status')return update(row,{status:b.status});
    if(action==='executions')return page(state.executions[id]||[make('robots','TaskStatusSummary',{id:`execution-${id}`,taskType:'ROBOT_GENERATION',status:'SUCCEEDED',progress:1,resultCode:'COMPLETED',updatedAt:STAMP})]);
    if(action==='recommendations')return page(state.recommendations[id]||recommendations(row));
    if(['previews','generations','preview-jobs','generation-jobs'].includes(action)){const accepted=task(action.includes('preview')?'ROBOT_PREVIEW':'ROBOT_GENERATION');const result=state.tasks[accepted.taskId];(state.executions[id]||=[]).unshift(result);state.recommendations[id]=recommendations(row).map(r=>({...r,executionId:accepted.taskId,status:action.includes('preview')?'PREVIEW':'PUBLISHED'}));row.latestExecutionAt=STAMP;row.robot.currentGroups='5';return accepted;}
  }
}
function recommendations(robot:Row){const l=find(state.catalog.lotteries,robot.robot.lotteryIds[0]);return Array.from({length:5},(_,i)=>make('robots','Recommendation',{id:`recommendation-${robot.robot.id}-${i+1}`,executionId:`execution-${robot.robot.id}`,robotId:robot.robot.id,lotteryId:l.id,playId:l.plays[0].id,issueCode:'2026261',selection:selectionFor(l.code),recommendationScore:80+i,betCount:'1',pricePoints:'2.00',strategyVersion:robot.strategyVersion,generationVersion:'1',algorithmVersion:'1',ruleVersion:'FORMAL-20260919-V1',scoreBreakdown:[{feature:'STRUCTURE',score:82,weightBasisPoints:10000}],explanations:['演示历史窗口计算结果'],cutoffAt:'2026-10-03T20:00:00+08:00',outcome:{status:'PENDING',drawVersion:null,verifiedAt:null},generatedAt:STAMP,status:'PUBLISHED'}));}
