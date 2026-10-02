import Link from 'next/link';
import { useState } from 'react';
import { ActionButton, Dialog, PageHeader, Panel } from '@/components/admin-workspace/admin-workspace';
import styles from './change-notes.module.css';

export const availablePointsFormula = '可用积分 = 累计充值积分 + 总推广积分 + 净输赢值 + AI合买分红 - 站长扣除积分';

const memberChange = {
  name: '会员列表(修改)',
  href: '/members',
  summary: '增加每页 20/40/60/80/100 条与翻页；会员名称下隐藏账号和 ID；调整积分、AI 额度、下级统计及邀请码字段，并同步会员详情。',
  changes: [
    '底部分页默认每页 20 条，可选择 20/40/60/80/100 条，显示总条数、当前范围和页数，支持上一页、下一页。查询、重置或切换每页条数时返回第一页。',
    '会员清单名称栏仅显示会员名称，未设置名称时显示登录账号；保留名称与“查看详情”的跳转，仍可按会员编号、昵称或账号搜索。',
    '保留“站长扣除积分”及之前的列；之后依次展示可用积分、冻结积分、AI分红、已结算净收益、总推广积分、总参与积分、AI总额度、AI使用额度、AI剩余额度、直属会员数、下级总会员、直属会员可用积分、下级会员总可用积分、邀请码，末尾保留操作列。会员详情同步相同数据。',
  ],
  fields: [
    ['可用积分', `${availablePointsFormula}。净输赢值对应“已结算净收益”，AI合买分红对应“AI分红”；按该公式计算，冻结积分单列展示，不在公式中另行扣减。`],
    ['冻结积分', '从原“可用 / 冻结”列拆出，展示当前冻结积分。'],
    ['AI分红', '新增，累计已到账的 AI 合买分红；本地模拟发放后增加。'],
    ['已结算净收益', '已结算参与产生的净输赢，盈利为正、亏损为负，不含单列的 AI 分红及推广积分。'],
    ['总推广积分', '新增，累计获得的推广奖励积分，不是下级余额。'],
    ['总参与积分', '会员累计参与使用的积分，作为统计值展示，不在可用积分公式中重复扣减。'],
    ['AI总额度 / AI使用额度 / AI剩余额度', '拆分为三列，展示当日 AI 合买总额度、已使用额度和剩余额度；剩余额度 = 总额度 − 使用额度。额度不是积分余额。'],
    ['直属会员数 / 下级总会员', '直属为第一层推荐会员；下级总会员包括直属及全部间接下级，去重且不含本人。'],
    ['直属会员可用积分 / 下级会员总可用积分', '分别汇总直属会员和全部下级的当前可用积分，不受列表筛选、分页影响；没有下级时显示 0.00。'],
    ['邀请码', '新增，展示会员的固定演示邀请码；不随翻页或刷新改变。'],
    ['移除与填写规则', '列表移除会员名称下的账号 / ID 副行及“额度资格”列；详情仍保留身份信息和资格状态。所有统计字段只读，积分与额度保留两位小数，人数为整数，邀请码按文本展示。'],
  ],
  business: [
    '筛选后分页只作用于符合条件的会员清单。详情、会员状态、归属纠正及账本链接继续使用原会员 ID。',
    '下级关系以直属上级会员逐层统计；归属纠正或本地积分变更后，列表与详情重新读取时同步更新。',
    '模拟 AI 发放增加 AI 分红，模拟普通订单结算更新净收益，可用积分按同一公式重算。已有本地数据保留，缺失的新字段补齐；旧记录中可识别的 AI 发放计入 AI 分红。',
    '本模块仍为纯前端原型，使用本地演示数据与浏览器存储，无真实后台发放或 API 服务。',
  ],
};

const versionChange = {
  name: '版本修改说明(新增)',
  href: '/version-changes',
  summary: '在左侧菜单上方增加统一修改汇总，查看各模块修改内容、字段说明、业务说明并直接跳转。',
  changes: ['新增左侧入口、当前版本汇总页和各模块跳转；汇总页与模块右上角说明共用同一份内容。'],
  fields: [['模块名称 / 大体内容 / 跳转链接', '分别展示发生变化的模块名称、修改摘要和可点击的模块入口，均为只读。'], ['版本号', '尚未指定，显示“版本号待指定”；同一当前版本持续汇总，不自动递增或按日期生成。']],
  business: ['所有本次新增与修改统一归入当前版本；只有人为明确指定新版本时才建立新版本。'],
};

const changes = { members: memberChange, versions: versionChange };
type ChangeKey = keyof typeof changes;
type Change = typeof memberChange;

function ChangeContent({ change }: { change: Change }) {
  return <div className={styles.content}>
    <section><h3>修改内容</h3><ul>{change.changes.map(item => <li key={item}>{item}</li>)}</ul></section>
    <section><h3>字段说明</h3><dl>{change.fields.map(([label, description]) => <div key={label}><dt>{label}</dt><dd>{description}</dd></div>)}</dl></section>
    <section><h3>业务说明</h3><ul>{change.business.map(item => <li key={item}>{item}</li>)}</ul></section>
  </div>;
}

export function ChangeNotesButton({ module = 'members' }: { module?: ChangeKey }) {
  const [open, setOpen] = useState(false);
  const change = changes[module];
  return <>
    <ActionButton onClick={() => setOpen(true)}>修改说明</ActionButton>
    <Dialog open={open} onClose={() => setOpen(false)} title={`${change.name} · 修改说明`} description="当前版本（版本号待指定）" width="wide">
      <ChangeContent change={change} />
    </Dialog>
  </>;
}

export function VersionChangesPage() {
  return <>
    <PageHeader pageId="修改汇总" title="版本修改说明(新增)" description="当前版本（版本号待指定）。以下内容与对应模块右上方的修改说明保持一致。" actions={<ChangeNotesButton module="versions" />} />
    {Object.values(changes).map(change => <Panel key={change.href} title={change.name} description={change.summary} actions={<Link className={styles.link} href={change.href}>进入模块 →</Link>}>
      <details><summary className={styles.summary}>查看修改内容、字段说明和业务说明</summary><ChangeContent change={change} /></details>
    </Panel>)}
  </>;
}
