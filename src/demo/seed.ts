import templates from './templates.json';
import catalog from './catalog.json';
import meta from './meta.json';
import defaults from './config-defaults.json';

export type Row = Record<string, any>;
export const STAMP = '2026-10-03T02:00:00+08:00';
export const EMPLOYEE = 'demo-employee-001';
export const AUTHOR = 'demo-employee-002';
export const make = (group:string,type:string,props:Row={}):Row => { const row={...structuredClone((templates as Row)[group][type]),...props}; if(type==='DrawCandidate'||type==='DrawVersion'){row.areas=props.numbers?.areas||row.areas;row.numbers={areas:row.areas};} return row; };
export const ref = (row:Row) => ({id:row.id,code:row.code||row.account,name:row.name||row.displayName});
export const points = (n:number) => n.toFixed(2);
export const uid = (prefix:string) => `${prefix}-${crypto.randomUUID()}`;
export const page = (items:Row[]) => ({items,nextCursor:null,hasMore:false,snapshotId:'demo-snapshot-1'});

export function areasFor(code:string) {
  const area=(key:string,chosen:number[])=>({key,chosen,dan:[],tuo:[]});
  if(code==='SSQ')return [area('RED',[3,8,12,18,25,31]),area('BLUE',[9])];
  if(code==='DLT')return [area('FRONT',[5,12,18,26,32]),area('BACK',[3,9])];
  if(code==='QLC')return [area('BASIC',[2,5,9,13,17,23,29]),area('SPECIAL',[11])];
  if(code==='KL8')return [area('MAIN',Array.from({length:20},(_,i)=>i*4+1))];
  return Array.from({length:code==='PL5'?5:code==='QXC'?7:3},(_,i)=>area(code==='QXC'&&i===6?'LAST':`P${i+1}`,[(i*3+2)%10]));
}
export function selectionFor(code:string) { return {schemaId:`${code}_STANDARD`,schemaVersion:'1',mode:['FC3D','PL3','PL5','QXC'].includes(code)?'POSITIONAL':'SINGLE',areas:areasFor(code)}; }
export function combinationsFor(poolId:string) {
  return Array.from({length:50},(_,i)=>make('ai-management','FixedCombination',{
    id:`${poolId}-group-${i+1}`,sequenceNo:i+1,selection:selectionFor('FC3D'),selectionHash:`selection-${i+1}`,
    numberCodes:Array.from({length:20},(_,j)=>String(i*20+j).padStart(3,'0')),groupHash:`group-${i+1}`,baseBetCount:'20',baseCostPoints:'40.00',generatedAt:STAMP,
  }));
}
export function allocationFor(pool:Row, version='1',target=10) {
  const total=Number(pool.totalPurchasePoints)*(1+target/100);
  return make('ai-management','Allocation',{
    id:`allocation-${pool.id}-${version}`,poolIssueId:pool.id,version,status:'SOLVED',confirmationStatus:'PENDING_CONFIRMATION',
    ruleSetCode:'FC3D_50X20_POST_DRAW_V3',algorithmVersion:'FC3D-V3',inputVersionSetHash:`inputs-${pool.id}`,drawVersion:'1',ruleVersion:'FORMAL-20260919-V1',simulationPolicyVersion:'1',
    items:combinationsFor(pool.id).map((g,i)=>make('ai-management','AllocationItem',{combinationId:g.id,sequenceNo:i+1,allocatedPoints:points(Number(pool.totalPurchasePoints)/50),multiplier:'1',allocationRatio:'0.02',awardCodes:i===12?['STRAIGHT']:[],winningPoints:i===12?points(total):'0.00'})),
    totalPurchasePoints:pool.totalPurchasePoints,totalWinningPoints:points(total),userWinningPoints:points(Number(pool.userPurchasePoints)*(1+target/100)),platformWinningPoints:points(Number(pool.platformPoints)*(1+target/100)),
    requestedTargetNetReturnPercent:target,actualNetReturnRate:String(target/100),differencePercentagePoints:'0.00',withinTolerance:true,
    rewardRequiredPoints:points(total),winningNumberCode:'258',winningGroupSequenceNo:13,initialOfficialPoints:pool.initialOfficialPoints,userPurchasePoints:pool.userPurchasePoints,
    incrementTotalPoints:'600.00',platformIncrementBasePoints:'500.00',rawTotalPoints:pool.totalPurchasePoints,officialContributionPoints:pool.platformPoints,
    maxOfficialContributionPoints:pool.maxOfficialContributionPoints,officialContributionWithinLimit:true,rewardBudgetLimitPoints:pool.rewardBudgetLimitPoints,rewardBudgetWithinLimit:true,
  });
}

export function createSeed():Row {
  const lotteries=structuredClone(catalog.lotteries);
  const stations=Array.from({length:3},(_,i)=>make('station-management','Station',{id:`demo-station-${i+1}`,code:`ST00${i+1}`,name:['华东运营站','华南运营站','西南运营站'][i],regionLabel:['上海','广州','成都'][i],status:'ENABLED',remark:'演示站点',stationMasterCount:2,memberCount:4,version:'1'}));
  const stationMasters=Array.from({length:6},(_,i)=>make('station-management','StationMaster',{id:`demo-station-master-${i+1}`,code:`SM00${i+1}`,userId:`demo-station-user-${i+1}`,name:`演示站长${i+1}`,account:`station_demo_${i+1}`,station:ref(stations[i%3]),status:'ENABLED',limits:{singleGrantLimit:'10000.00',singleDeductLimit:'5000.00',dailyOperationLimit:'50000.00'},remark:'演示站长',disposablePoints:points(50000+i*1000),operationCredentialConfigured:true,memberCount:2,grantedMemberPoints:'12000.00',deductedMemberPoints:'200.00',identityVersion:'1',version:'1'}));
  const members=Array.from({length:12},(_,i)=>make('member-management','MemberAdmin',{
    id:`demo-member-${i+1}`,account:`member_demo_${String(i+1).padStart(2,'0')}`,displayName:`演示会员${String(i+1).padStart(2,'0')}`,status:i===11?'DISABLED':'ENABLED',
    scope:{station:ref(stations[i%3]),stationMaster:ref(stationMasters[i%6]),referrerMember:i>0?{id:'demo-member-1',code:'member_demo_01',name:'演示会员01'}:null,version:'1'},
    qualifiedRechargePoints:points(2000+i*1000),stationDeductedPoints:'100.00',wallet:{availablePoints:points(1800+i*810),reservedPoints:'200.00',asOf:STAMP,ledgerWatermark:'demo-ledger-1'},
    vipName:`VIP${i%6}`,referralName:defaults.selection.referralLevels[i%4].name,quota:{businessDate:'2026-10-03',timeZone:'Asia/Shanghai',vipBaseLimit:'1000.00',referralExtraLimit:'200.00',totalLimit:'1200.00',usedPoints:'100.00',remainingPoints:'1100.00',eligibilityStatus:'READY',qualificationVersion:'1',vipConfigVersion:'1',referralConfigVersion:'1',asOf:STAMP},
    totalBetPoints:points(500+i*100),netProfitPoints:points(50+i*20),aiDividendPoints:points(100+i*10),totalReferralPoints:points(i===0?550:50),inviteCode:`DEMO${String(i+1).padStart(6,'0')}`,directMemberCount:i===0?11:0,directMemberAvailableTotal:i===0?'73260.00':'0.00',version:'1',
  }));
  const strategyNames=['均衡','趋势','冷热混合','降权过滤','多模型组合','探索'];
  const strategyCodes=['BALANCED','TREND_FOLLOWING','HOT_COLD_MIX','ELIMINATION','ENSEMBLE','EXPLORATION'];
  const strategies=strategyCodes.map((code,i)=>make('robots','StrategyDefinition',{code,label:`${strategyNames[i]}策略`,description:`基于历史开奖的${strategyNames[i]}统计策略`,schemaRef:`${code}-V1`,defaultConfig:{code,common:{shortWindow:10,mediumWindow:30,longWindow:100,maxGroupsPerPlay:5,candidateMultiplier:4,minRecommendationScore:60,maxPointsPerIssue:'200.00',explorationRate:'0.10',minDiversityRate:'0.30',maxRerunsPerIssue:3,weights:[{feature:'STRUCTURE',basisPoints:5000},{feature:'OMISSION',basisPoints:5000}]},maxTrendNumbers:3,trendThreshold:60,hotBasisPoints:3000,warmBasisPoints:3000,normalBasisPoints:2000,coldBasisPoints:2000,hardEliminationEnabled:false,maxEliminationRate:'0.20',agreementWeightBasisPoints:5000}}));
  const robots=meta.avatars.map((avatar,i)=>{
    const lottery=lotteries.find(l=>avatar.name.startsWith(l.name))||lotteries[i%8];
    const index=strategyNames.findIndex(s=>avatar.name.includes(s));const strategy=strategies[Math.max(index,0)];
    return make('robots','RobotAdmin',{robot:make('robots','RobotPublic',{...avatar,strategyCode:strategy.code,strategyLabel:strategy.label,strategyDescription:strategy.description,lotteryIds:[lottery.id],performance:{settledGroups:'180',hitGroups:'56',hitRate:'0.3111',asOf:STAMP},currentGroups:'5',recommendationScore:82.5,scoreLabel:'推荐评分'}),status:'ENABLED',strategy:structuredClone(strategy.defaultConfig),strategyVersion:'1',generationMode:'PER_ISSUE',generationTime:'18:00',currentLotteryCount:'1',currentPlayCount:String(lottery.plays.length),currentBetCount:'5',currentPricePoints:'10.00',latestExecutionAt:STAMP,version:'1'});
  });
  const issues=lotteries.flatMap(l=>Array.from({length:12},(_,i)=>make('operations','AdminIssue',{id:`issue-${l.code}-${261-i}`,lotteryId:l.id,issueCode:`2026${261-i}`,officialIssueCode:`2026${261-i}`,status:i===0?'OPEN':'DRAWN',openAt:`2026-10-${String(3-Math.min(i,2)).padStart(2,'0')}T00:00:00+08:00`,cutoffAt:'2026-10-03T20:00:00+08:00',drawAt:'2026-10-03T21:15:00+08:00',drawDate:'2026-10-03',version:'1'})));
  const health=lotteries.map((l,i)=>make('operations','DataHealthItem',{lotteryId:l.id,latestConfirmedIssue:'2026260',drawVersion:'1',omissionGeneration:'demo-generation-1',drawVersionSetHash:'demo-draw-hash',gapCount:i===5?1:0,acknowledgedGapCount:0,projectionLag:0,pendingTaskCount:0,status:i===5?'DEGRADED':'READY'}));
  const candidates=issues.filter(i=>i.issueCode==='2026261').map(issue=>make('operations','DrawCandidate',{id:`candidate-${issue.lotteryId}`,lotteryId:issue.lotteryId,issueCode:issue.issueCode,areas:areasFor(lotteries.find(l=>l.id===issue.lotteryId)!.code),source:'MANUAL',status:'PENDING_REVIEW',evidenceIds:['demo-evidence-draw'],authorId:AUTHOR,version:'1',createdAt:STAMP}));
  const drawVersions=issues.filter(i=>i.status==='DRAWN').map(issue=>make('operations','DrawVersion',{lotteryId:issue.lotteryId,lotteryCode:lotteries.find(l=>l.id===issue.lotteryId)!.code,issueCode:issue.issueCode,version:'1',status:'CONFIRMED',source:'SYSTEM',areas:areasFor(lotteries.find(l=>l.id===issue.lotteryId)!.code),confirmedAt:STAMP,prizeReferenceStatus:'FINAL'}));
  const rules=lotteries.flatMap(l=>l.plays.map(p=>make('operations','RuleDraft',{id:`rule-${p.id}`,playId:p.id,version:'FORMAL-20260919-V1',recordVersion:'1',status:'APPROVED',authorId:AUTHOR,artifactHash:'demo-rule-artifact',effectiveFromIssue:'2026245'})));
  rules.push(make('operations','RuleDraft',{id:'demo-rule-pending',playId:lotteries[0].plays[0].id,version:'DEMO-DRAFT-2',recordVersion:'2',status:'PENDING_REVIEW',authorId:AUTHOR,artifactHash:'demo-rule-draft',effectiveFromIssue:'2026270'}));
  const policies=['SIMULATION_AWARD','REFERRAL_FIXED','REFERRAL_AI_SHARE'].map((code,i)=>make('operations','PolicyView',{id:`policy-${i+1}`,code,version:'1',recordVersion:'1',status:'APPROVED',artifactId:`demo-policy-artifact-${i+1}`,artifactHash:'demo-policy-hash',decisionIds:[`D0${i===0?2:i===1?6:7}`],authorId:AUTHOR,createdAt:STAMP}));
  const fc3d=lotteries.find(l=>l.code==='FC3D')!;
  const settings={effectiveDate:'2026-10-01',timeZone:'Asia/Shanghai',cutoffOffsetMinutes:5,endDate:null,settlementMode:'MANUAL',initialOfficialPoints:'2000.00',userIncrementRatioBps:1000,defaultTargetNetReturnPercent:10,maxOfficialContributionPoints:'100000.00',rewardBudgetLimitPoints:'1000000.00'};
  const projects=[make('ai-management','AiProject',{id:'demo-project-1',code:'FC3D-AI-001',name:'福彩3D AI 合买',lotteryId:fc3d.id,playId:fc3d.plays[0].id,status:'ENABLED',activeConfigVersion:'1',latestPoolIssueId:'demo-pool-1',version:'1',drawSchedule:{issueCode:'2026261',drawAt:'2026-10-03T21:15:00+08:00'}})];
  const configs=[make('ai-management','AiProjectConfig',{projectId:projects[0].id,version:'1',settings,authorId:AUTHOR,createdAt:STAMP})];
  const pools=['OPEN','ALLOCATION_PENDING','DISCLOSED','SETTLED','EXCEPTION_PENDING'].map((status,i)=>make('ai-management','AiPool',{id:`demo-pool-${i+1}`,projectId:projects[0].id,lotteryId:fc3d.id,playId:fc3d.plays[0].id,issueCode:`2026${261-i}`,ruleSetCode:'FC3D_50X20_POST_DRAW_V3',status,cutoffAt:'2026-10-03T21:10:00+08:00',generatedAt:STAMP,groupCount:50,configVersion:'1',...settings,actualUserShare:'0.3333',userPurchasePoints:'1000.00',platformPoints:'2000.00',rawTotalPoints:'3000.00',alignmentPoints:'0.00',totalPurchasePoints:'3000.00',participantCount:10,totalWinningPoints:i>1?'3300.00':null,userWinningPoints:i>1?'1100.00':null,numbersDisclosed:i>1,disclosureVersion:i>1?'1':null,version:'1'}));
  const allocations=pools.filter((_,i)=>i>0).map((p,i)=>({...allocationFor(p),confirmationStatus:i>0?'CONFIRMED':'PENDING_CONFIRMATION'}));
  const orders=members.flatMap((member,i)=>[0,1].map((k)=>{
    const l=lotteries[(i+k)%8]; const id=`demo-order-${i*2+k+1}`;
    return make('order-management','AdminOrder',{id,type:'ORDINARY',lotteryId:l.id,playId:l.plays[0].id,issueCode:'2026260',selection:selectionFor(l.code),status:i===0&&k===0?'AWARD_PENDING_BUDGET':k===0?'SETTLED':'WAITING_DRAW',purchasePoints:'20.00',dueAwardPoints:k===0?'50.00':null,netPostedAwardPoints:i===0?'0.00':k===0?'50.00':'0.00',refundPoints:'0.00',settlementVersion:k===0?'1':null,createdAt:STAMP,detailUrl:`/orders/${id}`,memberId:member.id,stationId:member.scope.station.id,stationMasterId:member.scope.stationMaster.id});
  }));
  const ledgers=members.map((member,i)=>make('ledger-management','AdminLedgerTransaction',{
    id:`demo-transaction-${i+1}`,sequence:String(1001+i),businessNumber:`PT2026100300${i+1}`,assetType:'POINTS',sourceType:'STATION_ADJUSTMENT',sourceId:member.id,type:'STATION_VIP_CREDIT',status:'POSTED',economicPoints:'1000.00',reversedPoints:'0.00',stationId:member.scope.station.id,stationCode:member.scope.station.code,stationName:member.scope.station.name,stationMasterId:member.scope.stationMaster.id,stationMasterCode:member.scope.stationMaster.code,stationMasterName:member.scope.stationMaster.name,memberId:member.id,operatorRealm:'ADMIN',operatorId:AUTHOR,reason:'演示积分拨付',createdAt:STAMP,
    entries:['DEBIT','CREDIT'].map((direction,j)=>make('ledger-management','AdminLedgerEntry',{id:`entry-${i}-${j}`,entryNo:j+1,accountId:`demo-account-${i}-${j}`,ownerType:j?'MEMBER':'STATION_MASTER',ownerId:j?member.id:member.scope.stationMaster.id,ownerAccount:j?member.account:'station_demo',ownerName:j?member.displayName:member.scope.stationMaster.name,bucket:j?'AVAILABLE':'DISPOSABLE',direction,changePoints:j?'1000.00':'-1000.00',balanceBefore:j?'800.00':'51000.00',balanceAfter:j?'1800.00':'50000.00'})),
  }));
  return {
    schemaVersion:2,auth:true,identity:{employeeId:EMPLOYEE,account:'demo_admin · 演示',permissions:meta.permissions,scopeStationIds:[],expiresAt:'2099-01-01T00:00:00Z',mfaVerifiedAt:STAMP,mfaEnrolled:true},
    catalog:{...catalog,lotteries},stations,stationMasters,members,strategies,robots,issues,health,candidates,drawVersions,rules,policies,projects,configs,pools,allocations,orders,ledgers,
    sources:[make('operations','SourceHealthItem',{id:'demo-source-1',name:'官方开奖来源（演示）',lotteryIds:lotteries.map(l=>l.id),status:'APPROVED',lastSuccessAt:STAMP})],
    gaps:[{lotteryId:lotteries[5].id,beforeIssueCode:'2026257',afterIssueCode:'2026259',acknowledged:false,acknowledgementId:null,reason:null,acknowledgedBy:null,acknowledgedAt:null}],
    vip:make('member-management','VipConfig',{version:'1',qualificationStatus:'READY',createdAt:STAMP,levels:structuredClone(defaults.selection.vipLevels)}),vipHistory:[],
    referral:make('member-management','ReferralConfig',{version:'1',qualificationStatus:'READY',fixedRewardPolicyVersion:'1',aiSharePolicyVersion:'1',levels:structuredClone(defaults.selection.referralLevels)}),referralHistory:[],
    budgets:['DISTRIBUTION_BUDGET','ORDINARY_AWARD_BUDGET','AI_BUDGET','REFERRAL_BUDGET'].map((type,i)=>make('ledger-management','BudgetAccount',{id:`demo-budget-${i+1}`,type,availablePoints:'999999999.00',reservedPoints:'0.00',version:'1'})),
    budgetBatches:[{id:'demo-budget-batch-1',category:'DISTRIBUTION_BUDGET',kind:'TOPUP',points:'50000.00',sourceReference:'DEMO-20261003',reason:'演示追加预算',authorId:AUTHOR,status:'PENDING_REVIEW',reviewedBy:null,reviewReason:null,transactionId:null,createdAt:STAMP}],
    employees:[{id:EMPLOYEE,account:'demo_admin',name:'演示管理员',status:'ENABLED',roleIds:['demo-role-admin'],scopeStationIds:[],version:'1'},{id:AUTHOR,account:'demo_operator',name:'演示运营员',status:'ENABLED',roleIds:['demo-role-operator'],scopeStationIds:[],version:'1'}],
    roles:[{id:'demo-role-admin',name:'全局管理员',permissions:meta.permissions},{id:'demo-role-operator',name:'运营专员',permissions:meta.permissions.filter(p=>!p.includes('approve'))}],
    audits:[make('employee-security','AuditView',{id:'demo-audit-1',actorId:AUTHOR,operationId:'createStation',resourceId:stations[0].id,reason:'初始化演示站点',beforeVersion:null,afterVersion:'1',resultCode:'COMPLETED',createdAt:STAMP,traceId:'demo-trace-1'})],
    decisions:['最终玩法目录','正式积分返奖','动态资金总额','目标收益率','计算异常处置','固定奖励触发','AI 分红基数','默认等级初值'].map((topic,i)=>({decisionId:`D0${i+1}`,topic,status:'APPROVED',selectedOption:'演示选择',policyVersion:'1'})),
    proposals:[{id:'demo-proposal-1',decisionId:'D08',baseRecordVersion:1,selectedOption:'演示默认等级',applicableScope:'全局',policyVersion:'DEMO-2',artifactId:'demo-artifact',artifactHash:'demo-hash',authorId:AUTHOR,reason:'演示业务选择复核',status:'PENDING_REVIEW',reviewedBy:null,reviewReason:null,reviewedAt:null,createdAt:STAMP}],
    tasks:{},commands:{},exports:{},uploads:{},payouts:[make('ai-management','PayoutBatch',{id:'demo-payout-settled',poolIssueId:'demo-pool-4',status:'COMPLETED',expectedPoints:'1100.00',postedPoints:'1100.00',pendingPoints:'0.00',differencePoints:'0.00',inputVersionSetHash:'inputs-demo-pool-4',completedItemCount:10,totalItemCount:10,updatedAt:STAMP})],reconciliations:{},recommendations:{},executions:{},preparations:{},
  };
}
