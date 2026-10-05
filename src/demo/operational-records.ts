import { make, STAMP, uid, type Row } from './seed';

export const cents = (value: unknown) => Math.round(Number(value || 0) * 100);
export const money = (value: number) => (value / 100).toFixed(2);
export const eventTime = () => new Date().toISOString();
export function floorRate(basis: number, rate: string): number {
  const [whole, fraction = ''] = rate.split('.');
  return Number(BigInt(basis) * BigInt(`${whole || '0'}${fraction}`) / (10n ** BigInt(fraction.length)));
}
export function aiMemberAmounts(s:Row,pool:Row,winning:unknown=pool.userWinningPoints):Row[]{
  const purchases=new Map<string,number>();
  for(const sub of s.subscriptions.filter((r:Row)=>r.poolIssueId===pool.id&&r.status!=='REFUNDED'))purchases.set(sub.memberId,(purchases.get(sub.memberId)||0)+cents(sub.points));
  const total=[...purchases.values()].reduce((n,v)=>n+v,0),result=[...purchases].map(([memberId,purchase])=>({memberId,purchase,due:winning===null||winning===undefined?null:total?Number(BigInt(cents(winning))*BigInt(purchase)/BigInt(total)):0}));
  if(winning!==null&&winning!==undefined){let remainder=cents(winning)-result.reduce((n,r)=>n+(r.due||0),0);for(let i=0;i<result.length&&remainder>0;i++,remainder--)result[i].due=(result[i].due||0)+1;}
  return result;
}
const sampleTime = (day: number, hour: number, second = 0) => `2026-10-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:12:${String(second % 60).padStart(2, '0')}+08:00`;
export const isFinalOrder = (order: Row) => ['SETTLED', 'CORRECTED'].includes(order.status) && cents(order.refundPoints) === 0;

export function memberSnapshot(s: Row, memberId: string): Row {
  const m = s.members.find((r: Row) => r.id === memberId);
  return { memberId, memberAccount: m?.account || '历史账号未记录', memberName: m?.displayName || '',
    stationId: m?.scope.station.id, stationName: m?.scope.station.name,
    stationMasterId: m?.scope.stationMaster.id, stationMasterName: m?.scope.stationMaster.name };
}

function memberEntry(member: Row, delta: number, before: number, bucket = 'AVAILABLE'): Row {
  return make('ledger-management', 'AdminLedgerEntry', { id: uid('report-entry'), entryNo: 2, accountId: member.id,
    ownerType: 'MEMBER', ownerId: member.id, ownerAccount: member.account, ownerName: member.displayName, bucket,
    direction: delta < 0 ? 'DEBIT' : 'CREDIT', changePoints: money(delta), balanceBefore: money(before), balanceAfter: money(before + delta) });
}

/** Historical samples are partial history; they never rewrite the cumulative member snapshot. */
function sampleTransaction(s: Row, member: Row, id: string, type: string, delta: number, before: number, time: string, extra: Row = {}): Row {
  const snapshot = memberSnapshot(s, member.id), entry = memberEntry(member, delta, before);
  const master = s.stationMasters.find((m: Row) => m.id === snapshot.stationMasterId);
  const isStation = type.startsWith('STATION_');
  const budgetId=type.startsWith('ORDINARY_')?'demo-budget-2':type.startsWith('AI_')?'demo-budget-3':'demo-budget-4';
  const budgetType=type.startsWith('ORDINARY_')?'ORDINARY_AWARD_BUDGET':type.startsWith('AI_')?'AI_BUDGET':'REFERRAL_BUDGET';
  const counter = make('ledger-management', 'AdminLedgerEntry', { id: `${id}-counter`, entryNo: 1,
    accountId: isStation ? master.id : budgetId, ownerType: isStation ? 'STATION_MASTER' : 'PLATFORM',
    ownerId: isStation ? master.id : 'demo-platform', ownerAccount: isStation ? master.account : 'platform_demo',
    ownerName: isStation ? master.name : '平台演示预算', bucket: isStation ? 'DISPOSABLE' : budgetType,
    direction: delta < 0 ? 'CREDIT' : 'DEBIT', changePoints: money(-delta), balanceBefore: '50000.00', balanceAfter: money(5000000 - delta) });
  const tx = make('ledger-management', 'AdminLedgerTransaction', { id, sequence: String(2000 + s.ledgers.length),
    businessNumber: `DEMO-${id}`, assetType: 'POINTS', status: 'POSTED', type, sourceType: isStation ? 'STATION_ADJUSTMENT' : 'REFERRAL_REWARD',
    sourceId: member.id, economicPoints: money(Math.abs(delta)), reversedPoints: '0.00', ...snapshot,
    stationCode: member.scope.station.code, stationMasterCode: member.scope.stationMaster.code,
    operatorRealm: isStation ? 'STATION_MASTER' : 'SYSTEM', operatorId: isStation ? master.id : 'demo-system',
    reason: '关联报表演示样例；非完整累计账本', createdAt: time, entries: [counter, entry], demoHistory: true, ...extra });
  s.ledgers.push(tx);
  return tx;
}

export function vipMatch(s: Row, qualified: unknown): Row {
  return [...s.vip.levels].sort((a: Row, b: Row) => cents(b.requiredRechargePoints) - cents(a.requiredRechargePoints))
    .find((level: Row) => cents(level.requiredRechargePoints) <= cents(qualified)) || s.vip.levels[0];
}

export function referralMatch(s: Row, member: Row): Row {
  const children = s.members.filter((m: Row) => m.scope.referrerMember?.id === member.id && m.status === 'ENABLED');
  return [...s.referral.levels].sort((a: Row, b: Row) => Number(b.levelNo) - Number(a.levelNo))
    .find((l: Row) => l.status === 'ENABLED' && children.filter((m: Row) => cents(m.qualifiedRechargePoints) >= cents(l.validRechargePoints)).length >= Number(l.requiredDirectValidMembers)) || s.referral.levels[0];
}

function qualificationFact(s: Row, member: Row, before: Row, after: Row, qualified: string, time: string, reason: string): Row {
  return { id: uid('qualification-change'), ...memberSnapshot(s, member.id), beforeLevel: before.name, afterLevel: after.name,
    beforeNo: before.levelNo, afterNo: after.levelNo, qualifiedPoints: qualified, threshold: after.requiredRechargePoints,
    validStakePoints: money(s.orders.filter((o: Row) => o.memberId === member.id && isFinalOrder(o) && o.settledAt && new Date(o.settledAt).getTime() <= new Date(time).getTime()).reduce((n: number, o: Row) => n + cents(o.purchasePoints), 0)),
    beforeQuota: before.aiPoolBaseDailyLimit, afterQuota: after.aiPoolBaseDailyLimit,
    ruleVersion: s.vip.version, reason, createdAt: time, relatedTransactionId: null };
}

export function rebuildQualifications(s: Row, reason = '配置更新后资格重算') {
  const time = eventTime();
  for (const member of s.members as Row[]) {
    const before = member.vipSnapshot || s.vip.levels.find((l: Row) => l.name === member.vipName) || s.vip.levels[0];
    const after = vipMatch(s, member.qualifiedRechargePoints), referral = referralMatch(s, member);
    if (before.name !== after.name) {
      const fact = qualificationFact(s, member, before, after, member.qualifiedRechargePoints, time, reason);
      fact.beforeQuota = member.quota.vipBaseLimit;
      s.reportFacts.qualificationChanges.push(fact);
    }
    member.vipName = after.name; member.referralName = referral.name;
    member.vipSnapshot = structuredClone(after);
    member.quota.vipBaseLimit = after.aiPoolBaseDailyLimit; member.quota.referralExtraLimit = referral.aiExtraDailyLimit;
    member.quota.totalLimit = money(cents(after.aiPoolBaseDailyLimit) + cents(referral.aiExtraDailyLimit));
    member.quota.remainingPoints = money(cents(member.quota.totalLimit) - cents(member.quota.usedPoints));
    member.quota.qualificationVersion = String(Number(member.quota.qualificationVersion || 0) + 1);
    member.quota.vipConfigVersion = s.vip.version; member.quota.referralConfigVersion = s.referral.version;
    member.quota.asOf = time;
  }
}

/** Add report collections once, accepting saved schema 2 without clearing browser data. */
export function ensureOperationalState(s: Row, fresh: boolean) {
  if (s.reportFacts?.version === 1) return;
  s.reportFacts = { version: 1, limitedHistory: true, quotaEvents: [], qualificationChanges: [], referralRewards: [], bindings: {} };
  s.subscriptions ||= [];
  if(!fresh)for(const tx of s.ledgers as Row[]){
    if(tx.type!=='REVERSAL'||!tx.referenceTransactionId)continue;
    const original=s.ledgers.find((r:Row)=>r.id===tx.referenceTransactionId);
    if(!original||!cents(original.economicPoints))continue;
    for(const entry of tx.entries as Row[]){
      const origin=original.entries.find((e:Row)=>e.ownerId===entry.ownerId&&e.bucket===entry.bucket);
      if(!origin)continue;
      const delta=-Math.round(cents(origin.changePoints)*cents(tx.economicPoints)/cents(original.economicPoints));
      if(cents(entry.changePoints)!==delta){entry.changePoints=money(delta);entry.balanceBefore='未记录';entry.balanceAfter='未记录';tx.reason+='；旧演示部分冲正已按本次数额修正，历史余额未记录';}
    }
  }
  if (fresh) {
    for (const [i, m] of (s.members as Row[]).entries()) {
      m.vipName = vipMatch(s, m.qualifiedRechargePoints).name;
      m.referralName = referralMatch(s, m).name;
      m.vipSnapshot = structuredClone(vipMatch(s,m.qualifiedRechargePoints));
      m.quota.vipBaseLimit=m.vipSnapshot.aiPoolBaseDailyLimit;
      m.quota.referralExtraLimit=referralMatch(s,m).aiExtraDailyLimit;
      m.quota.totalLimit=money(cents(m.quota.vipBaseLimit)+cents(m.quota.referralExtraLimit));
      m.quota.remainingPoints=money(cents(m.quota.totalLimit)-cents(m.quota.usedPoints));
      s.reportFacts.bindings[m.id] = `2026-09-${String(10 + i).padStart(2, '0')}T10:15:32+08:00`;
      const grant = sampleTransaction(s, m, `report-grant-${i}`, 'STATION_VIP_CREDIT', 32000, 80000, '2026-09-25T10:12:01+08:00');
      grant.reversedPoints = '200.00';
      sampleTransaction(s, m, `report-deduct-${i}`, 'STATION_DEBIT', -12000, 112000, '2026-09-26T11:12:02+08:00');
      sampleTransaction(s, m, `report-reversal-${i}`, 'STATION_VIP_CREDIT_REVERSAL', -20000, 100000, '2026-09-27T12:12:03+08:00', { referenceTransactionId: grant.id });
    }
  }
  for (const [i, order] of (s.orders as Row[]).entries()) {
    if (!fresh) continue; // Legacy absent history remains unknown.
    Object.assign(order, memberSnapshot(s, order.memberId), { createdAt: sampleTime(1 + i % 3, 9, i), betCount: '10', multiple: 1,
      ruleVersion: 'FORMAL-20260919-V1', drawNumbers: null, settledAt: null, settlementHistory: [], refund: null });
    if (order.dueAwardPoints !== null) {
      const draw=s.drawVersions.find((d:Row)=>d.lotteryId===order.lotteryId&&d.issueCode===order.issueCode);
      order.drawNumbers = draw?.areas?.map((area:Row)=>area.chosen.join(' ')).join(' | ') || null;
      if (i > 0 && i % 8 === 2) { order.dueAwardPoints = '0.00'; order.netPostedAwardPoints = '0.00'; }
      if (i > 0 && i % 8 === 4) { order.status = 'CORRECTED'; order.dueAwardPoints = '70.00'; order.netPostedAwardPoints = '70.00'; order.settlementVersion = '2'; }
      order.settledAt = isFinalOrder(order) ? sampleTime(1 + i % 3, 21, i) : null;
      order.settlementHistory = [{ settlementVersion: '1', drawVersionId: 'demo-draw-version-1', calculationReference: 'DEMO-ORDINARY',
        awardCodes: cents(order.dueAwardPoints) ? ['DEMO_FIXED'] : [], dueAwardPoints: order.status === 'CORRECTED' ? '50.00' : order.dueAwardPoints,
        economicDeltaPoints: order.status === 'CORRECTED' ? '50.00' : order.dueAwardPoints, actionType: cents(order.dueAwardPoints) ? 'AWARD' : 'NO_CHANGE',
        actionStatus: order.status === 'AWARD_PENDING_BUDGET' ? 'PENDING_BUDGET' : 'POSTED', requestedPoints: order.status === 'CORRECTED' ? '50.00' : order.dueAwardPoints,
        postedPoints: order.status === 'CORRECTED' ? '50.00' : order.netPostedAwardPoints, platformBornePoints: '0.00', ledgerTransactionId: null,
        createdAt: sampleTime(1 + i % 3, 21, i), completedAt: order.settledAt }];
      if (order.status === 'CORRECTED') order.settlementHistory.push({ ...order.settlementHistory[0], settlementVersion: '2', actionType: 'CORRECTION_CREDIT', economicDeltaPoints: '20.00', requestedPoints: '20.00', postedPoints: '20.00', dueAwardPoints: '70.00' });
      if (i === 6 || i === 14) {
        order.status = 'CANCELLED'; order.refundPoints = '20.00'; order.settledAt = null;
        order.refund = { refundPoints: '20.00', recoveredAwardPoints: order.netPostedAwardPoints, platformBornePoints: '0.00',
          refundTransactionId: null, recoveryTransactionId: null, reason: '演示期次撤销并追回已发返还', refundedAt: sampleTime(1 + i % 3, 22, i) };
        order.netPostedAwardPoints = '0.00'; order.reportRefundNetted=true;
      }
    }
    const member=s.members.find((m:Row)=>m.id===order.memberId),opening=cents(member.wallet.availablePoints),stake=cents(order.purchasePoints);
    const context={sourceType:'ORDINARY_ORDER',sourceId:order.id,issueCode:order.issueCode};
    const reserve=sampleTransaction(s,member,`report-order-reserve-${i}`,'ORDINARY_RESERVE',-stake,opening,order.createdAt,context);
    reserve.entries[0]=memberEntry(member,stake,0,'RESERVED');reserve.entries[0].entryNo=1;order.reserveTransactionId=reserve.id;
    const lock=sampleTransaction(s,member,`report-order-lock-${i}`,'ORDINARY_LOCK',-stake,stake,sampleTime(1+i%3,20,i),context);
    lock.entries[1].bucket='RESERVED';lock.entries[0].bucket='CONSUMPTION';order.lockTransactionId=lock.id;
    let available=opening-stake;
    for(const [j,settlement] of order.settlementHistory.entries()){
      const delta=cents(settlement.postedPoints);
      if(!delta)continue;
      const tx=sampleTransaction(s,member,`report-order-award-${i}-${j}`,j?'ORDINARY_CORRECTION_CREDIT':'ORDINARY_AWARD',delta,available,settlement.completedAt,context);
      settlement.ledgerTransactionId=tx.id;available+=delta;
    }
    if(order.refund){
      const recovered=cents(order.refund.recoveredAwardPoints);
      if(recovered){const recovery=sampleTransaction(s,member,`report-order-recovery-${i}`,'ORDINARY_CORRECTION_RECOVERY',-recovered,available,order.refund.refundedAt,context);order.refund.recoveryTransactionId=recovery.id;available-=recovered;}
      const tx=sampleTransaction(s,member,`report-order-refund-${i}`,'ORDINARY_REFUND',stake,available,order.refund.refundedAt,context);order.refund.refundTransactionId=tx.id;
    }
  }
  if(fresh)for(const batch of s.payouts as Row[])for(const item of (batch.items||[]) as Row[]){
    if(!cents(item.postedPoints))continue;
    const member=s.members.find((m:Row)=>m.id===item.memberId),pool=s.pools.find((p:Row)=>p.id===batch.poolIssueId);
    const tx=sampleTransaction(s,member,`report-ai-post-${item.id}`,'AI_PAYOUT_POSTED',cents(item.postedPoints),cents(member.wallet.availablePoints),item.postedAt,{sourceType:'AI_POOL',sourceId:pool.id,issueCode:pool.issueCode});
    item.transactionId=tx.id;
  }
  const quotaRemaining=new Map<string,number>();
  for (const [pi, pool] of (s.pools as Row[]).entries()) {
    const businessDay=fresh?5-pi:3;
    if(fresh){pool.cutoffAt=sampleTime(businessDay,20,0);pool.generatedAt=sampleTime(businessDay,8,0);}
    const count = Math.min(Number(pool.participantCount), s.members.length);
    const total = cents(pool.userPurchasePoints), base = Math.floor(total / Math.max(count, 1));
    for (let i = 0; i < count; i++) {
      const member = s.members[i], amount = base + (i < total % count ? 1 : 0);
      const parent = s.members.find((m: Row) => m.id === member.scope.referrerMember?.id);
      const policy = parent ? referralMatch(s, parent) : null;
      const pieces = i === 0 ? [Math.floor(amount / 2), amount - Math.floor(amount / 2)] : [amount];
      for (const [piece, value] of pieces.entries()) {
        const oldPosting=!fresh?s.ledgers.find((tx:Row)=>tx.memberId===member.id&&tx.sourceId===pool.id):null;
        const snapshot=fresh?memberSnapshot(s,member.id):{...memberSnapshot(s,member.id),stationId:oldPosting?.stationId,stationName:oldPosting?.stationName||'未记录',stationMasterId:oldPosting?.stationMasterId,stationMasterName:oldPosting?.stationMasterName||'未记录'};
        const sub = { id: `report-sub-${pi}-${i}-${piece}`, poolIssueId: pool.id, ...snapshot, points: money(value),
          quotaDate: `2026-10-0${businessDay}`, status: pool.status === 'SETTLED' ? 'SETTLED' : pool.status === 'OPEN' ? 'RESERVED' : 'LOCKED',
          ledgerTransactionId: null, lockedAt: pool.status === 'OPEN' ? null : sampleTime(businessDay, 19, i), createdAt: sampleTime(businessDay, 9 + piece, i + pi),
          referrerSnapshot: fresh&&parent ? memberSnapshot(s, parent.id) : null, referralPolicy: fresh&&policy ? structuredClone(policy) : null,
          referralPolicyVersion: fresh ? s.referral.aiSharePolicyVersion : null,
          demoHistory: true };
        s.subscriptions.push(sub);
        const quotaKey=`${member.id}:${sub.quotaDate}`,before=quotaRemaining.get(quotaKey)??cents(member.quota.totalLimit);
        quotaRemaining.set(quotaKey,before-value);
        s.reportFacts.quotaEvents.push({ id: `${sub.id}-quota`, ...snapshot, subscriptionId: sub.id, poolIssueId: pool.id,
          businessDate: sub.quotaDate, delta: money(-value), before: fresh?money(before):null, after: fresh?money(before-value):null, type: 'AI_QUOTA_OCCUPY', createdAt: sub.createdAt,
          reason: fresh ? '演示认购占用日额度，保留当日额度快照' : '旧演示认购迁移；历史额度快照未记录' });
      }
    }
    const batch = s.payouts.find((b: Row) => b.poolIssueId === pool.id);
    if (batch && !batch.items) {
      // The former simulator explicitly selected the first participantCount members.
      const value = cents(batch.postedPoints), share = Math.floor(value / Math.max(count, 1));
      batch.items = s.members.slice(0, count).map((m: Row, i: number) => ({ id: `${batch.id}-${i + 1}`, memberId: m.id, maskedBeneficiary: m.displayName,
        duePoints: money(share + (i < value % count ? 1 : 0)), postedPoints: money(share + (i < value % count ? 1 : 0)), status: 'POSTED',
        transactionId: s.ledgers.find((tx: Row) => tx.sourceId === pool.id && tx.memberId === m.id)?.id || null,
        postedAt: batch.updatedAt || STAMP, demoHistory: true }));
    }
    if(batch?.items)for(const [i,item] of (batch.items as Row[]).entries()){
      const posting=s.ledgers.find((tx:Row)=>tx.id===item.transactionId);
      item.memberId ||= posting?.memberId || s.members.find((m:Row)=>m.displayName===item.maskedBeneficiary)?.id || s.members[i]?.id;
      item.postedAt ||= cents(item.postedPoints)?posting?.createdAt||batch.updatedAt||null:null;
    }
    if (fresh && pi === 4 && !batch) {
      s.payouts.push({ id: 'report-payout-partial', poolIssueId: pool.id, status: 'PENDING_BUDGET', expectedPoints: '1100.00', postedPoints: '275.00', pendingPoints: '825.00', differencePoints: '825.00',
        completedItemCount: 0, totalItemCount: count, updatedAt: sampleTime(3, 22, 13),
        items: s.members.slice(0, count).map((m: Row, i: number) => ({ id: `report-partial-${i}`, memberId: m.id, maskedBeneficiary: m.displayName,
          duePoints: '110.00', postedPoints: i < 5 ? '55.00' : '0.00', status: 'PENDING_BUDGET', transactionId: null, postedAt: i < 5 ? sampleTime(3, 22, 13) : null })) });
    }
  }
  if (fresh && s.subscriptions.length) {
    const baseSub=s.subscriptions[2],day=Number(baseSub.quotaDate.slice(-2));
    const sub = { ...structuredClone(baseSub), id: 'report-sub-refunded', points: '25.00', status: 'REFUNDED', refundedAt: sampleTime(day, 12, 47), createdAt: sampleTime(day, 11, 7) };
    s.subscriptions.push(sub);
    const quotaBefore=quotaRemaining.get(`${sub.memberId}:${sub.quotaDate}`)??10000;
    s.reportFacts.quotaEvents.push({ id: `${sub.id}-occupy`, ...memberSnapshot(s, sub.memberId), subscriptionId: sub.id, poolIssueId: sub.poolIssueId,
      businessDate: sub.quotaDate, delta: '-25.00', before: money(quotaBefore), after: money(quotaBefore-2500), type: 'AI_QUOTA_OCCUPY', createdAt: sub.createdAt, reason: '演示短时占用' },
    { id: `${sub.id}-release`, ...memberSnapshot(s, sub.memberId), subscriptionId: sub.id, poolIssueId: sub.poolIssueId,
      businessDate: sub.quotaDate, delta: '25.00', before: money(quotaBefore-2500), after: money(quotaBefore), type: 'AI_QUOTA_RELEASE', createdAt: sub.refundedAt, reason: '取消认购后释放日额度' });
    for (const [i, m] of (s.members as Row[]).entries()) {
      const before = s.vip.levels[0], middle = s.vip.levels[2], after = vipMatch(s, m.qualifiedRechargePoints);
      s.reportFacts.qualificationChanges.push(qualificationFact(s, m, before, middle, '500.00', sampleTime(1, 10, i), '累计有效站长加分跨过升级门槛'),
        qualificationFact(s, m, middle, after, m.qualifiedRechargePoints, sampleTime(3, 23, i), '累计有效站长加分增加'));
    }
    const m = s.members.at(-1), after = vipMatch(s, m.qualifiedRechargePoints), before = s.vip.levels[Number(after.levelNo) + 1];
    if (before) s.reportFacts.qualificationChanges.push(qualificationFact(s, m, before, after, m.qualifiedRechargePoints, sampleTime(3, 23, 51), '历史有效加分冲正后的降级样例'));
    const children = s.members.filter((m: Row) => m.scope.referrerMember);
    for (const [i, child] of children.entries()) {
      const parent = s.members.find((m: Row) => m.id === child.scope.referrerMember.id);
      if (!parent) continue;
      const level = s.referral.levels[Math.min(Math.floor((i + 1) / 3), s.referral.levels.length - 1)];
      const due = cents(level.fixedRewardPoints), recovered = i === 7 ? Math.min(200, due) : 0;
      const posted = i === 5 ? 0 : due;
      const obligation = { id: `report-fixed-reward-${i}`, ...memberSnapshot(s, parent.id), sourceMemberId: child.id, sourceMemberAccount: child.account,
        sourceMemberName: child.displayName, type: 'FIXED_REFERRAL', level: level.name, basis: level.validRechargePoints, rate: null,
        targetDue: money(due - recovered), posted: money(posted - recovered), recovered: money(recovered),
        status: i === 5 && due ? 'PENDING_BUDGET' : recovered ? 'CORRECTED' : 'PAID', policyVersion: s.referral.fixedRewardPolicyVersion,
        createdAt: sampleTime(2, 10, i), postedAt: posted ? sampleTime(2, 11, i) : null, sourceId: child.id,
        sourceKind: 'MEMBER', ledgerIds: [] as string[], history: [] as Row[], demoHistory: true };
      if (posted) {
        const tx = sampleTransaction(s, parent, `report-fixed-post-${i}`, 'REFERRAL_FIXED_REWARD', posted, cents(parent.wallet.availablePoints), obligation.postedAt!, { sourceId: obligation.id });
        obligation.ledgerIds.push(tx.id); obligation.history.push({ action: '发放', points: money(posted), time: obligation.postedAt, transactionId: tx.id });
      }
      if (recovered) {
        const tx = sampleTransaction(s, parent, `report-fixed-recovery-${i}`, 'REFERRAL_REWARD_RECOVERY', -recovered, cents(parent.wallet.availablePoints) + posted, sampleTime(3, 13, i), { sourceId: obligation.id });
        obligation.ledgerIds.push(tx.id); obligation.history.push({ action: '回收', points: money(-recovered), time: tx.createdAt, transactionId: tx.id });
      }
      s.reportFacts.referralRewards.push(obligation);
    }
    syncAiReferralRewards(s, s.pools[3], true);
  }
  s.schemaVersion = 3;
}

export function lockAiSubscriptions(s: Row, poolId: string) {
  const time = eventTime();
  for (const sub of s.subscriptions.filter((r: Row) => r.poolIssueId === poolId && r.status === 'RESERVED')) {
    const member = s.members.find((m: Row) => m.id === sub.memberId);
    const parent = s.members.find((m: Row) => m.id === member?.scope.referrerMember?.id);
    sub.status = 'LOCKED'; sub.lockedAt = time;
    sub.referrerSnapshot = parent ? memberSnapshot(s, parent.id) : null;
    sub.referralPolicy = parent ? structuredClone(referralMatch(s, parent)) : null;
    sub.referralPolicyVersion = s.referral.aiSharePolicyVersion;
  }
}

export function syncAiReferralRewards(s: Row, pool: Row, seedPaid = false) {
  const participants = [...new Set((s.subscriptions as Row[]).filter(r => r.poolIssueId === pool.id && r.status !== 'REFUNDED').map(r => r.memberId))];
  const items = s.payouts.filter((b: Row) => b.poolIssueId === pool.id).flatMap((b: Row) => b.items || []);
  for (const memberId of participants) {
    const subs = s.subscriptions.filter((r: Row) => r.poolIssueId === pool.id && r.memberId === memberId && r.status !== 'REFUNDED');
    const first = subs[0], parent = first?.referrerSnapshot, level = first?.referralPolicy;
    if (!parent || !level) continue;
    const purchase = subs.reduce((n: number, r: Row) => n + cents(r.points), 0);
    const postedReturn = items.filter((r: Row) => r.memberId === memberId).reduce((n: number, r: Row) => n + cents(r.postedPoints), 0);
    const basis = Math.max(postedReturn - purchase, 0), due = floorRate(basis,String(level.directAiShareRate));
    const id = `ai-share-${pool.id}-${memberId}`;
    const existing = s.reportFacts.referralRewards.find((r: Row) => r.id === id);
    if (existing) { existing.basis = money(basis); existing.targetDue = money(due); existing.status = cents(existing.posted) === due ? 'PAID' : 'PENDING'; continue; }
    const time = seedPaid ? sampleTime(3, 23, 42) : eventTime();
    const r = { id, ...parent, sourceMemberId: memberId, sourceMemberAccount: first.memberAccount, sourceMemberName: first.memberName,
      type: 'AI_REFERRAL_SHARE', level: level.name, basis: money(basis), rate: level.directAiShareRate, targetDue: money(due),
      posted: seedPaid ? money(due) : '0.00', recovered: '0.00', status: seedPaid || due === 0 ? 'PAID' : 'PENDING',
      policyVersion: first.referralPolicyVersion ?? null, sourceId: pool.id, sourceKind: 'AI_POOL', createdAt: time,
      postedAt: seedPaid && due ? time : null, ledgerIds: [] as string[], history: [] as Row[], demoHistory: true };
    if (seedPaid && due) {
      const member = s.members.find((m: Row) => m.id === parent.memberId);
      const tx = sampleTransaction(s, member, `report-ai-share-${memberId}`, 'REFERRAL_AI_SHARE', due, cents(member.wallet.availablePoints), time, { sourceId: id, issueCode: pool.issueCode });
      r.ledgerIds.push(tx.id); r.history.push({ action: '发放', points: money(due), time, transactionId: tx.id });
    }
    s.reportFacts.referralRewards.push(r);
  }
}

export function reverseDemoTransaction(s: Row, tx: Row, amount: number, reason: string): Row {
  const economic = cents(tx.economicPoints), delta = Math.round(amount * 100);
  const ratio = delta / economic;
  const suffix = tx.type.startsWith('STATION_') || ['ADMIN_GRANT', 'ADMIN_DEDUCT'].includes(tx.type) ? `${tx.type}_REVERSAL` : 'REVERSAL';
  const reversal = { ...structuredClone(tx), id: uid('demo-reversal'), businessNumber: `DEMO-REV-${s.ledgers.length + 1}`,
    sequence: String(3000 + s.ledgers.length), type: suffix, economicPoints: money(delta), reversedPoints: '0.00',
    referenceTransactionId: tx.id, reason, createdAt: eventTime(), operatorRealm: 'ADMIN', operatorId: s.identity.employeeId,
    entries: tx.entries.map((e: Row) => {
      const change = -Math.round(cents(e.changePoints) * ratio), member = s.members.find((m: Row) => m.id === e.ownerId), master = s.stationMasters.find((m: Row) => m.id === e.ownerId);
      const before = member ? cents(e.bucket === 'RESERVED' ? member.wallet.reservedPoints : member.wallet.availablePoints)
        : master ? cents(master.disposablePoints) : cents(e.balanceAfter);
      if (member) {
        if (tx.type === 'STATION_VIP_CREDIT') member.qualifiedRechargePoints = money(cents(member.qualifiedRechargePoints) + change);
        else if (tx.type === 'STATION_DEBIT') member.stationDeductedPoints = money(cents(member.stationDeductedPoints) - change);
        else if (tx.type === 'AI_AWARD' || tx.type === 'AI_PAYOUT_POSTED') member.aiDividendPoints = money(cents(member.aiDividendPoints) + change);
        else if (tx.type.startsWith('REFERRAL_')) member.totalReferralPoints = money(cents(member.totalReferralPoints) + change);
        else member.netProfitPoints = money(cents(member.netProfitPoints) + change);
        if (e.bucket === 'RESERVED') member.wallet.reservedPoints = money(before + change); else member.wallet.availablePoints = money(before + change);
      }
      if (master) master.disposablePoints = money(before + change);
      return { ...e, id: uid('entry'), direction: change < 0 ? 'DEBIT' : 'CREDIT', changePoints: money(change), balanceBefore: money(before), balanceAfter: money(before + change) };
    }) };
  tx.reversedPoints = money(cents(tx.reversedPoints) + delta);
  s.ledgers.unshift(reversal);
  return reversal;
}
