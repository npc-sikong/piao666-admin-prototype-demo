export type ReportKind = 'finance' | 'changes' | 'ai' | 'referrals' | 'vip' | 'bets';
export type ReferralTab = 'relations' | 'rewards';
export interface ReportColumn { key: string; label: string; format?: 'money' | 'time' | 'rate' | 'status'; }
export interface ReportDefinition { name: string; href: string; pageId: string; purpose: string; business: string[]; columns: ReportColumn[]; }
const col = (key: string, label: string, format?: ReportColumn['format']): ReportColumn => ({ key, label, format });
const identity = [col('memberAccount', '会员账号'), col('stationName', '所属站点'), col('stationMasterName', '所属站长')];
export const rewardColumns = [col('memberAccount', '推荐人'), col('sourceMemberAccount', '来源会员'), col('stationName', '所属站点'), col('stationMasterName', '所属站长'),
  col('level', '推广级别（当时）'), col('type', '奖励类型', 'status'), col('basis', '计算基数', 'money'), col('rate', '锁定比例', 'rate'),
  col('targetDue', '应发奖励（净额）', 'money'), col('posted', '已发奖励（净额）', 'money'), col('recovered', '已回收', 'money'), col('pending', '待发奖励', 'money'),
  col('status', '发放状态', 'status'), col('createdAt', '奖励形成时间', 'time'), col('postedAt', '最近发放时间', 'time'), col('policyVersion', '政策版本')];

export const reportDefinitions: Record<ReportKind, ReportDefinition> = {
  finance: { name: '充值提现报表(新增)', href: '/finance/recharge-withdrawals', pageId: 'A25',
    purpose: '查看站长给会员加分、减分及冲正记录，按站点、站长和操作人分析积分流动。金额单位为虚拟积分。',
    business: ['“充值/提现”在此对应会员加分/减分，没有现金支付或提现。站长预算调整不纳入本表。', '归属和操作人取操作记录，冲正关联原单。汇总按原业务类别扣除冲正，仅计算筛选内的净额。', '样例账本是部分演示历史，不能用筛选期间净额推算会员累计余额。'],
    columns: [...identity, col('createdAt', '日期', 'time'), col('operation', '操作'), col('amount', '金额（积分）', 'money'), col('operatorName', '操作人'),
      col('businessNumber', '业务单号'), col('before', '变动前余额', 'money'), col('after', '变动后余额', 'money'), col('reversal', '冲正标识'), col('remark', '备注')] },
  changes: { name: '会员帐变记录(新增)', href: '/finance/member-changes', pageId: 'A26',
    purpose: '追踪会员可用积分、冻结积分及 AI 日额度的变化，查看每笔变动的业务来源和前后数值。',
    business: ['积分账变一行对应一条会员账户分录；冻结和解冻涉及不同账户，分别展示，平台和站长对手分录不重复计入。', 'AI 日额度占用为负、释放为正，变动后额度指当时剩余额度；日额度与积分分开统计。', '旧记录没有保存的余额、历史额度及操作人显示“未记录”，不使用当前余额倒推。'],
    columns: [...identity, col('delta', '变动额', 'money'), col('after', '变动后额度', 'money'), col('accountType', '变动账户', 'status'), col('type', '类型', 'status'),
      col('createdAt', '日期', 'time'), col('before', '变动前额度', 'money'), col('businessNumber', '业务单号'), col('sourceName', '来源业务'), col('operatorName', '操作人'), col('remark', '备注')] },
  ai: { name: 'AI合买参与记录(新增)', href: '/reports/ai-participations', pageId: 'A27',
    purpose: '查看每个会员参与了哪些合买期次、何时参与，以及开奖后返还和到账情况。',
    business: ['一行合并同一会员在同一合买期次的认购，展开详情查看每次参与时间、积分与日额度日期。参与时间筛选命中任一次认购后，展示该会员该期完整记录。',
      '“分红（已到账返还）”包含本金；应返、已到账、待到账和已结算净收益分别展示，待开奖或未完成结算不能显示为 0 收益。', 'AI 推广分红归入会员推广记录，不与本人合买返还混算。退款认购从有效参与积分中扣除；批次和认购合并时返还仅统计一次。'],
    columns: [...identity, col('projectName', '合买项目'), col('issueCode', '期号'), col('purchase', '参与积分', 'money'), col('drawStatus', '是否开奖'),
      col('posted', '分红（已到账返还）', 'money'), col('createdAt', '首次参与时间', 'time'), col('lastParticipationAt', '最近参与时间', 'time'), col('postedAt', '分红时间', 'time'),
      col('participationCount', '参与次数'), col('due', '应返积分', 'money'), col('profit', '已结算净收益', 'money'), col('pending', '待到账积分', 'money'),
      col('refundPoints', '退回参与积分', 'money'), col('participationStatus', '参与状态', 'status'), col('status', '结算状态', 'status')] },
  referrals: { name: '会员推广记录(新增)', href: '/reports/referrals', pageId: 'A28',
    purpose: '查看会员的直属推荐关系、有效推广会员数，以及固定奖励和 AI 推广分红的发放结果。点击人数可查看会员账号。',
    business: ['推荐关系显示当前直属关系和当前推广等级；有效会员需启用且累计有效站长加分达到当前等级门槛。关系页按绑定时间筛选，会员数列始终显示该推荐人的完整当前直属名单。',
      '奖励明细保留形成奖励时的推荐人、级别和比例；归属调整及配置修改不重写历史奖励。已发奖励为发放减回收的净额；待发为应发净额减已发净额的正数部分。',
      '固定奖励以首次跨过有效加分门槛形成奖励义务。AI 推广分红按 max(来源会员最终返还−实际参与, 0) × 锁定比例计算，向下取两位小数，从平台推广预算支出。', '样例包含演示奖励政策，正式政策以主项目配置为准。零奖励无需发放，待处理、预算不足和已回收分别展示。'],
    columns: [col('memberAccount', '推荐人'), col('stationName', '所属站点'), col('stationMasterName', '所属站长'), col('level', '推广级别（当前）'),
      col('directCount', '推广会员数'), col('validCount', '有效推广会员数'), col('fixedPosted', '固定推广奖励', 'money'), col('aiPosted', 'AI推广分红', 'money'),
      col('posted', '发放奖励（净额）', 'money'), col('targetDue', '应发奖励（净额）', 'money'), col('pending', '待发奖励', 'money'), col('createdAt', '最近绑定时间', 'time')] },
  vip: { name: 'VIP升级记录(新增)', href: '/reports/vip-upgrades', pageId: 'A29',
    purpose: '分析会员 VIP 等级提升、跨级和 AI 日额度变化；可切换查看降级及规则重算。升级依据是累计有效站长加分。',
    business: ['累计有效加分=站长有效加分−对应加分冲正。普通投注流水、推广奖励、AI 返还不计入 VIP 升级依据。', '有效投注流水是变更发生前已结算、未退款普通订单的投注积分，仅作为分析项；历史缺失时显示未记录。', '初始等级指本次变更前的等级。等级、门槛、AI 基础日额度和规则版本取变更时快照；等级生效时间精确到秒。'],
    columns: [...identity, col('validStakePoints', '有效投注流水（分析项）', 'money'), col('qualifiedPoints', '累计有效加分（升级依据）', 'money'),
      col('beforeLevel', '初始等级'), col('afterLevel', '升级/变更后等级'), col('createdAt', '时间', 'time'), col('status', '变更类型', 'status'),
      col('threshold', '升级门槛', 'money'), col('beforeQuota', '变更前AI基础日额度', 'money'), col('afterQuota', '变更后AI基础日额度', 'money'), col('reason', '升级原因'), col('ruleVersion', '规则版本')] },
  bets: { name: '会员投注记录(新增)', href: '/reports/member-bets', pageId: 'A30',
    purpose: '查看会员的普通彩票积分投注记录，分析有效投注、已到账返还、净输赢和待结算订单。',
    business: ['本页是虚拟积分普通彩票参与记录；AI 合买参与在 AI合买参与记录查看。', '有效投注只统计已完成结算且未退款订单；已结算输赢=净到账返还−投注积分。未结算、正在更正及退款订单不按亏损或零收益统计。', '到账返还包含已入账的更正补发与追回；退款、追回、平台承担和每次结算版本在详情单独列出。'],
    columns: [...identity, col('businessNumber', '订单号'), col('lotteryName', '彩种'), col('playName', '玩法'), col('issueCode', '期号'), col('purchase', '投注积分', 'money'),
      col('drawStatus', '开奖状态'), col('status', '订单状态', 'status'), col('due', '应返积分', 'money'), col('posted', '已到账返还', 'money'), col('profit', '输赢值', 'money'),
      col('createdAt', '投注时间', 'time'), col('settledAt', '结算时间', 'time'), col('refundPoints', '退款积分', 'money')] },
};

export const valueLabels: Record<string, string> = {
  AVAILABLE: '积分账户·可用积分', RESERVED: '已冻结', AI_QUOTA: 'AI合买日额度',
  STATION_VIP_CREDIT: '站长加积分', STATION_DEBIT: '站长减积分', STATION_VIP_CREDIT_REVERSAL: '加分冲正', STATION_DEBIT_REVERSAL: '减分冲正',
  ORDINARY_RESERVE: '普通投注冻结', ORDINARY_LOCK: '普通投注锁定', ORDINARY_AWARD: '普通投注返还', ORDINARY_REFUND: '普通投注退款',
  ORDINARY_CORRECTION_CREDIT: '更正补发', ORDINARY_CORRECTION_RECOVERY: '更正追回', AI_AWARD: 'AI合买返还', AI_PAYOUT_POSTED: 'AI合买返还',
  REFERRAL_FIXED_REWARD: '会员固定推广奖励', REFERRAL_AI_SHARE: 'AI推广分红', REFERRAL_REWARD_RECOVERY: '推广奖励回收',
  AI_QUOTA_OCCUPY: 'AI日额度占用', AI_QUOTA_RELEASE: 'AI日额度释放', REVERSAL: '账变冲正',
  FIXED_REFERRAL: '固定推广奖励', AI_REFERRAL_SHARE: 'AI推广分红',
  PENDING_POLICY: '待政策确认', PENDING_BUDGET: '预算不足待发', PENDING: '待处理', PAID: '已发放', ZERO: '零奖励·无需发放',
  CORRECTING: '正在更正', CORRECTED: '已更正', REFUNDED: '已取消并退款', LOCKED: '已锁定',
  SETTLED: '已结算', WAITING_DRAW: '待开奖', SETTLING: '结算中', AWARD_PENDING_BUDGET: '预算不足待返还',
  CANCELLING: '取消中', CANCELLED: '已取消', EXCEPTION_PENDING: '异常待处理', OPEN: '认购中', DISCLOSED: '已公示待发放',
  ALLOCATION_PENDING: '待计算返还', POSTED: '已入账', UPGRADE: '升级', DOWNGRADE: '降级', REBUILD: '规则重算',
  AWARD:'返还发放', CORRECTION_CREDIT:'更正补发', CORRECTION_RECOVERY:'更正追回', NO_CHANGE:'无需积分变动',
  MEMBER:'会员',STATION_MASTER:'站长',PLATFORM:'平台',DISPOSABLE:'站长可用积分预算',REFERRAL_BUDGET:'平台推广预算',ORDINARY_AWARD_BUDGET:'普通返还预算',AI_BUDGET:'AI返还预算',CONSUMPTION:'参与消耗账户',
};
