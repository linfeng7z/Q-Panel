import {
  CALENDAR_ADJUSTMENTS,
  CHINA_HOLIDAYS,
  CHINA_MAKEUP_DAYS,
  calendarDay,
  generateWeeks,
  isoWeekKey,
  monthStats as computeMonthStats,
  quarterStats as computeQuarterStats,
  setCalendarAdjustments,
  weekStats as computeWeekStats,
} from '../calendar'
import type { CalendarAdjustment } from '../calendar'
import { APP_NOW, APP_TODAY, chinaQuarter, chinaYear } from '../clock'
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

/**
 * Real app clock. The web prototype and E2E tests can freeze it with
 * `?now=2026-10-17T19:22:00+08:00`.
 */
export const NOW = APP_NOW
export const TODAY = APP_TODAY
export const CURRENT_WEEK_KEY = isoWeekKey(TODAY)
export const CURRENT_YEAR = chinaYear(NOW)
export const CURRENT_QUARTER = chinaQuarter(NOW)
export const CURRENT_QUARTER_KEY = `${CURRENT_YEAR}-Q${CURRENT_QUARTER}`

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

// Prepared capacity for optional year management; only the current year is
// shown by default. Users add years explicitly from the year switcher.
export const YEARS = Array.from({ length: 11 }, (_, index) => CURRENT_YEAR + index)

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

export const OBJECTIVES: Record<string, Objective[]> = {}

export const PROJECTS: Project[] = []

export const WEEKS: Record<string, WeekMeta> = Object.fromEntries(
  generateWeeks(`${CURRENT_YEAR - 1}-01-01`, `${CURRENT_YEAR + 10}-12-31`).map((info) => [
    info.key,
    {
      key: info.key,
      num: info.num,
      start: info.start,
      end: info.end,
      range: info.range,
      workdays: 0,
      leaveDays: 0,
      ...(info.note ? { note: info.note } : {}),
    } satisfies WeekMeta,
  ]),
)

export const WEEK_ORDER = Object.keys(WEEKS)

export const INITIAL_TASKS: WeekTask[] = []

export const NOTES: Note[] = []

export const LINKS: LinkItem[] = []

export function dayInfo(dateISO: string): {
  kind: 'workday' | 'weekend' | 'holiday' | 'makeup' | 'leave'
  label?: string
  isWorkday: boolean
} {
  const day = calendarDay(dateISO)
  return { kind: day.kind, label: day.label, isWorkday: day.isWorkday }
}

export const WEEKDAY_CN = ['日', '一', '二', '三', '四', '五', '六']

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
}

applyCalendarAdjustments(CALENDAR_ADJUSTMENTS)
