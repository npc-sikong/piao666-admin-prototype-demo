import { state,find,filtered,paged,make,page,task,update,uid,STAMP,receipt,fail } from './state';
import { areasFor,type Row } from './seed';

export function lotteryAction(path:string,method:string,b:Row,q:Row):any {
  if(path==='/catalog')return structuredClone(state.catalog);
  let m=path.match(/^\/lotteries\/([^/]+)\/issues(?:\/([^/]+)\/([^/]+))?$/);
  if(m){const [,lotteryId,issueCode,action]=m;
    if(!action)return paged(state.issues,{...q,lotteryId});
    const lottery=find(state.catalog.lotteries,lotteryId);
    if(action==='draw-fetches'){if(!state.candidates.some((c:Row)=>c.lotteryId===lotteryId&&c.issueCode===issueCode))state.candidates.push(make('operations','DrawCandidate',{id:uid('candidate'),lotteryId,issueCode,areas:areasFor(lottery.code),source:'SYSTEM',status:'PENDING_REVIEW',evidenceIds:['demo-evidence'],authorId:'demo-source',version:'1',createdAt:STAMP}));return task('DRAW_FETCH');}
    if(action==='draw-candidates'){
      if(method==='GET')return paged(state.candidates,{...q,lotteryId,issueCode});
      const row=make('operations','DrawCandidate',{...b,id:uid('candidate'),lotteryId,issueCode,status:'PENDING_REVIEW',source:'MANUAL',authorId:state.identity.employeeId,version:'1',createdAt:STAMP});state.candidates.unshift(row);return row;
    }
    if(action==='draw-versions')return paged(state.drawVersions,{...q,lotteryId,issueCode});
  }
  m=path.match(/^\/plays\/([^/]+)\/rules$/);
  if(m){const play=state.catalog.lotteries.flatMap((l:Row)=>l.plays).find((p:Row)=>p.id===m![1])||fail('NOT_FOUND','玩法不存在',404);return make('operations','RuleDetail',{playId:play.id,officialRuleVersion:play.ruleVersion,simulationRuleVersion:'1',readiness:'READY',ruleText:`${play.name}规则说明\n按原版玩法范围选择号码，每注消耗 2.00 积分。\n本页面为浏览器内演示，奖级与积分用于展示操作流程。`,baseCostPoints:'2.00',sourceEvidenceIds:['demo-evidence-rule']});}
  if(path==='/data-health')return page(state.health);
  if(path==='/lottery-sources')return page(state.sources);
  if(path==='/omission-gaps'){const rows=state.gaps.filter((g:Row)=>g.lotteryId===q.lotteryId);return {lotteryId:q.lotteryId,gapCount:rows.length,acknowledgedGapCount:rows.filter((g:Row)=>g.acknowledged).length,items:rows};}
  if(path==='/omission-rebuilds'){for(const row of state.health.filter((r:Row)=>!b.lotteryId||r.lotteryId===b.lotteryId)){update(row,{projectionLag:0,pendingTaskCount:0,omissionGeneration:uid('demo-generation'),status:row.gapCount>row.acknowledgedGapCount?'DEGRADED':'READY'});}return task('OMISSION_REBUILD');}
  if(path==='/omission-gap-acknowledgements'){const row=state.gaps.find((g:Row)=>g.lotteryId===b.lotteryId&&g.beforeIssueCode===b.beforeIssueCode&&g.afterIssueCode===b.afterIssueCode)||fail('NOT_FOUND','缺口不存在',404);Object.assign(row,{acknowledged:true,acknowledgementId:uid('ack'),reason:b.reason,acknowledgedBy:state.identity.employeeId,acknowledgedAt:STAMP});syncGap(row.lotteryId);return row;}
  m=path.match(/^\/omission-gap-acknowledgements\/([^/]+)$/);if(m&&method==='DELETE'){const row=state.gaps.find((g:Row)=>g.acknowledgementId===m![1]);if(row){Object.assign(row,{acknowledged:false,acknowledgementId:null,reason:null,acknowledgedBy:null,acknowledgedAt:null});syncGap(row.lotteryId);}return null;}
  m=path.match(/^\/(play-rule-versions|simulation-policy-versions)(?:\/([^/]+)\/(reviews|artifact))?$/);
  if(m){const rules=m[1]==='play-rule-versions';const rows=rules?state.rules:state.policies;
    if(m[3]==='artifact')return state.uploads[find(rows,m[2]).artifactId]?.artifact||awardArtifact();
    if(m[3]==='reviews'){const row=find(rows,m[2]);if(row.authorId===state.identity.employeeId)fail('FORBIDDEN','原版要求另一名员工复核',403);return update(row,{status:b.decision==='APPROVE'?'APPROVED':'REJECTED',recordVersion:String(Number(row.recordVersion)+1)});}
    if(method==='GET')return page(rows.filter((r:Row)=>!q.playId||r.playId===q.playId));
    const row=make('operations',rules?'RuleDraft':'PolicyView',{...b,artifactHash:b.ruleArtifactHash||b.artifactHash||'demo-hash',id:uid(rules?'rule':'policy'),version:String(rows.length+1),recordVersion:'1',status:'PENDING_REVIEW',authorId:state.identity.employeeId,createdAt:STAMP});rows.unshift(row);return row;
  }
  m=path.match(/^\/draw-candidates\/([^/]+)\/reviews$/);
  if(m){const row=find(state.candidates,m[1]);if(row.authorId===state.identity.employeeId)fail('FORBIDDEN','原版要求另一名员工复核',403);update(row,{status:b.decision==='APPROVE'?'APPROVED':'REJECTED'});if(row.status==='APPROVED'){state.drawVersions.unshift(make('operations','DrawVersion',{lotteryId:row.lotteryId,lotteryCode:find(state.catalog.lotteries,row.lotteryId).code,issueCode:row.issueCode,version:row.version,status:'CONFIRMED',source:'MANUAL_REVIEWED',areas:row.areas,confirmedAt:STAMP,prizeReferenceStatus:'FINAL'}));const issue=state.issues.find((i:Row)=>i.lotteryId===row.lotteryId&&i.issueCode===row.issueCode);if(issue)issue.status='DRAWN';}return task('DRAW_REVIEW');}
  m=path.match(/^\/business-decision-proposals(?:\/([^/]+)\/(reviews|artifact))?$/);
  if(m){if(m[2]==='artifact')return state.uploads[find(state.proposals,m[1]).artifactId]?.artifact||{decisionId:'D08',policyVersion:'DEMO-2',applicableScope:'全局',selection:{option:'演示默认等级'}};
    if(m[2]==='reviews'){const row=find(state.proposals,m[1]);if(row.authorId===state.identity.employeeId)fail('FORBIDDEN','原版要求另一名员工复核',403);update(row,{status:b.decision==='APPROVE'?'APPROVED':'REJECTED',reviewedBy:state.identity.employeeId,reviewReason:b.reason,reviewedAt:STAMP});if(row.status==='APPROVED')Object.assign(state.decisions.find((d:Row)=>d.decisionId===row.decisionId),{status:'APPROVED',selectedOption:row.selectedOption,policyVersion:row.policyVersion});return row;}
    if(method==='GET')return {decisions:state.decisions,proposals:state.proposals};
    const row={...b,id:uid('proposal'),baseRecordVersion:1,status:'PENDING_REVIEW',authorId:state.identity.employeeId,reviewedBy:null,reviewReason:null,reviewedAt:null,createdAt:STAMP};state.proposals.unshift(row);return row;
  }
}
function syncGap(lotteryId:string){const h=state.health.find((r:Row)=>r.lotteryId===lotteryId);h.acknowledgedGapCount=state.gaps.filter((g:Row)=>g.lotteryId===lotteryId&&g.acknowledged).length;h.status=h.gapCount>h.acknowledgedGapCount?'DEGRADED':'READY';}
function awardArtifact(){return {decisionId:'D02',policyVersion:'DEMO-AWARD-1',applicableScope:'演示原型',selection:{awardRows:state.catalog.lotteries.flatMap((l:Row)=>l.plays.map((p:Row)=>({playCode:p.code,playRuleVersion:1,awardCode:'DEMO_FIXED',rank:1,points:'100.00',outcomes:[{matched:3}]})))}};}
