/**
 * China workday calendar.
 *
 * Dates are always handled as `YYYY-MM-DD` in China Standard Time. The engine
 * is intentionally framework-free so it can be exercised with node:test.
 */

export type CalendarDayKind = 'workday' | 'weekend' | 'holiday' | 'makeup' | 'leave'

export interface CalendarDay {
  date: string
  kind: CalendarDayKind
  label?: string
  isWorkday: boolean
}

export interface CalendarAdjustment {
  /** ISO date in Asia/Shanghai. */
  date: string
  kind: 'leave'
  days: number
  label?: string
}

export interface CalendarPeriodStats {
  workdays: number
  leaveDays: number
  available: number
}

export interface CalendarWeekStats {
  workdays: number
  leaveDays: number
  available: number
}

/** Official national holiday closures, keyed by ISO date. */
export const CHINA_HOLIDAYS: Record<string, string> = {
  // 2024
  '2024-01-01': '元旦',
  '2024-02-10': '春节',
  '2024-02-11': '春节',
  '2024-02-12': '春节',
  '2024-02-13': '春节',
  '2024-02-14': '春节',
  '2024-02-15': '春节',
  '2024-02-16': '春节',
  '2024-02-17': '春节',
  '2024-04-04': '清明',
  '2024-04-05': '清明',
  '2024-04-06': '清明',
  '2024-05-01': '劳动节',
  '2024-05-02': '劳动节',
  '2024-05-03': '劳动节',
  '2024-05-04': '劳动节',
  '2024-05-05': '劳动节',
  '2024-06-08': '端午',
  '2024-06-09': '端午',
  '2024-06-10': '端午',
  '2024-09-15': '中秋',
  '2024-09-16': '中秋',
  '2024-09-17': '中秋',
  '2024-10-01': '国庆',
  '2024-10-02': '国庆',
  '2024-10-03': '国庆',
  '2024-10-04': '国庆',
  '2024-10-05': '国庆',
  '2024-10-06': '国庆',
  '2024-10-07': '国庆',
  // 2025
  '2025-01-01': '元旦',
  '2025-01-28': '春节',
  '2025-01-29': '春节',
  '2025-01-30': '春节',
  '2025-01-31': '春节',
  '2025-02-01': '春节',
  '2025-02-02': '春节',
  '2025-02-03': '春节',
  '2025-02-04': '春节',
  '2025-04-04': '清明',
  '2025-04-05': '清明',
  '2025-04-06': '清明',
  '2025-05-01': '劳动节',
  '2025-05-02': '劳动节',
  '2025-05-03': '劳动节',
  '2025-05-04': '劳动节',
  '2025-05-05': '劳动节',
  '2025-05-31': '端午',
  '2025-06-01': '端午',
  '2025-06-02': '端午',
  '2025-10-01': '国庆',
  '2025-10-02': '国庆',
  '2025-10-03': '国庆',
  '2025-10-04': '国庆',
  '2025-10-05': '国庆',
  '2025-10-06': '国庆',
  '2025-10-07': '国庆',
  '2025-10-08': '国庆',
  // 2026 — Q4 follows the schedule referenced by the prototype; earlier
  // holidays follow the same official-calendar model and can be edited later.
  '2026-01-01': '元旦',
  '2026-01-02': '元旦',
  '2026-01-03': '元旦',
  '2026-02-15': '春节',
  '2026-02-16': '春节',
  '2026-02-17': '春节',
  '2026-02-18': '春节',
  '2026-02-19': '春节',
  '2026-02-20': '春节',
  '2026-02-21': '春节',
  '2026-04-04': '清明',
  '2026-04-05': '清明',
  '2026-04-06': '清明',
  '2026-05-01': '劳动节',
  '2026-05-02': '劳动节',
  '2026-05-03': '劳动节',
  '2026-05-04': '劳动节',
  '2026-05-05': '劳动节',
  '2026-06-19': '端午',
  '2026-06-20': '端午',
  '2026-06-21': '端午',
  '2026-09-25': '中秋',
  '2026-09-26': '中秋',
  '2026-09-27': '中秋',
  '2026-10-01': '国庆',
  '2026-10-02': '国庆',
  '2026-10-03': '国庆',
  '2026-10-04': '国庆',
  '2026-10-05': '国庆',
  '2026-10-06': '国庆',
  '2026-10-07': '国庆',
}

/** Official makeup workdays (weekends that become workdays). */
export const CHINA_MAKEUP_DAYS: Record<string, string> = {
  '2024-02-04': '春节调休',
  '2024-02-18': '春节调休',
  '2024-04-07': '清明调休',
  '2024-04-28': '劳动节调休',
  '2024-05-11': '劳动节调休',
  '2024-09-14': '中秋调休',
  '2024-09-29': '国庆调休',
  '2024-10-12': '国庆调休',
  '2025-01-26': '春节调休',
  '2025-02-08': '春节调休',
  '2025-04-27': '劳动节调休',
  '2025-09-28': '国庆调休',
  '2025-10-11': '国庆调休',
  '2026-02-14': '春节调休',
  '2026-02-28': '春节调休',
  '2026-05-09': '劳动节调休',
  '2026-10-10': '国庆调休',
}

/** Personal leave / capacity adjustments. */
export const CALENDAR_ADJUSTMENTS: CalendarAdjustment[] = []

let adjustmentMap = new Map(CALENDAR_ADJUSTMENTS.map((item) => [item.date, item]))

export function setCalendarAdjustments(adjustments: CalendarAdjustment[]): void {
  adjustmentMap = new Map(
    (Array.isArray(adjustments) ? adjustments : [])
      .filter((item) => item && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && item.days > 0)
      .map((item) => [item.date, item]),
  )
}

export function getCalendarAdjustments(): CalendarAdjustment[] {
  return [...adjustmentMap.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function isoFromUtc(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function utcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`)
}

function addUtcDays(iso: string, days: number): string {
  const date = utcDate(iso)
  date.setUTCDate(date.getUTCDate() + days)
  return isoFromUtc(date)
}

function weekdayUtc(iso: string): number {
  return utcDate(iso).getUTCDay()
}

function baseWorkday(dateISO: string): boolean {
  if (CHINA_HOLIDAYS[dateISO]) return false
  if (CHINA_MAKEUP_DAYS[dateISO]) return true
  const weekday = weekdayUtc(dateISO)
  return weekday !== 0 && weekday !== 6
}

export function calendarDay(dateISO: string): CalendarDay {
  const adjustment = adjustmentMap.get(dateISO)
  if (adjustment) {
    return { date: dateISO, kind: 'leave', label: adjustment.label, isWorkday: false }
  }
  if (CHINA_HOLIDAYS[dateISO]) {
    return { date: dateISO, kind: 'holiday', label: CHINA_HOLIDAYS[dateISO], isWorkday: false }
  }
  if (CHINA_MAKEUP_DAYS[dateISO]) {
    return { date: dateISO, kind: 'makeup', label: CHINA_MAKEUP_DAYS[dateISO], isWorkday: true }
  }
  const weekday = weekdayUtc(dateISO)
  if (weekday === 0 || weekday === 6) {
    return { date: dateISO, kind: 'weekend', isWorkday: false }
  }
  return { date: dateISO, kind: 'workday', isWorkday: true }
}

export function eachDate(startISO: string, endISO: string): string[] {
  const dates: string[] = []
  if (startISO > endISO) return dates
  let current = startISO
  while (current <= endISO) {
    dates.push(current)
    current = addUtcDays(current, 1)
  }
  return dates
}

export function periodStats(startISO: string, endISO: string): CalendarPeriodStats {
  let workdays = 0
  let leaveDays = 0
  for (const date of eachDate(startISO, endISO)) {
    const info = calendarDay(date)
    if (info.kind === 'leave') {
      // Workdays stay the gross workday count; leave reduces available days.
      if (baseWorkday(date)) {
        workdays += 1
        leaveDays += adjustmentMap.get(date)?.days ?? 1
      }
    } else if (info.isWorkday) {
      workdays += 1
    }
  }
  return { workdays, leaveDays, available: workdays - leaveDays }
}

export function quarterRangeISO(year: number, quarter: number): { start: string; end: string } {
  const startMonth = quarter * 3 - 2
  const endMonth = quarter * 3
  const endDay = [0, 31, 30, 31, 31][quarter]
  return {
    start: `${year}-${String(startMonth).padStart(2, '0')}-01`,
    end: `${year}-${String(endMonth).padStart(2, '0')}-${endDay}`,
  }
}

export function quarterStats(year: number, quarter: number): CalendarPeriodStats & {
  estimated?: boolean
  note?: string
} {
  const range = quarterRangeISO(year, quarter)
  const stats = periodStats(range.start, range.end)
  if (year >= 2027) {
    return {
      ...stats,
      estimated: true,
      note: `${year} 年官方放假安排尚未发布，当前按周末规则估算；发布后可一键更新。`,
    }
  }
  return stats
}

export function monthStats(year: number, month: number): CalendarPeriodStats {
  const endDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return periodStats(`${year}-${String(month).padStart(2, '0')}-01`, `${year}-${String(month).padStart(2, '0')}-${endDay}`)
}

export function weekStats(startISO: string, endISO: string): CalendarWeekStats {
  const stats = periodStats(startISO, endISO)
  return { workdays: stats.workdays, leaveDays: stats.leaveDays, available: stats.available }
}


function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export interface IsoWeekInfo {
  key: string
  num: number
  start: string
  end: string
  range: string
  note?: string
}

export function isoWeekKey(dateISO: string): string {
  return isoWeekInfo(dateISO).key
}

export function isoWeekInfo(dateISO: string): IsoWeekInfo {
  const date = utcDate(dateISO)
  const day = (date.getUTCDay() + 6) % 7
  const monday = new Date(date)
  monday.setUTCDate(date.getUTCDate() - day)
  const thursday = new Date(monday)
  thursday.setUTCDate(monday.getUTCDate() + 3)
  const weekYear = thursday.getUTCFullYear()
  const jan4 = new Date(Date.UTC(weekYear, 0, 4))
  const jan4Day = (jan4.getUTCDay() + 6) % 7
  const firstMonday = new Date(jan4)
  firstMonday.setUTCDate(jan4.getUTCDate() - jan4Day)
  const num = Math.round((monday.getTime() - firstMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  const start = isoFromUtc(monday)
  const end = isoFromUtc(sunday)
  return {
    key: `${weekYear}-W${pad2(num)}`,
    num,
    start,
    end,
    range: `${start.slice(5, 7)}/${start.slice(8, 10)} – ${end.slice(5, 7)}/${end.slice(8, 10)}`,
  }
}

export function generateWeeks(startISO: string, endISO: string): IsoWeekInfo[] {
  const weeks: IsoWeekInfo[] = []
  let current = isoWeekInfo(startISO).start
  while (current <= endISO) {
    const info = isoWeekInfo(current)
    if (info.end < startISO) {
      current = addUtcDays(info.end, 1)
      continue
    }
    const infoStart = utcDate(info.start)
    const infoEnd = utcDate(info.end)
    const startMonth = infoStart.getUTCMonth() + 1
    const endMonth = infoEnd.getUTCMonth() + 1
    const startYear = infoStart.getUTCFullYear()
    const endYear = infoEnd.getUTCFullYear()
    if (startYear !== endYear) info.note = '跨年周'
    else if (Math.floor((startMonth - 1) / 3) !== Math.floor((endMonth - 1) / 3)) info.note = '跨季度'
    weeks.push(info)
    current = addUtcDays(info.end, 1)
  }
  return weeks
}
