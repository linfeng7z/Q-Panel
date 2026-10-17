import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type {
  AiProposalTask,
  CategoryId,
  CreateMode,
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
import {
  INITIAL_TASKS,
  LINK_CATEGORIES,
  LINKS,
  NOTES,
  OBJECTIVES,
  PROJECTS,
  TODAY,
  WEEKS,
  CATEGORIES,
  addCategory,
  applyCalendarAdjustments,
  getCategory,
  quarterKey,
  replaceCategories,
} from './data/mock'
import { cn, dateISO, daysOf, formatReminder, isOverdue, projectWorkItemDays, projectWorkItemsForWeek } from './utils'
import { MenuBar } from './components/MenuBar'
import { TopBar } from './components/TopBar'
import { Sidebar } from './components/Sidebar'
import { CommandPalette } from './components/CommandPalette'
import { AIDrawer } from './components/AIDrawer'
import { SettingsModal } from './components/SettingsModal'
import type { SettingsTab } from './components/SettingsModal'
import { CreateModal } from './components/CreateModal'
import { ReminderPopup } from './components/ReminderPopup'
import { Toast } from './components/Toast'
import type { WorkspaceSnapshot } from './workspace'
import type { CalendarAdjustment } from './calendar'
import { CALENDAR_ADJUSTMENTS } from './calendar'
import { hasWorkspaceShape, isRecord, WORKSPACE_SCHEMA_VERSION } from './workspace'
import { Logo } from './components/Logo'
import { QuarterView } from './views/QuarterView'
import { WeekView } from './views/WeekView'
import { ProjectsView } from './views/ProjectsView'
import { StatsView } from './views/StatsView'
import { NotesView } from './views/NotesView'
import { LinksView } from './views/LinksView'

const VIEWS: ViewId[] = ['quarter', 'week', 'projects', 'stats', 'notes', 'links']
const THEMES: ThemeId[] = ['noir', 'ops', 'aurora', 'ember']
const DEFAULT_SIDEBAR_LABELS: SidebarLabels = { plan: '规划与推进', archive: '其它' }

function firstWeekKeyForQuarter(year: number, quarter: number): string | undefined {
  return Object.keys(WEEKS).find((key) => {
    const end = WEEKS[key].end
    const endYear = Number(end.slice(0, 4))
    const endMonth = Number(end.slice(5, 7))
    return endYear === year && Math.floor((endMonth - 1) / 3) + 1 === quarter
  })
}

function weekKeyForDate(date: string): string {
  const found = Object.values(WEEKS).find((week) => date >= week.start && date <= week.end)
  return found?.key ?? '2026-W42'
}

function quarterEndDate(year: number, quarter: number): string {
  const month = quarter * 3
  const day = new Date(year, month, 0).getDate()
  return dateISO(year, month, day)
}

function parseInitialView(): ViewId {
  const value = new URLSearchParams(window.location.search).get('view') as ViewId | null
  return value && VIEWS.includes(value) ? value : 'quarter'
}

function parseInitialTheme(): ThemeId {
  const value = new URLSearchParams(window.location.search).get('theme') as ThemeId | null
  return value && THEMES.includes(value) ? value : 'noir'
}

export default function App() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const electronMode = Boolean(window.qpanel?.isElectron)
  const notchMode = params.get('notch') === '1'
  const [theme, setTheme] = useState<ThemeId>(parseInitialTheme)
  const [view, setView] = useState<ViewId>(parseInitialView)
  const [expanded, setExpanded] = useState(
    electronMode ? !notchMode : params.get('collapsed') !== '1',
  )
  const [hydrated, setHydrated] = useState(!electronMode)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveSequence, setSaveSequence] = useState(0)
  const [year, setYear] = useState(2026)
  const [quarter, setQuarter] = useState(4)
  const [weekKey, setWeekKey] = useState('2026-W42')
  const [tasks, setTasks] = useState<WeekTask[]>(INITIAL_TASKS)
  const [objectives, setObjectives] = useState<Record<string, Objective[]>>(OBJECTIVES)
  const [projects, setProjects] = useState<Project[]>(PROJECTS)
  const [notes, setNotes] = useState<Note[]>(NOTES)
  const [links, setLinks] = useState<LinkItem[]>(LINKS)
  const [linkCategories, setLinkCategories] = useState<LinkCategory[]>(LINK_CATEGORIES)
  const [filter, setFilter] = useState<CategoryId | 'all'>('all')
  const [sidebarLabels, setSidebarLabels] = useState<SidebarLabels>(DEFAULT_SIDEBAR_LABELS)
  const [aiModel, setAiModel] = useState('deepseek-chat')
  const [reminderDefaults, setReminderDefaults] = useState<ReminderDefaults>({ offsetDays: 2, time: '09:30' })
  const [calendarAdjustments, setCalendarAdjustments] = useState<CalendarAdjustment[]>(CALENDAR_ADJUSTMENTS)
  const viewTransitionRef = useRef<{ finished: Promise<void> } | null>(null)

  useEffect(() => {
    const root = document.querySelector('.qp-root') as HTMLElement | null
    if (!root) return
    let frame = 0
    const onPointerMove = (event: PointerEvent) => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        const panel = root.querySelector('.panel') as HTMLElement | null
        const rect = panel?.getBoundingClientRect()
        root.style.setProperty('--pointer-x', `${event.clientX - (rect?.left ?? 0)}px`)
        root.style.setProperty('--pointer-y', `${event.clientY - (rect?.top ?? 0)}px`)
        frame = 0
      })
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  const categoryUsage = useMemo(() => {
    const usage: Record<string, number> = {}
    const count = (categoryId: CategoryId) => {
      usage[categoryId] = (usage[categoryId] ?? 0) + 1
    }
    tasks.forEach((task) => count(task.categoryId))
    Object.values(objectives)
      .flat()
      .forEach((objective) => count(objective.categoryId))
    projects.forEach((project) => count(project.categoryId))
    return usage
  }, [tasks, objectives, projects])
  const [commandOpen, setCommandOpen] = useState(params.get('cmd') === '1')
  const [aiOpen, setAiOpen] = useState(params.get('ai') === '1')
  const [settingsOpen, setSettingsOpen] = useState(params.get('settings') === '1')
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>('general')
  const [categoryVersion, setCategoryVersion] = useState(0)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [nativeReminder, setNativeReminder] = useState<QPanelReminderEntry | null>(null)
  const [createMode, setCreateMode] = useState<CreateMode | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const scrollRef = useRef<HTMLDivElement>(null)

  const sideWeekKey = view === 'week' ? weekKey : '2026-W42'
  const sideWeekMeta = WEEKS[sideWeekKey] ?? WEEKS['2026-W42']
  const sideWeekTasks = tasks.filter((task) => task.weekKey === sideWeekKey)
  const sideWeekProjectItems = projectWorkItemsForWeek(projects, sideWeekKey)
  const weekAvailable = sideWeekMeta.workdays - sideWeekMeta.leaveDays
  const weekPlanned = daysOf(sideWeekTasks) + projectWorkItemDays(sideWeekProjectItems)
  const weekCount =
    sideWeekTasks.filter((task) => !task.done).length +
    sideWeekProjectItems.filter((item) => item.status !== 'done').length
  const bellCount = tasks.filter(
    (task) => !task.done && (task.dueDate === TODAY || isOverdue(task)),
  ).length
  const periodObjectives = objectives[quarterKey(year, quarter)] ?? []
  const reminderObjective = (objectives['2026-Q4'] ?? []).find((objective) => objective.id === 'o1')

  const changeWeek = (key: string) => {
    setWeekKey(key)
    const meta = WEEKS[key]
    if (!meta) return
    const endMonth = Number(meta.end.slice(5, 7))
    setYear(Number(meta.end.slice(0, 4)))
    setQuarter(Math.floor((endMonth - 1) / 3) + 1)
  }

  const showToast = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3000)
  }, [])

  const applyWorkspace = useCallback((value: unknown) => {
    if (!hasWorkspaceShape(value)) return false
    const data = value as Partial<WorkspaceSnapshot>
    if (data.theme && THEMES.includes(data.theme)) setTheme(data.theme)
    if (data.view && VIEWS.includes(data.view)) setView(data.view)
    if (typeof data.year === 'number') setYear(data.year)
    if (typeof data.quarter === 'number' && data.quarter >= 1 && data.quarter <= 4) {
      setQuarter(data.quarter)
    }
    if (typeof data.weekKey === 'string' && WEEKS[data.weekKey]) setWeekKey(data.weekKey)
    if (Array.isArray(data.tasks)) setTasks(data.tasks)
    if (isRecord(data.objectives)) setObjectives(data.objectives as Record<string, Objective[]>)
    if (Array.isArray(data.projects)) setProjects(data.projects)
    if (Array.isArray(data.notes)) setNotes(data.notes)
    if (Array.isArray(data.links)) setLinks(data.links)
    if (Array.isArray(data.linkCategories) && data.linkCategories.length > 0) {
      setLinkCategories(data.linkCategories)
    }
    if (Array.isArray(data.categories) && data.categories.length > 0) {
      replaceCategories(data.categories)
      setCategoryVersion((value) => value + 1)
    }
    if (isRecord(data.sidebarLabels)) {
      setSidebarLabels({ ...DEFAULT_SIDEBAR_LABELS, ...data.sidebarLabels })
    }
    if (typeof data.aiModel === 'string') setAiModel(data.aiModel)
    if (
      isRecord(data.reminderDefaults) &&
      typeof data.reminderDefaults.offsetDays === 'number' &&
      typeof data.reminderDefaults.time === 'string'
    ) {
      setReminderDefaults({
        offsetDays: data.reminderDefaults.offsetDays,
        time: data.reminderDefaults.time,
      })
    }
    if (Array.isArray(data.calendarAdjustments)) {
      const adjustments = data.calendarAdjustments.filter(
        (item): item is CalendarAdjustment =>
          isRecord(item) &&
          typeof item.date === 'string' &&
          item.kind === 'leave' &&
          typeof item.days === 'number',
      )
      setCalendarAdjustments(adjustments)
      applyCalendarAdjustments(adjustments)
    }
    return true
  }, [])

  useEffect(() => {
    if (!electronMode) return
    let cancelled = false
    const load = async () => {
      try {
        const result = await window.qpanel?.workspace.load()
        if (cancelled) return
        if (!result?.ok) {
          showToast(result?.error === 'invalid_workspace' ? '工作区文件损坏，已载入示例数据' : '工作区读取失败，使用示例数据')
        } else if (result.data) {
          if (!applyWorkspace(result.data)) {
            showToast('工作区格式不兼容，已载入示例数据')
          }
        }
      } catch {
        if (!cancelled) showToast('工作区读取失败，使用示例数据')
      } finally {
        if (!cancelled) setHydrated(true)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [applyWorkspace, electronMode, showToast])

  useEffect(() => {
    if (!electronMode || !notchMode) return
    const unsubscribe = window.qpanel?.notch.onWorkspaceSaved(() => {
      void window.qpanel?.workspace.load().then((result) => {
        if (result?.ok && result.data) applyWorkspace(result.data)
      })
    })
    return unsubscribe
  }, [applyWorkspace, electronMode, notchMode])

  useEffect(() => {
    if (!electronMode || notchMode) return
    return window.qpanel?.reminders.onDue((entry) => setNativeReminder(entry))
  }, [electronMode, notchMode])

  useEffect(() => {
    if (!electronMode || notchMode || !hydrated) return
    const timer = window.setTimeout(async () => {
      setSaveState('saving')
      const snapshot: WorkspaceSnapshot = {
        schemaVersion: WORKSPACE_SCHEMA_VERSION,
        savedAt: new Date().toISOString(),
        theme,
        view,
        year,
        quarter,
        weekKey,
        tasks,
        objectives,
        projects,
        notes,
        links,
        linkCategories,
        categories: CATEGORIES.map((category) => ({ ...category })),
        sidebarLabels,
        aiModel,
        reminderDefaults,
        calendarAdjustments,
      }
      try {
        const result = await window.qpanel?.workspace.save(snapshot)
        setSaveState(result?.ok ? 'saved' : 'error')
        if (result?.ok) setSaveSequence((value) => value + 1)
        if (result && !result.ok) showToast('工作区保存失败')
      } catch {
        setSaveState('error')
        showToast('工作区保存失败')
      }
    }, 320)
    return () => window.clearTimeout(timer)
  }, [
    aiModel,
    calendarAdjustments,
    categoryVersion,
    electronMode,
    hydrated,
    linkCategories,
    links,
    notchMode,
    notes,
    objectives,
    projects,
    quarter,
    reminderDefaults,
    showToast,
    sidebarLabels,
    tasks,
    theme,
    view,
    weekKey,
    year,
  ])

  const openSettings = (tab: SettingsTab = 'general') => {
    setSettingsInitialTab(tab)
    setSettingsOpen(true)
  }

  const handleAddCategory = (name: string, colorVar: string) => {
    const category = addCategory(name, colorVar)
    setCategoryVersion((value) => value + 1)
    showToast(`已新增分类「${name}」`)
    return category
  }

  const manageCategories = () => openSettings('categories')

  const exportWorkspace = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      theme,
      objectives,
      tasks,
      projects,
      notes,
      links,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `q-panel-workspace-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    showToast('工作区已导出为 JSON')
  }
  const updateSidebarLabel = (key: keyof SidebarLabels, label: string) => {
    setSidebarLabels((current) => ({ ...current, [key]: label }))
  }
  const resetSidebarLabels = () => setSidebarLabels(DEFAULT_SIDEBAR_LABELS)

  const updateCalendarAdjustments = (next: CalendarAdjustment[]) => {
    const sorted = [...next].sort((a, b) => a.date.localeCompare(b.date))
    setCalendarAdjustments(sorted)
    applyCalendarAdjustments(sorted)
    showToast('日历已更新，季度容量已重新计算')
  }

  const deleteCategory = (categoryId: CategoryId) => {
    const category = CATEGORIES.find((item) => item.id === categoryId)
    if (!category) return
    if (!category.id.startsWith('cat-')) {
      showToast('内置分类不支持删除')
      return
    }
    const used = categoryUsage[categoryId] ?? 0
    if (used > 0) {
      showToast(`还有 ${used} 项使用「${category.name}」，先移动后再删除`)
      return
    }
    const index = CATEGORIES.findIndex((item) => item.id === categoryId)
    if (index >= 0) CATEGORIES.splice(index, 1)
    if (filter === categoryId) setFilter('all')
    setCategoryVersion((value) => value + 1)
    showToast(`已删除分类「${category.name}」`)
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [view, year, quarter, weekKey])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey
      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen((value) => !value)
        return
      }
      if (mod && event.key.toLowerCase() === 'j') {
        event.preventDefault()
        setAiOpen((value) => !value)
        return
      }
      if (event.key === 'Escape') {
        if (createMode) {
          setCreateMode(null)
        } else if (settingsOpen) {
          setSettingsOpen(false)
        } else if (commandOpen) {
          setCommandOpen(false)
        } else if (aiOpen) {
          setAiOpen(false)
        } else if (reminderOpen) {
          setReminderOpen(false)
        } else if (expanded) {
          if (electronMode) window.qpanel?.window.hide()
          else setExpanded(false)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [aiOpen, commandOpen, createMode, electronMode, expanded, reminderOpen, settingsOpen])

  useEffect(() => {
    if (params.get('collapsed') === '1' || params.get('noreminder') === '1') return
    const forced = params.get('reminder') === '1'
    const seen = window.sessionStorage.getItem('qpanel-reminder-seen')
    if (!forced && seen) return
    const timer = window.setTimeout(
      () => {
        setReminderOpen(true)
        window.sessionStorage.setItem('qpanel-reminder-seen', '1')
      },
      forced ? 600 : 5000,
    )
    return () => window.clearTimeout(timer)
  }, [params])

  const runViewTransition = (update: () => void) => {
    const doc = document as Document & {
      startViewTransition?: (callback: () => void) => { finished: Promise<void> }
    }
    if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      update()
      return
    }
    if (viewTransitionRef.current) {
      update()
      return
    }
    const transition = doc.startViewTransition(() => {
      flushSync(update)
    })
    viewTransitionRef.current = transition
    transition.finished
      .catch(() => undefined)
      .finally(() => {
        viewTransitionRef.current = null
      })
  }

  const changeTheme = (next: ThemeId) => {
    runViewTransition(() => setTheme(next))
  }

  const navigate = (next: ViewId) => {
    setView(next)
    setAiOpen(false)
  }

  const toggleTask = (id: string) => {
    setTasks((value) =>
      value.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    )
  }

  const toggleProjectWorkItem = (projectId: string, itemId: string) => {
    setProjects((value) =>
      value.map((project) =>
        project.id !== projectId
          ? project
          : {
              ...project,
              workItems: project.workItems.map((item) =>
                item.id === itemId
                  ? { ...item, status: item.status === 'done' ? 'todo' : 'done' }
                  : item,
              ),
            },
      ),
    )
  }

  const createTask = (data: {
    title: string
    categoryId: CategoryId
    dueDate: string
    dueTime: string
    estimateDays: number
    reminder?: string
  }) => {
    const task: WeekTask = {
      id: `t-${Date.now()}`,
      weekKey: weekKeyForDate(data.dueDate),
      title: data.title,
      categoryId: data.categoryId,
      dueDate: data.dueDate,
      dueTime: data.dueTime,
      estimateDays: data.estimateDays,
      done: false,
      reminder:
        data.reminder ?? formatReminder(reminderDefaults.offsetDays, reminderDefaults.time),
    }
    setTasks((value) => [task, ...value])
    showToast('已创建本周事项')
  }

  const createObjective = (data: {
    title: string
    categoryId: CategoryId
    plannedDays: number
    dueDate: string
    dueTime: string
    reminder?: string
  }) => {
    const key = quarterKey(year, quarter)
    const objective: Objective = {
      id: `o-${Date.now()}`,
      title: data.title,
      categoryId: data.categoryId,
      plannedDays: data.plannedDays,
      progress: 0,
      status: 'planned',
      dueDate: data.dueDate,
      dueTime: data.dueTime,
      reminder:
        data.reminder ?? formatReminder(reminderDefaults.offsetDays, reminderDefaults.time),
    }
    setObjectives((value) => ({ ...value, [key]: [...(value[key] ?? []), objective] }))
    showToast('已创建季度任务，容量已重新计算')
  }

  const createProject = (data: {
    title: string
    categoryId: CategoryId
    targetDate: string
    targetTime: string
    description: string
    reminder?: string
  }) => {
    const targetMonth = Number(data.targetDate.slice(5, 7))
    const targetYear = data.targetDate.slice(0, 4)
    const project: Project = {
      id: `p-${Date.now()}`,
      title: data.title,
      categoryId: data.categoryId,
      description: data.description || '新建长期项目。',
      span: `2026.10 – ${targetYear}.${String(targetMonth).padStart(2, '0')}`,
      startDate: '2026-10-17',
      endDate: data.targetDate,
      endTime: data.targetTime,
      reminder:
        data.reminder ?? formatReminder(reminderDefaults.offsetDays, reminderDefaults.time),
      status: 'active',
      plannedDays: 0,
      workItems: [],
      milestones: [
        {
          id: `m-${Date.now()}`,
          title: '启动与范围确认',
          targetDate: data.targetDate,
          targetTime: data.targetTime,
          status: 'doing',
        },
      ],
    }
    setProjects((value) => [...value, project])
    showToast('已创建长期项目')
  }

  const createAiTasks = (proposal: AiProposalTask[]) => {
    const stamp = Date.now()
    const newTasks: WeekTask[] = proposal.map((task, index) => ({
      id: `t-ai-${stamp}-${index}`,
      weekKey: '2026-W42',
      title: task.title,
      categoryId: task.categoryId,
      dueDate: task.dueDate,
      dueTime: task.dueTime,
      estimateDays: task.estimateDays,
      done: false,
      objectiveId: task.objectiveId,
      projectId: task.projectId,
      reminder: formatReminder(reminderDefaults.offsetDays, reminderDefaults.time),
    }))
    setTasks((value) => [...newTasks, ...value])
  }

  const moveOverdue = (ids: string[]) => {
    const weekEnd = WEEKS[weekKey]?.end ?? WEEKS['2026-W42'].end
    setTasks((value) =>
      value.map((task) =>
        ids.includes(task.id)
          ? { ...task, weekKey, dueDate: weekEnd, dueTime: '18:00' }
          : task,
      ),
    )
    showToast(`已把 ${ids.length} 项逾期事项移入当前周`)
  }

  const completeReminder = () => {
    setObjectives((value) => ({
      ...value,
      '2026-Q4': (value['2026-Q4'] ?? []).map((objective) =>
        objective.id === 'o1' ? { ...objective, progress: 100, status: 'done' } : objective,
      ),
    }))
    showToast('已标记完成：等保 2.0 差距分析闭环')
  }

  const testReminder = () => {
    if (electronMode) {
      void window.qpanel?.reminders.test()
      return
    }
    setReminderOpen(true)
  }

  const completeNativeReminder = () => {
    if (!nativeReminder) return
    if (nativeReminder.kind === 'task') {
      setTasks((value) =>
        value.map((task) => (task.id === nativeReminder.id ? { ...task, done: true } : task)),
      )
    } else if (nativeReminder.kind === 'objective') {
      setObjectives((value) =>
        Object.fromEntries(
          Object.entries(value).map(([key, list]) => [
            key,
            list.map((objective) =>
              objective.id === nativeReminder.id
                ? { ...objective, progress: 100, status: 'done' }
                : objective,
            ),
          ]),
        ),
      )
    } else {
      setProjects((value) =>
        value.map((project) =>
          project.id === nativeReminder.id ? { ...project, status: 'done' } : project,
        ),
      )
    }
    showToast(`已标记完成：${nativeReminder.title}`)
    setNativeReminder(null)
  }

  const openNativeReminder = () => {
    if (!nativeReminder) return
    if (nativeReminder.kind === 'task') {
      changeWeek(weekKeyForDate(nativeReminder.dueDate))
      setView('week')
    } else if (nativeReminder.kind === 'project') {
      setView('projects')
    } else {
      const dueMonth = Number(nativeReminder.dueDate.slice(5, 7))
      setYear(Number(nativeReminder.dueDate.slice(0, 4)))
      setQuarter(Math.floor((dueMonth - 1) / 3) + 1)
      setView('quarter')
    }
    setNativeReminder(null)
  }

  const defaultCreateDate =
    createMode === 'objective'
      ? quarterEndDate(year, quarter)
      : createMode === 'project'
        ? '2026-12-31'
        : view === 'week' && weekKey !== '2026-W42'
          ? WEEKS[weekKey]?.end ?? TODAY
          : TODAY

  const renderView = () => {
    switch (view) {
      case 'quarter':
        return (
          <QuarterView
            year={year}
            quarter={quarter}
            objectives={objectives}
            projects={projects}
            filter={filter}
            onFilter={setFilter}
            onOpenCreate={setCreateMode}
            onSelectPeriod={(nextYear, nextQuarter) => {
              setYear(nextYear)
              setQuarter(nextQuarter)
            }}
            onOpenStats={() => setView('stats')}
            onManageCategories={manageCategories}
          />
        )
      case 'week':
        return (
          <WeekView
            weekKey={weekKey}
            tasks={tasks}
            objectives={periodObjectives}
            projects={projects}
            filter={filter}
            onFilter={setFilter}
            onToggleTask={toggleTask}
            onOpenCreate={setCreateMode}
            onMoveOverdue={moveOverdue}
            onOpenQuarter={() => setView('quarter')}
            onOpenProjects={() => setView('projects')}
            onToggleWorkItem={toggleProjectWorkItem}
            onManageCategories={manageCategories}
          />
        )
      case 'projects':
        return (
          <ProjectsView
            projects={projects}
            year={year}
            quarter={quarter}
            filter={filter}
            onFilter={setFilter}
            onOpenCreate={setCreateMode}
            onToast={showToast}
            onChangeProjects={setProjects}
            onOpenWeek={(key) => {
              changeWeek(key)
              setView('week')
            }}
            onManageCategories={manageCategories}
          />
        )
      case 'stats':
        return (
          <StatsView year={year} quarter={quarter} projects={projects} />
        )
      case 'notes':
        return <NotesView notes={notes} onChange={setNotes} onToast={showToast} />
      case 'links':
        return (
          <LinksView
            links={links}
            onChange={setLinks}
            categories={linkCategories}
            onCategoriesChange={setLinkCategories}
            onToast={showToast}
          />
        )
      default:
        return null
    }
  }

  return (
    <div
      className={cn('qp-root', electronMode && 'electron-mode', notchMode && 'notch-mode')}
      data-theme={theme}
      data-electron={electronMode ? 'true' : undefined}
      data-notch={notchMode ? 'true' : undefined}
      data-hydrated={hydrated ? 'true' : 'false'}
      data-save-state={saveState}
      data-save-seq={saveSequence}
    >
      {!electronMode ? (
        <>
          <div
            className="wallpaper"
            onClick={() => {
              if (expanded) setExpanded(false)
            }}
          />
          <div className="noise" />
          <MenuBar />
        </>
      ) : null}

      {expanded ? (
        <>
          <div className="panel-wrap">
            <div className="panel-shell">
              <div className="panel" data-theme={theme}>
                <TopBar
                  projects={projects}
                  onToggleTheme={() =>
                    changeTheme(THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length])
                  }
                  year={year}
                  quarter={quarter}
                  view={view}
                  weekKey={weekKey}
                  onWeekChange={changeWeek}
                  onPeriodChange={(nextYear, nextQuarter) => {
                    setYear(nextYear)
                    setQuarter(nextQuarter)
                    if (view === 'week') {
                      const nextWeek = firstWeekKeyForQuarter(nextYear, nextQuarter)
                      if (nextWeek) setWeekKey(nextWeek)
                    }
                  }}
                  onOpenCommand={() => setCommandOpen(true)}
                  onOpenAI={() => setAiOpen(true)}
                  onOpenSettings={() => openSettings('general')}
                  onOpenReminder={() => setReminderOpen(true)}
                  onCollapse={() => {
                    if (electronMode) void window.qpanel?.window.hide()
                    else setExpanded(false)
                  }}
                  aiOpen={aiOpen}
                  bellCount={bellCount}
                />
                <div className="panel-body">
                  <Sidebar
                    view={view}
                    onView={navigate}
                    weekCount={weekCount}
                    weekPlanned={weekPlanned}
                    weekAvailable={weekAvailable}
                    weekLabel={view === 'week' ? `第 ${sideWeekMeta.num} 周容量` : '本周容量'}
                    groupLabels={sidebarLabels}
                  />
                  <div className="content">
                    <div className="view-scroll scroll" ref={scrollRef}>
                      <div className="view" key={`${view}-${year}-${quarter}-${weekKey}`}>
                        {renderView()}
                      </div>
                    </div>
                  </div>
                </div>
                {aiOpen ? (
                  <AIDrawer
                    onClose={() => setAiOpen(false)}
                    onCreateTasks={createAiTasks}
                    onToast={showToast}
                    model={aiModel}
                  />
                ) : null}
              </div>
            </div>
          </div>
          {!electronMode ? (
            <div className="expanded-hint">
              <span>
                点击桌面空白或按 <span className="kbd">esc</span> 收起
              </span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>
                <span className="kbd">⌘K</span> 跳转
              </span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>
                <span className="kbd">⌘J</span> AI
              </span>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <button
            type="button"
            className="notch"
            onClick={() => {
              if (electronMode) void window.qpanel?.notch.expand()
              else setExpanded(true)
            }}
            aria-label="展开 Q-Panel"
          >
            <span className="notch-mark">
              <Logo size={14} />
            </span>
            <span className="notch-label">Q-Panel</span>
            <span className="notch-badge num">{bellCount}</span>
          </button>
          <div className="notch-hint">点击刘海展开 · 本周 {weekCount} 项待办 · {bellCount} 条提醒</div>
        </>
      )}

      {commandOpen ? (
        <CommandPalette
          year={year}
          quarter={quarter}
          tasks={tasks}
          projects={projects}
          objectives={objectives}
          onClose={() => setCommandOpen(false)}
          onView={navigate}
          onPeriod={(nextYear, nextQuarter) => {
            setYear(nextYear)
            setQuarter(nextQuarter)
          }}
          onOpenAI={() => setAiOpen(true)}
          onOpenSettings={() => openSettings('general')}
          onToggleTheme={() => changeTheme(THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length])}
        />
      ) : null}

      {settingsOpen ? (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          theme={theme}
          onTheme={changeTheme}
          onTestReminder={testReminder}
          onToast={showToast}
          initialTab={settingsInitialTab}
          onAddCategory={handleAddCategory}
          onExportWorkspace={exportWorkspace}
          categoryUsage={categoryUsage}
          onDeleteCategory={deleteCategory}
          aiModel={aiModel}
          onAiModelChange={setAiModel}
          reminderDefaults={reminderDefaults}
          onReminderDefaultsChange={setReminderDefaults}
          calendarAdjustments={calendarAdjustments}
          onCalendarAdjustmentsChange={updateCalendarAdjustments}
          sidebarLabels={sidebarLabels}
          onUpdateSidebarLabel={updateSidebarLabel}
          onResetSidebarLabels={resetSidebarLabels}
        />
      ) : null}

      {createMode ? (
        <CreateModal
          mode={createMode}
          defaultCategory={filter === 'all' ? 'appsec' : filter}
          defaultDate={defaultCreateDate}
          onClose={() => setCreateMode(null)}
          onCreateObjective={createObjective}
          onCreateTask={createTask}
          onCreateProject={createProject}
          onAddCategory={handleAddCategory}
          reminderDefaults={reminderDefaults}
        />
      ) : null}

      {nativeReminder ? (
        <ReminderPopup
          title={nativeReminder.title}
          categoryName={getCategory((nativeReminder.categoryId ?? 'other') as CategoryId).name}
          kindLabel={
            nativeReminder.kind === 'task'
              ? '本周事项'
              : nativeReminder.kind === 'project'
                ? '全局项目'
                : '季度任务'
          }
          dueDate={nativeReminder.dueDate}
          dueTime={nativeReminder.dueTime}
          reminder={nativeReminder.reminder}
          onClose={() => setNativeReminder(null)}
          onComplete={completeNativeReminder}
          onSnooze={() => {
            showToast('已稍后提醒：10 分钟后再弹一次')
            setNativeReminder(null)
          }}
          onOpen={openNativeReminder}
        />
      ) : reminderOpen && reminderObjective ? (
        <ReminderPopup
          title={reminderObjective.title}
          categoryName={getCategory(reminderObjective.categoryId).name}
          dueDate={reminderObjective.dueDate}
          dueTime={reminderObjective.dueTime}
          reminder={reminderObjective.reminder}
          onClose={() => setReminderOpen(false)}
          onComplete={completeReminder}
          onSnooze={() => showToast('已稍后提醒：10 分钟后再弹一次')}
          onOpen={() => {
            setView('quarter')
            setYear(2026)
            setQuarter(4)
          }}
        />
      ) : null}

      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </div>
  )
}
