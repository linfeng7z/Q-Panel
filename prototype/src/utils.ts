import type { Objective, Project, WeekTask } from './types'
import { NOW } from './data/mock'

export function cn(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(' ')
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function parseDateTime(date: string, time?: string): Date {
  return new Date(`${date}T${time ?? '23:59'}:00+08:00`)
}

export function fmtDate(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${Number(m)}/${Number(d)}`
}

export function fmtDue(date: string, time?: string): string {
  return time ? `${fmtDate(date)} ${time}` : fmtDate(date)
}

export function isOverdue(task: WeekTask): boolean {
  return !task.done && parseDateTime(task.dueDate, task.dueTime).getTime() < NOW.getTime()
}

export function isToday(task: WeekTask): boolean {
  return task.dueDate === '2026-10-17'
}

export function projectProgress(project: Project): number {
  if (!project.milestones.length) return 0
  const done = project.milestones.filter((m) => m.status === 'done').length
  return Math.round((done / project.milestones.length) * 100)
}

export function projectDoneCount(project: Project): number {
  return project.milestones.filter((m) => m.status === 'done').length
}

export function projectNext(project: Project): Project['milestones'][number] | undefined {
  return project.milestones.find((m) => m.status !== 'done')
}

export function weightedCompletion(objectives: Objective[]): number {
  const hours = objectives.reduce((sum, o) => sum + o.plannedHours, 0)
  if (!hours) return 0
  return Math.round(objectives.reduce((sum, o) => sum + o.plannedHours * (o.progress / 100), 0) / hours * 100)
}

export function sumHours(objectives: Objective[]): number {
  return objectives.reduce((sum, o) => sum + o.plannedHours, 0)
}

export function hoursOf(tasks: WeekTask[]): number {
  return tasks.reduce((sum, t) => sum + t.estimateHours, 0)
}

export function doneHoursOf(tasks: WeekTask[]): number {
  return tasks.filter((t) => t.done).reduce((sum, t) => sum + t.estimateHours, 0)
}

export function monthGrid(year: number, month: number): Array<number | null> {
  const first = new Date(`${year}-${String(month).padStart(2, '0')}-01T12:00:00+08:00`)
  const offset = (first.getDay() + 6) % 7
  const days = new Date(year, month, 0).getDate()
  const cells: Array<number | null> = Array.from({ length: offset }, () => null)
  for (let d = 1; d <= days; d += 1) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function dateISO(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function timeGreeting(): string {
  const hour = NOW.getHours()
  if (hour < 6) return '夜深了'
  if (hour < 11) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export function untilQuarterEnd(): number {
  const end = new Date('2026-12-31T23:59:59+08:00')
  return Math.ceil((end.getTime() - NOW.getTime()) / 86400000)
}

export function pct(n: number): string {
  return `${Math.round(n)}%`
}
