import type { Row } from './seed';

const cents = (value: string | number) => Math.round(Number(value) * 100);
const points = (value: number) => (value / 100).toFixed(2);

// Local prototype facts shared by the member list, detail and reports.
export function refreshMemberMetrics(members: Row[], ledgers: Row[] = []) {
  for (const [index, member] of members.entries()) {
    member.aiDividendPoints ??= points(ledgers
      .filter(tx => tx.memberId === member.id && tx.type === 'AI_AWARD')
      .reduce((sum, tx) => sum + cents(tx.economicPoints) - cents(tx.reversedPoints || '0.00'), 0));
    member.totalReferralPoints ??= '0.00';
    member.inviteCode ??= `DEMO${String(index + 1).padStart(6, '0')}`;
    member.wallet.availablePoints = points(
      cents(member.qualifiedRechargePoints) + cents(member.totalReferralPoints)
      + cents(member.netProfitPoints) + cents(member.aiDividendPoints)
      - cents(member.stationDeductedPoints),
    );
    member.quota.remainingPoints = points(cents(member.quota.totalLimit) - cents(member.quota.usedPoints));
  }

  const children = new Map<string, Row[]>();
  for (const member of members) {
    const parentId = member.scope.referrerMember?.id;
    if (parentId && parentId !== member.id) {
      const direct = children.get(parentId) ?? [];
      direct.push(member);
      children.set(parentId, direct);
    }
  }
  for (const member of members) {
    const direct = children.get(member.id) ?? [];
    const descendants: Row[] = [];
    const queue = [...direct];
    const visited = new Set([member.id]);
    for (let index = 0; index < queue.length; index++) {
      const child = queue[index];
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      descendants.push(child);
      queue.push(...(children.get(child.id) ?? []));
    }
    member.directMemberCount = direct.length;
    member.directMemberAvailableTotal = points(direct.reduce((sum, child) => sum + cents(child.wallet.availablePoints), 0));
    member.descendantMemberCount = descendants.length;
    member.descendantMemberAvailableTotal = points(descendants.reduce((sum, child) => sum + cents(child.wallet.availablePoints), 0));
  }
}
