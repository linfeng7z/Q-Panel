export type ThemeId = 'noir' | 'ops' | 'aurora' | 'ember'

export type ViewId =
  | 'quarter'
  | 'week'
  | 'projects'
  | 'notes'
  | 'links'

export type CategoryId = string

export interface ReminderDefaults {
  /** 0 = 当天，1 = 提前 1 天，7 = 提前 1 周 */
  offsetDays: number
  /** 24 小时制 HH:mm */
  time: string
}

export interface Category {
  id: CategoryId
  name: string
  /** CSS custom property that resolves to the theme-specific hue. */
  colorVar: string
}

export type ObjectiveStatus = 'planned' | 'in_progress' | 'risk' | 'done'

export interface Objective {
  id: string
  title: string
  categoryId: CategoryId
  plannedDays: number
  progress: number
  /** 开展时间段，按自然日；旧数据缺省时回退到 dueDate */
  startDate?: string
  endDate?: string
  status: ObjectiveStatus
  dueDate: string
  /** 截止时刻，24 小时制 HH:mm；提醒与系统通知按此时间计算 */
  dueTime?: string
  projectId?: string
  reminder?: string
}

export type MilestoneStatus = 'done' | 'doing' | 'todo'

export interface Milestone {
  id: string
  title: string
  targetDate: string
  /** 里程碑开展时间段，按自然日 */
  startDate?: string
  endDate?: string
  /** 目标时刻，24 小时制 HH:mm */
  targetTime?: string
  status: MilestoneStatus
}

export type WorkItemStatus = 'todo' | 'doing' | 'done'

export interface ProjectWorkItem {
  id: string
  title: string
  plannedDays: number
  weekKey: string
  /** 工作项开展时间段，按自然日 */
  startDate?: string
  endDate?: string
  status: WorkItemStatus
  milestoneId?: string
  /** 用户从某周手动移除后，不再自动同步到这些周；其他变化仍自动同步。 */
  skippedWeeks?: string[]
}

export interface Project {
  id: string
  title: string
  categoryId: CategoryId
  description: string
  span: string
  /** 全局项目起止日期，用于判断是否跨当前季度 */
  startDate: string
  endDate: string
  /** 项目计划结束时刻，24 小时制 HH:mm */
  endTime?: string
  status: 'active' | 'done' | 'risk'
  /** 项目全局规划人日，可编辑 */
  plannedDays: number
  /** 拆解后的工作项，按安排周自动进入本周安排 */
  workItems: ProjectWorkItem[]
  milestones: Milestone[]
  objectiveId?: string
  reminder?: string
}

export interface WeekTask {
  id: string
  weekKey: string
  title: string
  categoryId: CategoryId
  dueDate: string
  dueTime?: string
  /** 开展时间段，按自然日；结束日即截止日 */
  startDate?: string
  endDate?: string
  estimateDays: number
  done: boolean
  objectiveId?: string
  projectId?: string
  milestoneId?: string
  reminder?: string
}

export interface Note {
  id: string
  title: string
  content: string
  updatedAt: string
  pinned?: boolean
}

export type LinkCategoryId = string

export interface LinkCategory {
  id: LinkCategoryId
  name: string
  colorVar: string
}

export interface LinkItem {
  id: string
  title: string
  url: string
  domain: string
  categoryId: LinkCategoryId
  description: string
  letter: string
  internal?: boolean
}

export interface QuarterStats {
  workdays: number
  leaveDays: number
  estimated?: boolean
  note?: string
  missing?: boolean
}

export interface WeekMeta {
  key: string
  num: number
  start: string
  end: string
  range: string
  workdays: number
  leaveDays: number
  note?: string
}

export type CreateMode = 'objective' | 'task' | 'project'

export interface UserPreferences {
  autoLaunch: boolean
  nativeNotifications: boolean
  reminderPopup: boolean
  dndEnabled: boolean
  dndStart: string
  dndEnd: string
  defaultView: ViewId
  bufferPercent: number
  confirmAiWrites: boolean
  aiScope: 'minimal' | 'summary' | 'all'
  backupDays: number
  blurStrength: number
  globalShortcut: string
  yearOptions: number[]
}

export interface AiConfigPublic {
  baseUrl: string
  model: string
  hasKey: boolean
}

export interface AiGenerateResult {
  ok: boolean
  message?: string
  tasks?: AiProposalTask[]
  error?: string
}

export interface AiProposalTask {
  title: string
  categoryId: CategoryId
  dueDate: string
  dueTime?: string
  estimateDays: number
  objectiveId?: string
  projectId?: string
}

export type SidebarGroupKey = 'plan' | 'archive'

export type SidebarLabels = Record<SidebarGroupKey, string>
