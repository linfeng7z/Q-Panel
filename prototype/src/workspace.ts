import type {
  Category,
  LinkCategory,
  LinkItem,
  Note,
  Objective,
  Project,
  ReminderDefaults,
  SidebarLabels,
  ThemeId,
  ViewId,
  WeekTask,
} from './types'

export const WORKSPACE_SCHEMA_VERSION = 1

export interface WorkspaceSnapshot {
  schemaVersion: number
  savedAt?: string
  theme: ThemeId
  view: ViewId
  year: number
  quarter: number
  weekKey: string
  tasks: WeekTask[]
  objectives: Record<string, Objective[]>
  projects: Project[]
  notes: Note[]
  links: LinkItem[]
  linkCategories: LinkCategory[]
  categories: Category[]
  sidebarLabels: SidebarLabels
  aiModel: string
  reminderDefaults: ReminderDefaults
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function hasWorkspaceShape(value: unknown): value is Partial<WorkspaceSnapshot> {
  if (!isRecord(value)) return false
  return (
    Array.isArray(value.tasks) &&
    isRecord(value.objectives) &&
    Array.isArray(value.projects) &&
    Array.isArray(value.notes) &&
    Array.isArray(value.links)
  )
}
