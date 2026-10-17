import {
  CALENDAR_ADJUSTMENTS,
  CHINA_HOLIDAYS,
  CHINA_MAKEUP_DAYS,
  calendarDay,
  monthStats as computeMonthStats,
  quarterStats as computeQuarterStats,
  setCalendarAdjustments,
  weekStats as computeWeekStats,
} from '../calendar'
import type { CalendarAdjustment } from '../calendar'
import type {
  Category,
  CategoryId,
  LinkCategory,
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

export const CATEGORY_COLORS = [
  { value: '--cat-appsec', label: '蓝 · 应用安全' },
  { value: '--cat-secops', label: '橙 · 安全运营' },
  { value: '--cat-team', label: '绿 · 团队建设' },
  { value: '--cat-other', label: '紫 · 其它' },
]

export function getCategory(id: CategoryId): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]
}

export const LINK_CATEGORIES: LinkCategory[] = [
  { id: 'standards', name: '安全标准', colorVar: '--cat-appsec' },
  { id: 'tools', name: '工具平台', colorVar: '--cat-team' },
  { id: 'internal', name: '内部系统', colorVar: '--cat-other' },
  { id: 'reading', name: '学习资料', colorVar: '--cat-secops' },
  { id: 'unsorted', name: '待整理', colorVar: '--text-3' },
]

export const LINK_CATEGORY_COLORS = [
  { value: '--cat-appsec', label: '蓝' },
  { value: '--cat-team', label: '绿' },
  { value: '--cat-other', label: '紫' },
  { value: '--cat-secops', label: '橙' },
]

export function getLinkCategory(
  id: string,
  categories: LinkCategory[] = LINK_CATEGORIES,
): LinkCategory {
  return (
    categories.find((category) => category.id === id) ??
    categories.find((category) => category.id === 'unsorted') ??
    categories[categories.length - 1]
  )
}

export function addCategory(name: string, colorVar: string): Category {
  const category: Category = {
    id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    name,
    colorVar,
  }
  CATEGORIES.push(category)
  return category
}

export function replaceCategories(next: Category[]): void {
  if (!Array.isArray(next) || next.length === 0) return
  CATEGORIES.splice(0, CATEGORIES.length, ...next.map((category) => ({ ...category })))
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

const QUARTER_STAT_KEYS = YEARS.flatMap((year) =>
  [1, 2, 3, 4].map((quarter) => `${year}-Q${quarter}`),
)

export const QUARTER_STATS: Record<string, QuarterStats> = Object.fromEntries(
  QUARTER_STAT_KEYS.map((key) => {
    const [yearText, quarterText] = key.split('-Q')
    const stats = computeQuarterStats(Number(yearText), Number(quarterText))
    return [
      key,
      {
        workdays: stats.workdays,
        leaveDays: stats.leaveDays,
        ...(stats.estimated ? { estimated: true } : {}),
        ...(stats.note ? { note: stats.note } : {}),
      } satisfies QuarterStats,
    ]
  }),
)

export const OBJECTIVES: Record<string, Objective[]> = {
  '2026-Q1': [
    { id: 'q1-o1', title: '安全运营值守体系升级', categoryId: 'secops', plannedDays: 15, progress: 100, status: 'done', dueDate: '2026-03-31', reminder: '提前 2 天 · 09:30' },
    { id: 'q1-o2', title: '应用安全左移试点', categoryId: 'appsec', plannedDays: 12, progress: 100, status: 'done', dueDate: '2026-03-31' },
    { id: 'q1-o3', title: '团队技能矩阵 v1', categoryId: 'team', plannedDays: 6, progress: 100, status: 'done', dueDate: '2026-03-31' },
    { id: 'q1-o4', title: '年度预算与供应商评估', categoryId: 'other', plannedDays: 8, progress: 100, status: 'done', dueDate: '2026-03-31' },
  ],
  '2026-Q2': [
    { id: 'q2-o1', title: '等保 2.0 差距初评', categoryId: 'appsec', plannedDays: 15, progress: 100, status: 'done', dueDate: '2026-06-30' },
    { id: 'q2-o2', title: 'SOC 告警分级标准', categoryId: 'secops', plannedDays: 12, progress: 100, status: 'done', dueDate: '2026-06-30' },
    { id: 'q2-o3', title: 'AI 编码安全规范 v1', categoryId: 'appsec', plannedDays: 8, progress: 100, status: 'done', dueDate: '2026-06-30' },
    { id: 'q2-o4', title: '数据安全试点', categoryId: 'appsec', plannedDays: 10, progress: 100, status: 'done', dueDate: '2026-06-30' },
  ],
  '2026-Q3': [
    { id: 'q3-o1', title: '攻防演练第一阶段', categoryId: 'secops', plannedDays: 15, progress: 100, status: 'done', dueDate: '2026-09-30' },
    { id: 'q3-o2', title: '数据安全分类分级', categoryId: 'appsec', plannedDays: 12, progress: 100, status: 'done', dueDate: '2026-09-30' },
    { id: 'q3-o3', title: '漏洞管理流程草案', categoryId: 'appsec', plannedDays: 10, progress: 60, status: 'in_progress', dueDate: '2026-09-30' },
    { id: 'q3-o4', title: '安全运营值班优化', categoryId: 'secops', plannedDays: 8, progress: 100, status: 'done', dueDate: '2026-09-30' },
  ],
  '2026-Q4': [
    { id: 'o1', title: '等保 2.0 差距分析闭环', categoryId: 'appsec', plannedDays: 15, progress: 45, status: 'in_progress', dueDate: '2026-10-31', projectId: 'p1', reminder: '提前 2 天 · 09:30' },
    { id: 'o2', title: 'SOC 告警降噪专项', categoryId: 'secops', plannedDays: 10, progress: 60, status: 'in_progress', dueDate: '2026-11-30', projectId: 'p2', reminder: '提前 3 天 · 09:30' },
    { id: 'o3', title: 'Q4 红蓝对抗演练', categoryId: 'secops', plannedDays: 12, progress: 15, status: 'risk', dueDate: '2026-12-18', projectId: 'p3', reminder: '提前 1 周 · 09:30' },
    { id: 'o4', title: 'AI 安全治理基线', categoryId: 'appsec', plannedDays: 8, progress: 10, status: 'planned', dueDate: '2026-12-10', projectId: 'p4' },
    { id: 'o5', title: '安全周报与复盘机制', categoryId: 'team', plannedDays: 3, progress: 100, status: 'done', dueDate: '2026-10-10', reminder: '提前 2 天 · 09:30' },
  ],
  '2027-Q1': [
    { id: '27q1-o1', title: 'AI 安全治理年度路线图', categoryId: 'appsec', plannedDays: 8, progress: 0, status: 'planned', dueDate: '2027-03-31' },
    { id: '27q1-o2', title: '安全运营预算与编制', categoryId: 'team', plannedDays: 8, progress: 0, status: 'planned', dueDate: '2027-02-28' },
  ],
}

export const PROJECTS: Project[] = [
  {
    id: 'p1',
    title: '等保 2.0 整改',
    categoryId: 'appsec',
    description: '覆盖 12 个核心系统的差距分析、制度修订与整改复测，Q4 完成初稿，次年 1 月收口。',
    span: '2026.09 – 2027.01',
    startDate: '2026-09-01',
    endDate: '2027-01-31',
    status: 'active',
    objectiveId: 'o1',
    plannedDays: 15,
    workItems: [
      { id: 'wi-p1-1', title: '差距分析证据清单', plannedDays: 0.5, weekKey: '2026-W42', status: 'todo' },
      { id: 'wi-p1-2', title: '差距分析初稿评审', plannedDays: 0.5, weekKey: '2026-W43', status: 'todo' },
      { id: 'wi-p1-3', title: '制度修订清单', plannedDays: 0.5, weekKey: '2026-W44', status: 'todo' },
      { id: 'wi-p1-4', title: '控制项整改方案', plannedDays: 0.75, weekKey: '2026-W45', status: 'todo' },
      { id: 'wi-p1-5', title: '整改实施跟踪', plannedDays: 1, weekKey: '2026-W46', status: 'todo' },
      { id: 'wi-p1-6', title: '复测与报告', plannedDays: 0.5, weekKey: '2026-W47', status: 'todo' },
      { id: 'wi-p1-7', title: '整改材料归档', plannedDays: 2, weekKey: '2027-W01', status: 'todo' },
      { id: 'wi-p1-8', title: '等保复测准备', plannedDays: 2, weekKey: '2027-W02', status: 'todo' },
      { id: 'wi-p1-9', title: '年度合规复盘', plannedDays: 2, weekKey: '2027-W03', status: 'todo' },
    ],
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
    startDate: '2026-10-01',
    endDate: '2027-01-31',
    status: 'active',
    objectiveId: 'o2',
    plannedDays: 10,
    workItems: [
      { id: 'wi-p2-1', title: '降噪规则灰度准备', plannedDays: 0.5, weekKey: '2026-W42', status: 'todo' },
      { id: 'wi-p2-2', title: '灰度观察与误报复盘', plannedDays: 0.5, weekKey: '2026-W43', status: 'todo' },
      { id: 'wi-p2-3', title: '运营看板需求', plannedDays: 0.5, weekKey: '2026-W44', status: 'todo' },
      { id: 'wi-p2-4', title: '值班机制草案', plannedDays: 0.5, weekKey: '2026-W45', status: 'todo' },
      { id: 'wi-p2-5', title: '告警降噪验收', plannedDays: 2, weekKey: '2027-W01', status: 'todo' },
      { id: 'wi-p2-6', title: 'SOC 2.0 收口', plannedDays: 2, weekKey: '2027-W02', status: 'todo' },
    ],
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
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    status: 'risk',
    objectiveId: 'o3',
    plannedDays: 12,
    workItems: [
      { id: 'wi-p3-1', title: '攻击面梳理', plannedDays: 0.5, weekKey: '2026-W42', status: 'todo' },
      { id: 'wi-p3-2', title: '演练方案定稿', plannedDays: 0.5, weekKey: '2026-W43', status: 'todo' },
      { id: 'wi-p3-3', title: '演练环境与规则', plannedDays: 0.5, weekKey: '2026-W44', status: 'todo' },
      { id: 'wi-p3-4', title: '实战演练', plannedDays: 1.25, weekKey: '2026-W47', status: 'todo' },
    ],
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
    startDate: '2026-10-01',
    endDate: '2027-03-31',
    status: 'active',
    objectiveId: 'o4',
    plannedDays: 8,
    workItems: [
      { id: 'wi-p4-1', title: '治理范围与资产清单', plannedDays: 0.5, weekKey: '2026-W43', status: 'todo' },
      { id: 'wi-p4-2', title: '风险基线调研', plannedDays: 0.5, weekKey: '2026-W44', status: 'todo' },
      { id: 'wi-p4-3', title: '控制要求草案', plannedDays: 0.5, weekKey: '2026-W45', status: 'todo' },
      { id: 'wi-p4-4', title: 'AI 资产分级试点', plannedDays: 2, weekKey: '2027-W02', status: 'todo' },
      { id: 'wi-p4-5', title: '治理基线评审', plannedDays: 2, weekKey: '2027-W03', status: 'todo' },
    ],
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
    startDate: '2026-08-01',
    endDate: '2026-11-30',
    status: 'active',
    plannedDays: 5,
    workItems: [
      { id: 'wi-p5-1', title: '试运行复盘', plannedDays: 0.25, weekKey: '2026-W42', status: 'done' },
      { id: 'wi-p5-2', title: '正式发布宣贯', plannedDays: 0.25, weekKey: '2026-W43', status: 'todo' },
    ],
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
  '2026-W40': { key: '2026-W40', num: 40, start: '2026-09-28', end: '2026-10-04', range: '09/28 – 10/04', workdays: 3, leaveDays: 0, note: '跨季度' },
  '2026-W41': { key: '2026-W41', num: 41, start: '2026-10-05', end: '2026-10-11', range: '10/05 – 10/11', workdays: 3, leaveDays: 0 },
  '2026-W42': { key: '2026-W42', num: 42, start: '2026-10-12', end: '2026-10-18', range: '10/12 – 10/18', workdays: 5, leaveDays: 0 },
  '2026-W43': { key: '2026-W43', num: 43, start: '2026-10-19', end: '2026-10-25', range: '10/19 – 10/25', workdays: 5, leaveDays: 2 },
  '2026-W44': { key: '2026-W44', num: 44, start: '2026-10-26', end: '2026-11-01', range: '10/26 – 11/01', workdays: 5, leaveDays: 0 },
  '2026-W45': { key: '2026-W45', num: 45, start: '2026-11-02', end: '2026-11-08', range: '11/02 – 11/08', workdays: 5, leaveDays: 0 },
  '2026-W46': { key: '2026-W46', num: 46, start: '2026-11-09', end: '2026-11-15', range: '11/09 – 11/15', workdays: 5, leaveDays: 0 },
  '2026-W47': { key: '2026-W47', num: 47, start: '2026-11-16', end: '2026-11-22', range: '11/16 – 11/22', workdays: 5, leaveDays: 0 },
  '2026-W48': { key: '2026-W48', num: 48, start: '2026-11-23', end: '2026-11-29', range: '11/23 – 11/29', workdays: 5, leaveDays: 0 },
  '2026-W49': { key: '2026-W49', num: 49, start: '2026-11-30', end: '2026-12-06', range: '11/30 – 12/06', workdays: 5, leaveDays: 0 },
  '2026-W50': { key: '2026-W50', num: 50, start: '2026-12-07', end: '2026-12-13', range: '12/07 – 12/13', workdays: 5, leaveDays: 0 },
  '2026-W51': { key: '2026-W51', num: 51, start: '2026-12-14', end: '2026-12-20', range: '12/14 – 12/20', workdays: 5, leaveDays: 0 },
  '2026-W52': { key: '2026-W52', num: 52, start: '2026-12-21', end: '2026-12-27', range: '12/21 – 12/27', workdays: 5, leaveDays: 0 },
  '2027-W01': { key: '2027-W01', num: 1, start: '2026-12-28', end: '2027-01-03', range: '12/28 – 01/03', workdays: 5, leaveDays: 0, note: '跨年周 · 2027 按工作日估算' },
  '2027-W02': { key: '2027-W02', num: 2, start: '2027-01-04', end: '2027-01-10', range: '01/04 – 01/10', workdays: 5, leaveDays: 0 },
  '2027-W03': { key: '2027-W03', num: 3, start: '2027-01-11', end: '2027-01-17', range: '01/11 – 01/17', workdays: 5, leaveDays: 0 },
  '2027-W04': { key: '2027-W04', num: 4, start: '2027-01-18', end: '2027-01-24', range: '01/18 – 01/24', workdays: 5, leaveDays: 0 },
  '2027-W05': { key: '2027-W05', num: 5, start: '2027-01-25', end: '2027-01-31', range: '01/25 – 01/31', workdays: 5, leaveDays: 0 },
  '2027-W06': { key: '2027-W06', num: 6, start: '2027-02-01', end: '2027-02-07', range: '02/01 – 02/07', workdays: 5, leaveDays: 0 },
}

for (const meta of Object.values(WEEKS)) {
  const stats = computeWeekStats(meta.start, meta.end)
  meta.workdays = stats.workdays
  meta.leaveDays = stats.leaveDays
}

export const WEEK_ORDER = Object.keys(WEEKS)

export const INITIAL_TASKS: WeekTask[] = [
  { id: 't-w41-1', weekKey: '2026-W41', title: '补充资产台账字段', categoryId: 'appsec', dueDate: '2026-10-10', estimateDays: 0.5, done: false, objectiveId: 'o1', projectId: 'p1', reminder: '提前 1 天 · 09:30' },
  { id: 't-w41-2', weekKey: '2026-W41', title: '等保整改启动会', categoryId: 'appsec', dueDate: '2026-10-09', estimateDays: 0.25, done: true, objectiveId: 'o1', projectId: 'p1' },
  { id: 't1', weekKey: '2026-W42', title: '输出等保差距分析初稿', categoryId: 'appsec', dueDate: '2026-10-17', dueTime: '23:30', estimateDays: 0.75, done: false, objectiveId: 'o1', projectId: 'p1', reminder: '提前 2 天 · 09:30' },
  { id: 't2', weekKey: '2026-W42', title: '梳理 12 个核心系统边界', categoryId: 'appsec', dueDate: '2026-10-16', estimateDays: 0.5, done: true, objectiveId: 'o1', projectId: 'p1' },
  { id: 't3', weekKey: '2026-W42', title: '评审 SOC 降噪规则 v2', categoryId: 'secops', dueDate: '2026-10-17', dueTime: '15:00', estimateDays: 0.5, done: true, objectiveId: 'o2', projectId: 'p2', reminder: '提前 1 天 · 09:30' },
  { id: 't4', weekKey: '2026-W42', title: '与 HR 对齐 Q4 安全培训计划', categoryId: 'team', dueDate: '2026-10-18', estimateDays: 0.25, done: false, reminder: '提前 1 天 · 09:30' },
  { id: 't5', weekKey: '2026-W42', title: '更新安全周报模板', categoryId: 'other', dueDate: '2026-10-18', estimateDays: 0.25, done: false },
  { id: 't6', weekKey: '2026-W42', title: '红蓝对抗攻击面初筛', categoryId: 'secops', dueDate: '2026-10-18', estimateDays: 0.5, done: false, objectiveId: 'o3', projectId: 'p3', reminder: '提前 2 天 · 09:30' },
  { id: 't7', weekKey: '2026-W42', title: 'AI 安全治理厂商调研', categoryId: 'appsec', dueDate: '2026-10-18', estimateDays: 0.5, done: false, objectiveId: 'o4', projectId: 'p4' },
  { id: 't14', weekKey: '2026-W42', title: '回复安全委员会周报邮件', categoryId: 'other', dueDate: '2026-10-17', dueTime: '20:30', estimateDays: 0.25, done: false, reminder: '当天 · 18:00' },
  { id: 't8', weekKey: '2026-W43', title: '差距分析评审会', categoryId: 'appsec', dueDate: '2026-10-20', dueTime: '10:00', estimateDays: 0.25, done: false, objectiveId: 'o1', projectId: 'p1', reminder: '提前 1 天 · 09:30' },
  { id: 't9', weekKey: '2026-W43', title: 'SOC 降噪规则灰度', categoryId: 'secops', dueDate: '2026-10-22', estimateDays: 0.5, done: false, objectiveId: 'o2', projectId: 'p2' },
  { id: 't10', weekKey: '2026-W43', title: '红蓝演练方案定稿', categoryId: 'secops', dueDate: '2026-10-23', estimateDays: 0.5, done: false, objectiveId: 'o3', projectId: 'p3', reminder: '提前 2 天 · 09:30' },
  { id: 't11', weekKey: '2026-W43', title: 'AI 治理资产清单 v0.1', categoryId: 'appsec', dueDate: '2026-10-24', estimateDays: 0.75, done: false, objectiveId: 'o4', projectId: 'p4' },
  { id: 't12', weekKey: '2026-W44', title: '制度修订启动', categoryId: 'appsec', dueDate: '2026-10-28', estimateDays: 0.5, done: false, objectiveId: 'o1', projectId: 'p1' },
  { id: 't13', weekKey: '2026-W44', title: '等保差距分析报告评审', categoryId: 'appsec', dueDate: '2026-10-31', estimateDays: 0.5, done: false, objectiveId: 'o1', projectId: 'p1', reminder: '提前 2 天 · 09:30' },
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
    categoryId: 'standards',
    description: 'Web 应用安全风险基线，季度培训与代码审计引用。',
    letter: 'O',
  },
  {
    id: 'l2',
    title: '等保 2.0 标准与测评要求',
    url: 'https://www.tc260.org.cn/',
    domain: 'tc260.org.cn',
    categoryId: 'standards',
    description: 'GB/T 22239-2019 与测评要求，整改工作依据。',
    letter: '等',
  },
  {
    id: 'l3',
    title: 'MITRE ATT&CK',
    url: 'https://attack.mitre.org/',
    domain: 'attack.mitre.org',
    categoryId: 'tools',
    description: '红蓝对抗与检测规则映射，ATT&CK Navigator 常用。',
    letter: 'M',
  },
  {
    id: 'l4',
    title: 'NIST Cybersecurity Framework 2.0',
    url: 'https://www.nist.gov/cyberframework',
    domain: 'nist.gov',
    categoryId: 'standards',
    description: '安全治理框架参考，用于年度路线图对标。',
    letter: 'N',
  },
  {
    id: 'l5',
    title: '漏洞管理 SOP v3',
    url: 'https://wiki.internal.example/security/vuln-sop',
    domain: 'wiki.internal',
    categoryId: 'internal',
    description: '内部流程文档，扫描到修复的时限与升级路径。',
    letter: '漏',
    internal: true,
  },
  {
    id: 'l6',
    title: 'AI 安全治理参考清单',
    url: 'https://wiki.internal.example/security/ai-governance',
    domain: 'wiki.internal',
    categoryId: 'reading',
    description: '内部调研资料：资产清单模板、供应商评估问题集。',
    letter: 'A',
    internal: true,
  },
]

const MONTH_CAPACITY: Record<number, { allocated: number; completion: number }> = {
  10: { allocated: 16, completion: 42 },
  11: { allocated: 18, completion: 36 },
  12: { allocated: 14, completion: 28 },
}

export const MONTH_STATS = [10, 11, 12].map((month) => {
  const stats = computeMonthStats(2026, month)
  const extra = MONTH_CAPACITY[month]
  return {
    month: `${month} 月`,
    workdays: stats.workdays,
    leaveDays: stats.leaveDays,
    available: stats.available,
    allocated: extra.allocated,
    completion: extra.completion,
  }
})

const WEEK_PLANNED: Record<number, { planned: number; done: number }> = {
  40: { planned: 0, done: 0 },
  41: { planned: 0.75, done: 0.25 },
  42: { planned: 5.25, done: 1.25 },
  43: { planned: 4.25, done: 0 },
  44: { planned: 3, done: 0 },
  45: { planned: 1.75, done: 0 },
  46: { planned: 1, done: 0 },
  47: { planned: 1.75, done: 0 },
}

export const WEEK_STATS = ['2026-W40', '2026-W41', '2026-W42', '2026-W43', '2026-W44', '2026-W45', '2026-W46', '2026-W47'].map((key) => {
  const meta = WEEKS[key]
  const stats = computeWeekStats(meta.start, meta.end)
  const extra = WEEK_PLANNED[meta.num]
  return {
    week: `W${meta.num}`,
    workdays: stats.workdays,
    available: stats.available,
    planned: extra.planned,
    done: extra.done,
  }
})

/** Calendar notes exposed to UI badges. */
export const DAY_NOTES: Record<string, { kind: 'holiday' | 'makeup' | 'leave'; label: string }> =
  Object.fromEntries([
    ...Object.entries(CHINA_HOLIDAYS).map(([date, label]) => [date, { kind: 'holiday' as const, label }]),
    ...Object.entries(CHINA_MAKEUP_DAYS).map(([date, label]) => [date, { kind: 'makeup' as const, label }]),
    ...CALENDAR_ADJUSTMENTS.map((item) => [
      item.date,
      { kind: 'leave' as const, label: item.label ?? '请假' },
    ]),
  ])

export function dayInfo(dateISO: string): {
  kind: 'workday' | 'weekend' | 'holiday' | 'makeup' | 'leave'
  label?: string
  isWorkday: boolean
} {
  const day = calendarDay(dateISO)
  return { kind: day.kind, label: day.label, isWorkday: day.isWorkday }
}

export const WEEKDAY_CN = ['日', '一', '二', '三', '四', '五', '六']

/**
 * 原型统一补齐 24 小时制时刻：已有精确时间的内容保留，
 * 其余历史 mock 数据默认按 18:00 处理，避免日期-only 的提醒。
 */
const DEFAULT_DUE_TIME = '18:00'
Object.values(OBJECTIVES)
  .flat()
  .forEach((objective) => {
    objective.dueTime ??= DEFAULT_DUE_TIME
  })
INITIAL_TASKS.forEach((task) => {
  task.dueTime ??= DEFAULT_DUE_TIME
})
PROJECTS.forEach((project) => {
  project.endTime ??= DEFAULT_DUE_TIME
  project.milestones.forEach((milestone) => {
    milestone.targetTime ??= DEFAULT_DUE_TIME
  })
})


/** Recompute all derived capacity figures after calendar adjustments change. */
export function applyCalendarAdjustments(adjustments: CalendarAdjustment[]): void {
  setCalendarAdjustments(adjustments)
  for (const [key, entry] of Object.entries(QUARTER_STATS)) {
    const [yearText, quarterText] = key.split('-Q')
    const next = computeQuarterStats(Number(yearText), Number(quarterText))
    entry.workdays = next.workdays
    entry.leaveDays = next.leaveDays
    if (next.estimated) entry.estimated = true
    else delete entry.estimated
    if (next.note) entry.note = next.note
    else delete entry.note
  }
  for (const meta of Object.values(WEEKS)) {
    const next = computeWeekStats(meta.start, meta.end)
    meta.workdays = next.workdays
    meta.leaveDays = next.leaveDays
  }
  for (const row of MONTH_STATS) {
    const month = Number(row.month.replace(' 月', ''))
    const next = computeMonthStats(2026, month)
    row.workdays = next.workdays
    row.leaveDays = next.leaveDays
    row.available = next.available
  }
  for (const row of WEEK_STATS) {
    const meta = WEEKS[`2026-${row.week}`]
    if (!meta) continue
    const next = computeWeekStats(meta.start, meta.end)
    row.workdays = next.workdays
    row.available = next.available
  }
}
