import type {
  Category,
  CategoryId,
  LinkItem,
  Note,
  Objective,
  Project,
  QuarterStats,
  WeekMeta,
  WeekTask,
} from '../types'

/** The prototype is frozen at Saturday, 2026-10-17 19:22 (Asia/Shanghai). */
export const NOW = new Date('2026-10-17T19:22:00+08:00')
export const TODAY = '2026-10-17'

export const CATEGORIES: Category[] = [
  { id: 'appsec', name: '应用安全', colorVar: '--cat-appsec' },
  { id: 'secops', name: '安全运营', colorVar: '--cat-secops' },
  { id: 'team', name: '团队建设', colorVar: '--cat-team' },
  { id: 'other', name: '其它提醒', colorVar: '--cat-other' },
]

export const STATUS_LABEL: Record<Objective['status'], string> = {
  planned: '未开始',
  in_progress: '进行中',
  risk: '有风险',
  done: '已完成',
}

export function getCategory(id: CategoryId): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[3]
}

export const YEARS = [2025, 2026, 2027, 2028]

export function quarterKey(year: number, quarter: number): string {
  return `${year}-Q${quarter}`
}

export function quarterRange(year: number, quarter: number): string {
  const startMonth = quarter * 3 - 2
  const endMonth = quarter * 3
  const endDay = [0, 31, 30, 31, 31][quarter]
  return `${startMonth}/01 – ${endMonth}/${endDay}`
}

export const QUARTER_STATS: Record<string, QuarterStats> = {
  '2026-Q1': { workdays: 59, leaveHours: 0 },
  '2026-Q2': { workdays: 61, leaveHours: 0 },
  '2026-Q3': { workdays: 66, leaveHours: 0 },
  '2026-Q4': { workdays: 62, leaveHours: 16 },
  '2027-Q1': {
    workdays: 64,
    leaveHours: 0,
    estimated: true,
    note: '2027 年官方放假安排尚未发布，当前按周末规则估算；发布后可一键更新。',
  },
}

export const OBJECTIVES: Record<string, Objective[]> = {
  '2026-Q1': [
    { id: 'q1-o1', title: '安全运营值守体系升级', categoryId: 'secops', plannedHours: 120, progress: 100, status: 'done', dueDate: '2026-03-31', reminder: '提前 2 天 · 09:30' },
    { id: 'q1-o2', title: '应用安全左移试点', categoryId: 'appsec', plannedHours: 96, progress: 100, status: 'done', dueDate: '2026-03-31' },
    { id: 'q1-o3', title: '团队技能矩阵 v1', categoryId: 'team', plannedHours: 48, progress: 100, status: 'done', dueDate: '2026-03-31' },
    { id: 'q1-o4', title: '年度预算与供应商评估', categoryId: 'other', plannedHours: 64, progress: 100, status: 'done', dueDate: '2026-03-31' },
  ],
  '2026-Q2': [
    { id: 'q2-o1', title: '等保 2.0 差距初评', categoryId: 'appsec', plannedHours: 120, progress: 100, status: 'done', dueDate: '2026-06-30' },
    { id: 'q2-o2', title: 'SOC 告警分级标准', categoryId: 'secops', plannedHours: 96, progress: 100, status: 'done', dueDate: '2026-06-30' },
    { id: 'q2-o3', title: 'AI 编码安全规范 v1', categoryId: 'appsec', plannedHours: 64, progress: 100, status: 'done', dueDate: '2026-06-30' },
    { id: 'q2-o4', title: '数据安全试点', categoryId: 'appsec', plannedHours: 80, progress: 100, status: 'done', dueDate: '2026-06-30' },
  ],
  '2026-Q3': [
    { id: 'q3-o1', title: '攻防演练第一阶段', categoryId: 'secops', plannedHours: 120, progress: 100, status: 'done', dueDate: '2026-09-30' },
    { id: 'q3-o2', title: '数据安全分类分级', categoryId: 'appsec', plannedHours: 96, progress: 100, status: 'done', dueDate: '2026-09-30' },
    { id: 'q3-o3', title: '漏洞管理流程草案', categoryId: 'appsec', plannedHours: 80, progress: 60, status: 'in_progress', dueDate: '2026-09-30' },
    { id: 'q3-o4', title: '安全运营值班优化', categoryId: 'secops', plannedHours: 64, progress: 100, status: 'done', dueDate: '2026-09-30' },
  ],
  '2026-Q4': [
    { id: 'o1', title: '等保 2.0 差距分析闭环', categoryId: 'appsec', plannedHours: 120, progress: 45, status: 'in_progress', dueDate: '2026-10-31', projectId: 'p1', reminder: '提前 2 天 · 09:30' },
    { id: 'o2', title: 'SOC 告警降噪专项', categoryId: 'secops', plannedHours: 80, progress: 60, status: 'in_progress', dueDate: '2026-11-30', projectId: 'p2', reminder: '提前 3 天 · 09:30' },
    { id: 'o3', title: 'Q4 红蓝对抗演练', categoryId: 'secops', plannedHours: 96, progress: 15, status: 'risk', dueDate: '2026-12-18', projectId: 'p3', reminder: '提前 1 周 · 09:30' },
    { id: 'o4', title: 'AI 安全治理基线', categoryId: 'appsec', plannedHours: 64, progress: 10, status: 'planned', dueDate: '2026-12-10', projectId: 'p4' },
    { id: 'o5', title: '安全周报与复盘机制', categoryId: 'team', plannedHours: 24, progress: 100, status: 'done', dueDate: '2026-10-10', reminder: '提前 2 天 · 09:30' },
  ],
  '2027-Q1': [
    { id: '27q1-o1', title: 'AI 安全治理年度路线图', categoryId: 'appsec', plannedHours: 64, progress: 0, status: 'planned', dueDate: '2027-03-31' },
    { id: '27q1-o2', title: '安全运营预算与编制', categoryId: 'team', plannedHours: 64, progress: 0, status: 'planned', dueDate: '2027-02-28' },
  ],
}

export const PROJECTS: Project[] = [
  {
    id: 'p1',
    title: '等保 2.0 整改',
    categoryId: 'appsec',
    description: '覆盖 12 个核心系统的差距分析、制度修订与整改复测，Q4 完成初稿，次年 1 月收口。',
    span: '2026.09 – 2027.01',
    status: 'active',
    objectiveId: 'o1',
    milestones: [
      { id: 'p1-m1', title: '资产盘点与边界梳理', targetDate: '2026-09-30', status: 'done' },
      { id: 'p1-m2', title: '差距分析报告', targetDate: '2026-10-31', status: 'doing' },
      { id: 'p1-m3', title: '制度与流程修订', targetDate: '2026-11-30', status: 'todo' },
      { id: 'p1-m4', title: '整改落地与复测', targetDate: '2026-12-31', status: 'todo' },
    ],
  },
  {
    id: 'p2',
    title: 'SOC 2.0 告警降噪',
    categoryId: 'secops',
    description: '把日均告警压到可运营的量级，建立误报复盘与值班机制。',
    span: '2026.10 – 2027.01',
    status: 'active',
    objectiveId: 'o2',
    milestones: [
      { id: 'p2-m1', title: '告警基线与误报盘点', targetDate: '2026-10-08', status: 'done' },
      { id: 'p2-m2', title: '降噪规则 v2 灰度', targetDate: '2026-11-15', status: 'doing' },
      { id: 'p2-m3', title: '运营看板与值班机制', targetDate: '2026-12-20', status: 'todo' },
    ],
  },
  {
    id: 'p3',
    title: 'Q4 红蓝对抗',
    categoryId: 'secops',
    description: '一次以真实攻击面为入口的实战演练，输出可执行的整改清单。',
    span: '2026.10 – 2026.12',
    status: 'risk',
    objectiveId: 'o3',
    milestones: [
      { id: 'p3-m1', title: '演练方案评审', targetDate: '2026-10-12', status: 'done' },
      { id: 'p3-m2', title: '攻击面梳理与目标圈定', targetDate: '2026-10-28', status: 'doing' },
      { id: 'p3-m3', title: '实战演练', targetDate: '2026-12-05', status: 'todo' },
      { id: 'p3-m4', title: '复盘与整改清单', targetDate: '2026-12-20', status: 'todo' },
    ],
  },
  {
    id: 'p4',
    title: 'AI 安全治理基线',
    categoryId: 'appsec',
    description: '面向内部 AI 应用与研发工具链的资产、风险与控制要求，先立基线再试点。',
    span: '2026.10 – 2027.03',
    status: 'active',
    objectiveId: 'o4',
    milestones: [
      { id: 'p4-m1', title: '治理范围与资产清单', targetDate: '2026-11-10', status: 'doing' },
      { id: 'p4-m2', title: '风险基线与控制要求', targetDate: '2026-12-05', status: 'todo' },
      { id: 'p4-m3', title: '治理规范发布', targetDate: '2026-12-31', status: 'todo' },
      { id: 'p4-m4', title: '试点落地与评估', targetDate: '2027-03-31', status: 'todo' },
    ],
  },
  {
    id: 'p5',
    title: '漏洞管理流程升级',
    categoryId: 'appsec',
    description: '从扫描到修复闭环的流程重做，打通工具链并完成试运行。',
    span: '2026.08 – 2026.11',
    status: 'active',
    milestones: [
      { id: 'p5-m1', title: '现状调研', targetDate: '2026-08-30', status: 'done' },
      { id: 'p5-m2', title: '流程草案', targetDate: '2026-09-20', status: 'done' },
      { id: 'p5-m3', title: '工具链打通', targetDate: '2026-10-10', status: 'done' },
      { id: 'p5-m4', title: '试运行', targetDate: '2026-10-12', status: 'done' },
      { id: 'p5-m5', title: '正式发布', targetDate: '2026-11-15', status: 'doing' },
    ],
  },
]

export const WEEKS: Record<string, WeekMeta> = {
  '2026-W40': { key: '2026-W40', num: 40, start: '2026-09-28', end: '2026-10-04', range: '09/28 – 10/04', workdays: 3, leaveHours: 0, note: '跨季度' },
  '2026-W41': { key: '2026-W41', num: 41, start: '2026-10-05', end: '2026-10-11', range: '10/05 – 10/11', workdays: 3, leaveHours: 0 },
  '2026-W42': { key: '2026-W42', num: 42, start: '2026-10-12', end: '2026-10-18', range: '10/12 – 10/18', workdays: 5, leaveHours: 0 },
  '2026-W43': { key: '2026-W43', num: 43, start: '2026-10-19', end: '2026-10-25', range: '10/19 – 10/25', workdays: 5, leaveHours: 16 },
  '2026-W44': { key: '2026-W44', num: 44, start: '2026-10-26', end: '2026-11-01', range: '10/26 – 11/01', workdays: 5, leaveHours: 0 },
  '2026-W45': { key: '2026-W45', num: 45, start: '2026-11-02', end: '2026-11-08', range: '11/02 – 11/08', workdays: 5, leaveHours: 0 },
}

export const WEEK_ORDER = Object.keys(WEEKS)

export const INITIAL_TASKS: WeekTask[] = [
  { id: 't-w41-1', weekKey: '2026-W41', title: '补充资产台账字段', categoryId: 'appsec', dueDate: '2026-10-10', estimateHours: 3, done: false, objectiveId: 'o1', projectId: 'p1', reminder: '提前 1 天 · 09:30' },
  { id: 't-w41-2', weekKey: '2026-W41', title: '等保整改启动会', categoryId: 'appsec', dueDate: '2026-10-09', estimateHours: 2, done: true, objectiveId: 'o1', projectId: 'p1' },
  { id: 't1', weekKey: '2026-W42', title: '输出等保差距分析初稿', categoryId: 'appsec', dueDate: '2026-10-17', dueTime: '23:30', estimateHours: 6, done: false, objectiveId: 'o1', projectId: 'p1', reminder: '提前 2 天 · 09:30' },
  { id: 't2', weekKey: '2026-W42', title: '梳理 12 个核心系统边界', categoryId: 'appsec', dueDate: '2026-10-16', estimateHours: 4, done: true, objectiveId: 'o1', projectId: 'p1' },
  { id: 't3', weekKey: '2026-W42', title: '评审 SOC 降噪规则 v2', categoryId: 'secops', dueDate: '2026-10-17', dueTime: '15:00', estimateHours: 3, done: true, objectiveId: 'o2', projectId: 'p2', reminder: '提前 1 天 · 09:30' },
  { id: 't4', weekKey: '2026-W42', title: '与 HR 对齐 Q4 安全培训计划', categoryId: 'team', dueDate: '2026-10-18', estimateHours: 2, done: false, reminder: '提前 1 天 · 09:30' },
  { id: 't5', weekKey: '2026-W42', title: '更新安全周报模板', categoryId: 'other', dueDate: '2026-10-18', estimateHours: 2, done: false },
  { id: 't6', weekKey: '2026-W42', title: '红蓝对抗攻击面初筛', categoryId: 'secops', dueDate: '2026-10-18', estimateHours: 5, done: false, objectiveId: 'o3', projectId: 'p3', reminder: '提前 2 天 · 09:30' },
  { id: 't7', weekKey: '2026-W42', title: 'AI 安全治理厂商调研', categoryId: 'appsec', dueDate: '2026-10-18', estimateHours: 4, done: false, objectiveId: 'o4', projectId: 'p4' },
  { id: 't14', weekKey: '2026-W42', title: '回复安全委员会周报邮件', categoryId: 'other', dueDate: '2026-10-17', dueTime: '20:30', estimateHours: 1, done: false, reminder: '当天 · 18:00' },
  { id: 't8', weekKey: '2026-W43', title: '差距分析评审会', categoryId: 'appsec', dueDate: '2026-10-20', dueTime: '10:00', estimateHours: 2, done: false, objectiveId: 'o1', projectId: 'p1', reminder: '提前 1 天 · 09:30' },
  { id: 't9', weekKey: '2026-W43', title: 'SOC 降噪规则灰度', categoryId: 'secops', dueDate: '2026-10-22', estimateHours: 4, done: false, objectiveId: 'o2', projectId: 'p2' },
  { id: 't10', weekKey: '2026-W43', title: '红蓝演练方案定稿', categoryId: 'secops', dueDate: '2026-10-23', estimateHours: 3, done: false, objectiveId: 'o3', projectId: 'p3', reminder: '提前 2 天 · 09:30' },
  { id: 't11', weekKey: '2026-W43', title: 'AI 治理资产清单 v0.1', categoryId: 'appsec', dueDate: '2026-10-24', estimateHours: 6, done: false, objectiveId: 'o4', projectId: 'p4' },
  { id: 't12', weekKey: '2026-W44', title: '制度修订启动', categoryId: 'appsec', dueDate: '2026-10-28', estimateHours: 4, done: false, objectiveId: 'o1', projectId: 'p1' },
  { id: 't13', weekKey: '2026-W44', title: '等保差距分析报告评审', categoryId: 'appsec', dueDate: '2026-10-31', estimateHours: 3, done: false, objectiveId: 'o1', projectId: 'p1', reminder: '提前 2 天 · 09:30' },
]

export const NOTES: Note[] = [
  {
    id: 'n1',
    title: 'Q4 安全委员会汇报要点',
    updatedAt: '10/15 21:40',
    pinned: true,
    content: `# Q4 安全委员会汇报要点

## 本季度进展
- 等保 2.0 差距分析完成 45%，10/31 出初稿
- SOC 告警降噪规则 v2 已评审，误报率目标下降 40%
- 红蓝对抗方案已立项，12 月进入实战
- AI 安全治理完成范围确认，开始资产盘点

## 需要协调
- 应用团队投入 2 人参与整改
- AI 安全治理试点预算 30 万，需 Q4 立项
- 12 月演练期间希望运维安排值守窗口

## 下次汇报
11 月 15 日，重点讲降噪收益与红蓝准备度。`,
  },
  {
    id: 'n2',
    title: '等保整改 10/15 会议纪要',
    updatedAt: '10/15 18:05',
    pinned: true,
    content: `# 等保整改 10/15 会议纪要

## 结论
- 12 个核心系统边界以 CMDB 为准，本周内完成核对
- 差距分析先覆盖三级系统，二级系统随制度修订补齐
- 制度修订由安全部起草，法务与运维会签

## Action
- 10/17：差距分析初稿（我）
- 10/20：评审会，邀请应用与运维负责人
- 10/24：制度修订清单 v0.1`,
  },
  {
    id: 'n3',
    title: 'AI 安全治理调研清单',
    updatedAt: '10/13 11:20',
    content: `# AI 安全治理调研清单

## 范围
- 内部 AI 应用、Copilot 类研发工具、模型 API 调用
- 数据分类分级与提示词注入风险

## 待看
- NIST AI RMF
- OWASP Top 10 for LLM
- 公司数据出境与供应商安全要求

## 下一步
- 10/24 前完成资产清单 v0.1
- 11 月选 2 个试点场景`,
  },
]

export const LINKS: LinkItem[] = [
  {
    id: 'l1',
    title: 'OWASP Top 10',
    url: 'https://owasp.org/www-project-top-ten/',
    domain: 'owasp.org',
    categoryId: 'appsec',
    description: 'Web 应用安全风险基线，季度培训与代码审计引用。',
    letter: 'O',
  },
  {
    id: 'l2',
    title: '等保 2.0 标准与测评要求',
    url: 'https://www.tc260.org.cn/',
    domain: 'tc260.org.cn',
    categoryId: 'appsec',
    description: 'GB/T 22239-2019 与测评要求，整改工作依据。',
    letter: '等',
  },
  {
    id: 'l3',
    title: 'MITRE ATT&CK',
    url: 'https://attack.mitre.org/',
    domain: 'attack.mitre.org',
    categoryId: 'secops',
    description: '红蓝对抗与检测规则映射，ATT&CK Navigator 常用。',
    letter: 'M',
  },
  {
    id: 'l4',
    title: 'NIST Cybersecurity Framework 2.0',
    url: 'https://www.nist.gov/cyberframework',
    domain: 'nist.gov',
    categoryId: 'appsec',
    description: '安全治理框架参考，用于年度路线图对标。',
    letter: 'N',
  },
  {
    id: 'l5',
    title: '漏洞管理 SOP v3',
    url: 'https://wiki.internal.example/security/vuln-sop',
    domain: 'wiki.internal',
    categoryId: 'other',
    description: '内部流程文档，扫描到修复的时限与升级路径。',
    letter: '漏',
    internal: true,
  },
  {
    id: 'l6',
    title: 'AI 安全治理参考清单',
    url: 'https://wiki.internal.example/security/ai-governance',
    domain: 'wiki.internal',
    categoryId: 'other',
    description: '内部调研资料：资产清单模板、供应商评估问题集。',
    letter: 'A',
    internal: true,
  },
]

export const MONTH_STATS = [
  { month: '10 月', workdays: 18, leaveHours: 16, available: 128, allocated: 130, completion: 42 },
  { month: '11 月', workdays: 21, leaveHours: 0, available: 168, allocated: 140, completion: 36 },
  { month: '12 月', workdays: 23, leaveHours: 0, available: 184, allocated: 114, completion: 28 },
]

export const WEEK_STATS = [
  { week: 'W40', workdays: 3, available: 24, planned: 0, done: 0 },
  { week: 'W41', workdays: 3, available: 24, planned: 5, done: 2 },
  { week: 'W42', workdays: 5, available: 40, planned: 27, done: 7 },
  { week: 'W43', workdays: 5, available: 40, planned: 15, done: 0 },
  { week: 'W44', workdays: 5, available: 40, planned: 7, done: 0 },
]

/** Chinese official calendar details used by the prototype. */
export const DAY_NOTES: Record<string, { kind: 'holiday' | 'makeup' | 'leave'; label: string }> = {
  '2026-10-01': { kind: 'holiday', label: '国庆' },
  '2026-10-02': { kind: 'holiday', label: '国庆' },
  '2026-10-03': { kind: 'holiday', label: '国庆' },
  '2026-10-04': { kind: 'holiday', label: '国庆' },
  '2026-10-05': { kind: 'holiday', label: '国庆' },
  '2026-10-06': { kind: 'holiday', label: '国庆' },
  '2026-10-07': { kind: 'holiday', label: '国庆' },
  '2026-10-10': { kind: 'makeup', label: '调休上班' },
  '2026-10-20': { kind: 'leave', label: '年假' },
  '2026-10-21': { kind: 'leave', label: '年假' },
}

export function dayInfo(dateISO: string): {
  kind: 'workday' | 'weekend' | 'holiday' | 'makeup' | 'leave'
  label?: string
  isWorkday: boolean
} {
  const noted = DAY_NOTES[dateISO]
  if (noted?.kind === 'leave') return { kind: 'leave', label: noted.label, isWorkday: false }
  if (noted?.kind === 'holiday') return { kind: 'holiday', label: noted.label, isWorkday: false }
  if (noted?.kind === 'makeup') return { kind: 'makeup', label: noted.label, isWorkday: true }
  const day = new Date(`${dateISO}T12:00:00+08:00`).getDay()
  if (day === 0 || day === 6) return { kind: 'weekend', isWorkday: false }
  return { kind: 'workday', isWorkday: true }
}

export const WEEKDAY_CN = ['日', '一', '二', '三', '四', '五', '六']
