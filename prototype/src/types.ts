export type ThemeId = 'noir' | 'ops'

export type ViewId =
  | 'today'
  | 'quarter'
  | 'week'
  | 'projects'
  | 'stats'
  | 'notes'
  | 'links'

export type CategoryId = 'appsec' | 'secops' | 'team' | 'other'

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
  plannedHours: number
  progress: number
  status: ObjectiveStatus
  dueDate: string
  projectId?: string
  reminder?: string
}

export type MilestoneStatus = 'done' | 'doing' | 'todo'

export interface Milestone {
  id: string
  title: string
  targetDate: string
  status: MilestoneStatus
}

export type WorkItemStatus = 'todo' | 'doing' | 'done'

export interface ProjectWorkItem {
  id: string
  title: string
  plannedHours: number
  weekKey: string
  status: WorkItemStatus
  milestoneId?: string
}

export interface Project {
  id: string
  title: string
  categoryId: CategoryId
  description: string
  span: string
  status: 'active' | 'done' | 'risk'
  /** 项目整体规划工时，可编辑 */
  plannedHours: number
  /** 拆解后的工作项，按安排周自动进入周计划 */
  workItems: ProjectWorkItem[]
  milestones: Milestone[]
  objectiveId?: string
}

export interface WeekTask {
  id: string
  weekKey: string
  title: string
  categoryId: CategoryId
  dueDate: string
  dueTime?: string
  estimateHours: number
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

export interface LinkItem {
  id: string
  title: string
  url: string
  domain: string
  categoryId: CategoryId
  description: string
  letter: string
  internal?: boolean
}

export interface QuarterStats {
  workdays: number
  leaveHours: number
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
  leaveHours: number
  note?: string
}

export type CreateMode = 'objective' | 'task' | 'project'

export interface AiProposalTask {
  title: string
  categoryId: CategoryId
  dueDate: string
  dueTime?: string
  estimateHours: number
  objectiveId?: string
  projectId?: string
}
