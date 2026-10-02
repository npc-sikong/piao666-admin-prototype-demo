import { state,find,paged,make,page,task,update,uid,STAMP,receipt,points,fail,creditDemoMember } from './state';
import { allocationFor,combinationsFor,type Row } from './seed';

function currentAllocation(id:string){return state.allocations.filter((a:Row)=>a.poolIssueId===id&&a.status!=='SUPERSEDED').at(-1)||null;}
function actions(pool:Row){
  if(pool.status==='SETTLED')return [];
  const result=['CALCULATE_ALLOCATION','RECALCULATE_ALLOCATION'];
  if(pool.status==='OPEN')result.push('CLOSE_FUNDING');
  const a=currentAllocation(pool.id);
  if(a?.confirmationStatus==='PENDING_CONFIRMATION')result.push('CONFIRM_ALLOCATION');
  if(a?.confirmationStatus==='CONFIRMED')result.push('PUBLISH_DISCLOSURE');
  if(pool.disclosureVersion&&a?.confirmationStatus==='CONFIRMED')result.push('PREPARE_PAYOUT');
  return result;
}
function execution(pool:Row){const a=currentAllocation(pool.id),batch=state.payouts.find((p:Row)=>p.poolIssueId===pool.id);return make('ai-management','SettlementExecution',{poolIssueId:pool.id,settlementMode:pool.settlementMode,modeChangeAllowed:!batch,currentAllocationId:a?.id||null,currentAllocationVersion:a?.version||null,targetNetReturnPercent:a?.requestedTargetNetReturnPercent??pool.defaultTargetNetReturnPercent,totalReturnPoints:a?.totalWinningPoints||null,postedReturnPoints:batch?.postedPoints||'0.00',targetRoundingAdjustmentPoints:a?.targetRoundingAdjustmentPoints||null,payoutBatchId:batch?.id||null,automaticTaskId:null,automaticTaskStatus:pool.settlementMode==='AUTO'?(pool.status==='EXCEPTION_PENDING'?'FAILED':batch?'SUCCEEDED':'PENDING'):null,failureCode:pool.status==='EXCEPTION_PENDING'?'DEMO_RETRY_REQUIRED':null});}
function newAllocation(pool:Row,target:number){const all=state.allocations.filter((a:Row)=>a.poolIssueId===pool.id);for(const a of all)a.status='SUPERSEDED';const row=allocationFor(pool,String(all.length+1),target);state.allocations.push(row);pool.status='ALLOCATION_PENDING';update(pool,{});return row;}
function payout(pool:Row){
  const existing=state.payouts.find((x:Row)=>x.poolIssueId===pool.id);if(existing)return existing;
  const a=currentAllocation(pool.id)||newAllocation(pool,pool.defaultTargetNetReturnPercent),batchId=uid('demo-payout');
  const recipients=state.members.slice(0,pool.participantCount),cents=Math.round(Number(a.userWinningPoints)*100),base=Math.floor(cents/Math.max(recipients.length,1));
  const items=recipients.map((member:Row,i:number)=>{const amount=(base+(i<cents%Math.max(recipients.length,1)?1:0))/100;const transactionId=creditDemoMember(member.id,amount,{budgetId:'demo-budget-3',type:'AI_AWARD',sourceType:'AI_POOL',sourceId:pool.id,issueCode:pool.issueCode});return make('ai-management','PayoutItem',{id:`${batchId}-${i+1}`,maskedBeneficiary:member.displayName,duePoints:points(amount),postedPoints:points(amount),status:'POSTED',transactionId});});
  const batch=make('ai-management','PayoutBatch',{id:batchId,poolIssueId:pool.id,status:'COMPLETED',expectedPoints:a.userWinningPoints,postedPoints:a.userWinningPoints,pendingPoints:'0.00',differencePoints:'0.00',inputVersionSetHash:a.inputVersionSetHash,completedItemCount:items.length,totalItemCount:items.length,updatedAt:STAMP,items});
  state.payouts.push(batch);update(pool,{status:'SETTLED',totalWinningPoints:a.totalWinningPoints,userWinningPoints:a.userWinningPoints});return batch;
}

export function aiAction(path:string,method:string,b:Row,q:Row):any {
  let m=path.match(/^\/ai-projects(?:\/([^/]+)(?:\/(.+))?)?$/);
  if(m){const [,id,action]=m;
    if(!id){if(method==='GET')return paged(state.projects,q);const projectId=uid('demo-project'),poolId=uid('demo-pool');const row=make('ai-management','AiProject',{id:projectId,name:b.name,code:`FC3D-AI-${state.projects.length+1}`,lotteryId:b.lotteryId,playId:b.playId,status:'ENABLED',activeConfigVersion:'1',latestPoolIssueId:poolId,version:'1',drawSchedule:{issueCode:'2026261',drawAt:'2026-10-03T21:15:00+08:00'}});state.projects.unshift(row);const config=make('ai-management','AiProjectConfig',{projectId,version:'1',settings:b.settings,authorId:state.identity.employeeId,createdAt:STAMP});state.configs.push(config);state.pools.push({...structuredClone(state.pools[0]),id:poolId,projectId,status:'OPEN',...b.settings,lotteryId:b.lotteryId,playId:b.playId,participantCount:0,userPurchasePoints:'0.00',platformPoints:b.settings.initialOfficialPoints,totalPurchasePoints:b.settings.initialOfficialPoints});return config;}
    const project=find(state.projects,id);
    if(!action)return project;
    if(action==='configuration'){const config=state.configs.find((c:Row)=>c.projectId===id);if(method!=='GET'){update(config,{settings:b.settings});project.activeConfigVersion=config.version;}return config;}
    if(action==='status')return update(project,{status:b.status});
    if(action==='issues')return paged(state.pools,{...q,projectId:id});
    if(action==='combination-preview'){const pool=find(state.pools,project.latestPoolIssueId);return make('ai-management','AiCombinationPreview',{projectId:id,issueId:`issue-FC3D-${pool.issueCode}`,issueCode:pool.issueCode,configVersion:project.activeConfigVersion,ruleVersion:'1',algorithmVersion:'FC3D-V3',inputVersionSetHash:`inputs-${pool.id}`,generatedAt:STAMP,combinations:combinationsFor(pool.id)});}
  }
  m=path.match(/^\/ai-pools\/([^/]+)(?:\/(.+))?$/);
  if(m){const [,id,action]=m;const pool=find(state.pools,id);
    if(!action)return make('ai-management','AiPoolAdmin',{pool,configVersion:pool.configVersion,combinations:combinationsFor(id),inputVersionSetHash:`inputs-${id}`,allowedActions:actions(pool)});
    if(action==='settlement-execution')return execution(pool);
    if(action==='settlement-mode'){if(state.payouts.some((p:Row)=>p.poolIssueId===id))fail('CONFLICT','已有发放批次，不能更改方式',409);return update(pool,{settlementMode:b.settlementMode});}
    if(action==='funding-closure'){update(pool,{status:'ALLOCATION_PENDING'});return receipt('closeAiPoolFunding',id);}
    if(action==='subscriptions')return page(Array.from({length:pool.participantCount},(_,i)=>make('ai-management','Subscription',{id:`subscription-${id}-${i+1}`,poolIssueId:id,points:points(Number(pool.userPurchasePoints)/Math.max(pool.participantCount,1)),quotaDate:'2026-10-03',status:pool.status==='OPEN'?'RESERVED':pool.status==='SETTLED'?'SETTLED':'LOCKED',ledgerTransactionId:`demo-transaction-${i+1}`,lockedAt:pool.status==='OPEN'?null:STAMP,createdAt:STAMP})));
    if(action==='allocations')return page(state.allocations.filter((a:Row)=>a.poolIssueId===id).slice().reverse());
    if(action==='allocation-jobs'){const a=newAllocation(pool,b.targetNetReturnPercent??pool.defaultTargetNetReturnPercent);return task('AI_ALLOCATION',`/api/admin/v1/allocations/${a.id}`);}
    if(action==='allocation-previews')return newAllocation(pool,b.targetNetReturnPercent);
    if(action==='disclosures'){const a=currentAllocation(id);if(a?.confirmationStatus!=='CONFIRMED')fail('CONFLICT','请先确认本期额度',409);update(pool,{status:'DISCLOSED',numbersDisclosed:true,disclosureVersion:a.version,totalWinningPoints:a.totalWinningPoints,userWinningPoints:a.userWinningPoints});return make('ai-management','DisclosureReceipt',{id:uid('disclosure'),poolIssueId:id,version:a.version,status:'PUBLISHED',label:'结算公示',reason:b.reason,publishedAt:STAMP});}
    if(action==='payout-preparations'){const a=currentAllocation(id);const preparation=make('ai-management','PayoutPreparation',{preparationId:uid('preparation'),poolIssueId:id,allocationVersion:a?.version||'1',disclosureVersion:pool.disclosureVersion||'1',expectedInputVersionSetHash:a?.inputVersionSetHash||`inputs-${id}`,dueTotalPoints:a?.totalWinningPoints||'0.00',dueUserPoints:a?.userWinningPoints||'0.00',eligible:!!a&&!!pool.disclosureVersion,blockingCodes:pool.disclosureVersion?[]:['DISCLOSURE_REQUIRED'],expiresAt:'2099-01-01T00:00:00Z'});state.preparations[preparation.preparationId]=preparation;return preparation;}
    if(action==='payouts'){if(b.confirmText!=='确认发放')fail('INVALID_VALUE','请输入确认发放');const batch=payout(pool);return task('AI_PAYOUT',`/api/admin/v1/payout-batches/${batch.id}`);}
    if(action==='quick-settlement'||action==='automatic-settlement/retry'){const a=newAllocation(pool,b.targetNetReturnPercent??pool.defaultTargetNetReturnPercent);a.confirmationStatus='CONFIRMED';pool.disclosureVersion=a.version;pool.numbersDisclosed=true;payout(pool);return execution(pool);}
  }
  m=path.match(/^\/allocations\/([^/]+)(?:\/(confirmations))?$/);
  if(m){const allocation=find(state.allocations,m[1]);if(m[2])allocation.confirmationStatus='CONFIRMED';return allocation;}
  m=path.match(/^\/payout-batches\/([^/]+)(?:\/(items|retries))?$/);
  if(m){const batch=find(state.payouts,m[1]);if(m[2]==='items')return page(batch.items||Array.from({length:batch.totalItemCount},(_,i)=>make('ai-management','PayoutItem',{id:`${batch.id}-${i+1}`,maskedBeneficiary:`演示会员${i+1}`,duePoints:points(Number(batch.expectedPoints)/Math.max(batch.totalItemCount,1)),postedPoints:points(Number(batch.postedPoints)/Math.max(batch.totalItemCount,1)),status:'POSTED',transactionId:`demo-payout-ledger-${i+1}`})));if(m[2]==='retries'){batch.status='COMPLETED';batch.postedPoints=batch.expectedPoints;batch.pendingPoints='0.00';batch.differencePoints='0.00';return task('AI_PAYOUT_RETRY',`/api/admin/v1/payout-batches/${batch.id}`);}return batch;}
}
