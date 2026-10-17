import type { Objective, Project, ProjectWorkItem, WeekTask } from './types'
import { NOW, WEEKS } from './data/mock'

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

export interface ProjectWeekItem extends ProjectWorkItem {
  project: Project
}

export function projectDecomposedDays(project: Project): number {
  return project.workItems.reduce((sum, item) => sum + item.plannedDays, 0)
}

export function projectScheduledDays(project: Project): number {
  return project.workItems
    .filter((item) => Boolean(item.weekKey))
    .reduce((sum, item) => sum + item.plannedDays, 0)
}

export function projectWorkItemsForWeek(projects: Project[], weekKey: string): ProjectWeekItem[] {
  return projects.flatMap((project) =>
    project.workItems
      .filter((item) => item.weekKey === weekKey)
      .map((item) => ({ ...item, project })),
  )
}

export function projectWorkItemDays(items: ProjectWeekItem[]): number {
  return items.reduce((sum, item) => sum + item.plannedDays, 0)
}

export function weightedCompletion(objectives: Objective[]): number {
  const days = objectives.reduce((sum, o) => sum + o.plannedDays, 0)
  if (!days) return 0
  return Math.round(objectives.reduce((sum, o) => sum + o.plannedDays * (o.progress / 100), 0) / days * 100)
}

export function roundDays(value: number): number {
  return Math.round(value * 100) / 100
}

export function fmtDays(value: number): string {
  return String(roundDays(value))
}

export function sumDays(objectives: Objective[]): number {
  return objectives.reduce((sum, o) => sum + o.plannedDays, 0)
}

export function daysOf(tasks: WeekTask[]): number {
  return tasks.reduce((sum, t) => sum + t.estimateDays, 0)
}

export function doneDaysOf(tasks: WeekTask[]): number {
  return tasks.filter((t) => t.done).reduce((sum, t) => sum + t.estimateDays, 0)
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


export function quarterStartISO(year: number, quarter: number): string {
  const month = quarter * 3 - 2
  return `${year}-${String(month).padStart(2, '0')}-01`
}

export function quarterEndISO(year: number, quarter: number): string {
  const month = quarter * 3
  const day = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function projectWorkItemsInQuarter(
  project: Project,
  year: number,
  quarter: number,
): ProjectWorkItem[] {
  const start = quarterStartISO(year, quarter)
  const end = quarterEndISO(year, quarter)
  return project.workItems.filter((item) => {
    const week = WEEKS[item.weekKey]
    return Boolean(week && week.end >= start && week.end <= end)
  })
}

export function projectQuarterDays(project: Project, year: number, quarter: number): number {
  return roundDays(
    projectWorkItemsInQuarter(project, year, quarter).reduce((sum, item) => sum + item.plannedDays, 0),
  )
}

export function projectQuarterDoneDays(project: Project, year: number, quarter: number): number {
  return roundDays(
    projectWorkItemsInQuarter(project, year, quarter)
      .filter((item) => item.status === 'done')
      .reduce((sum, item) => sum + item.plannedDays, 0),
  )
}

export function projectsQuarterDays(projects: Project[], year: number, quarter: number): number {
  return roundDays(projects.reduce((sum, project) => sum + projectQuarterDays(project, year, quarter), 0))
}

export function projectCrossQuarter(project: Project, year: number, quarter: number): boolean {
  return project.endDate > quarterEndISO(year, quarter)
}

export interface QuarterLoad {
  taskDays: number
  projectDays: number
  committedDays: number
  taskDoneDays: number
  projectDoneDays: number
  doneDays: number
  availableDays: number
  remainingDays: number
  completion: number
}

export function quarterLoad(
  objectives: Objective[],
  projects: Project[],
  year: number,
  quarter: number,
  availableDays: number,
): QuarterLoad {
  const taskDays = roundDays(sumDays(objectives))
  const taskDoneDays = roundDays(
    objectives.reduce((sum, objective) => sum + objective.plannedDays * (objective.progress / 100), 0),
  )
  const projectDays = projectsQuarterDays(projects, year, quarter)
  const projectDoneDays = roundDays(
    projects.reduce((sum, project) => sum + projectQuarterDoneDays(project, year, quarter), 0),
  )
  const committedDays = roundDays(taskDays + projectDays)
  const doneDays = roundDays(taskDoneDays + projectDoneDays)
  return {
    taskDays,
    projectDays,
    committedDays,
    taskDoneDays,
    projectDoneDays,
    doneDays,
    availableDays: roundDays(availableDays),
    remainingDays: roundDays(availableDays - committedDays),
    completion: committedDays > 0 ? Math.round((doneDays / committedDays) * 100) : 0,
  }
}

export function formatReminder(offsetDays: number, time: string): string {
  const day = offsetDays === 0 ? '当天' : offsetDays === 7 ? '提前 1 周' : `提前 ${offsetDays} 天`
  return `${day} · ${time}`
}

export function fmtDateTime(iso: string, time?: string): string {
  return `${iso} ${time ?? '18:00'}`
}
