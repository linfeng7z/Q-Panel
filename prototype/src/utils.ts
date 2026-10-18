import type { Objective, Project, ProjectWorkItem, WeekTask } from './types'
import { NOW, TODAY, WEEKS } from './data/mock'

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
  return task.dueDate === TODAY
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

/** Projects already represented by a quarterly objective. Their work items are
 * execution detail, not extra capacity, so they must not be counted twice. */
export function linkedProjectIds(
  objectives: Objective[],
  projects: Project[],
): Set<string> {
  const objectiveIds = new Set(objectives.map((objective) => objective.id))
  const linked = new Set<string>()
  for (const objective of objectives) {
    if (objective.projectId) linked.add(objective.projectId)
  }
  for (const project of projects) {
    if (project.objectiveId && objectiveIds.has(project.objectiveId)) linked.add(project.id)
  }
  return linked
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
  const linked = linkedProjectIds(objectives, projects)
  const independentProjects = projects.filter((project) => !linked.has(project.id))
  const projectDays = projectsQuarterDays(independentProjects, year, quarter)
  const projectDoneDays = roundDays(
    independentProjects.reduce(
      (sum, project) => sum + projectQuarterDoneDays(project, year, quarter),
      0,
    ),
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

export function rangeDays(start?: string, end?: string): number {
  if (!start || !end) return 1
  const startAt = new Date(`${start}T12:00:00+08:00`).getTime()
  const endAt = new Date(`${end}T12:00:00+08:00`).getTime()
  if (Number.isNaN(startAt) || Number.isNaN(endAt)) return 1
  return Math.max(1, Math.round((endAt - startAt) / 86_400_000) + 1)
}

export function fmtRange(start?: string, end?: string): string {
  if (!start && !end) return '未设置'
  if (!start || start === end) return fmtDate(end ?? start ?? '')
  return `${fmtDate(start)} – ${fmtDate(end ?? start)}`
}

export function shiftDate(iso: string, amount: number): string {
  const date = new Date(`${iso}T12:00:00+08:00`)
  if (Number.isNaN(date.getTime())) return iso
  date.setDate(date.getDate() + amount)
  return date.toISOString().slice(0, 10)
}

export function parseReminder(value: string | undefined, defaults: { offsetDays: number; time: string }) {
  const text = value ?? ''
  const sameDay = text.match(/当天\s*·\s*(\d{1,2}):(\d{2})/)
  if (sameDay) return { offsetDays: 0, time: `${sameDay[1].padStart(2, '0')}:${sameDay[2].padStart(2, '0')}` }
  const match = text.match(/提前\s*(\d+)\s*(天|周)\s*·\s*(\d{1,2}):(\d{2})/)
  if (!match) return { offsetDays: defaults.offsetDays, time: defaults.time }
  return {
    offsetDays: Number(match[1]) * (match[2] === '周' ? 7 : 1),
    time: `${match[3].padStart(2, '0')}:${match[4].padStart(2, '0')}`,
  }
}

export interface ReminderValue {
  mode: 'absolute' | 'relative'
  date: string
  time: string
  offsetDays: number
}

/** Resolve a stored reminder rule to an actual calendar date for the picker. */
export function resolveReminder(
  value: string | undefined,
  endDate: string,
  defaults: { offsetDays: number; time: string },
): ReminderValue {
  const text = value ?? ''
  const absolute = text.match(/^(?:指定\s*)?(\d{4}-\d{2}-\d{2})\s*·\s*(\d{1,2}):(\d{2})/)
  if (absolute) {
    return {
      mode: 'absolute',
      date: absolute[1],
      time: `${absolute[2].padStart(2, '0')}:${absolute[3].padStart(2, '0')}`,
      offsetDays: defaults.offsetDays,
    }
  }
  const relative = parseReminder(value, defaults)
  return {
    mode: 'relative',
    date: shiftDate(endDate, -relative.offsetDays),
    time: relative.time,
    offsetDays: relative.offsetDays,
  }
}

export function formatReminderDate(date: string, time: string): string {
  return `${date} · ${time}`
}

export function formatReminder(offsetDays: number, time: string): string {
  const day = offsetDays === 0 ? '当天' : offsetDays === 7 ? '提前 1 周' : `提前 ${offsetDays} 天`
  return `${day} · ${time}`
}

export function fmtDateTime(iso: string, time?: string): string {
  return `${iso} ${time ?? '18:00'}`
}
