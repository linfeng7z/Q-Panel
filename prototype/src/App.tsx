import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AiProposalTask,
  CategoryId,
  CreateMode,
  LinkItem,
  Note,
  Objective,
  Project,
  ThemeId,
  ViewId,
  WeekTask,
} from './types'
import {
  INITIAL_TASKS,
  LINKS,
  NOTES,
  OBJECTIVES,
  PROJECTS,
  TODAY,
  WEEKS,
  quarterKey,
} from './data/mock'
import { dateISO, hoursOf, isOverdue } from './utils'
import { MenuBar } from './components/MenuBar'
import { TopBar } from './components/TopBar'
import { Sidebar } from './components/Sidebar'
import { CommandPalette } from './components/CommandPalette'
import { AIDrawer } from './components/AIDrawer'
import { SettingsModal } from './components/SettingsModal'
import { CreateModal } from './components/CreateModal'
import { ReminderPopup } from './components/ReminderPopup'
import { Toast } from './components/Toast'
import { TodayView } from './views/TodayView'
import { QuarterView } from './views/QuarterView'
import { WeekView } from './views/WeekView'
import { ProjectsView } from './views/ProjectsView'
import { StatsView } from './views/StatsView'
import { NotesView } from './views/NotesView'
import { LinksView } from './views/LinksView'

const VIEWS: ViewId[] = ['today', 'quarter', 'week', 'projects', 'stats', 'notes', 'links']
const THEMES: ThemeId[] = ['noir', 'ops']

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
  const [theme, setTheme] = useState<ThemeId>(parseInitialTheme)
  const [view, setView] = useState<ViewId>(parseInitialView)
  const [expanded, setExpanded] = useState(params.get('collapsed') !== '1')
  const [year, setYear] = useState(2026)
  const [quarter, setQuarter] = useState(4)
  const [weekKey, setWeekKey] = useState('2026-W42')
  const [tasks, setTasks] = useState<WeekTask[]>(INITIAL_TASKS)
  const [objectives, setObjectives] = useState<Record<string, Objective[]>>(OBJECTIVES)
  const [projects, setProjects] = useState<Project[]>(PROJECTS)
  const [notes, setNotes] = useState<Note[]>(NOTES)
  const [links, setLinks] = useState<LinkItem[]>(LINKS)
  const [filter, setFilter] = useState<CategoryId | 'all'>('all')
  const [commandOpen, setCommandOpen] = useState(params.get('cmd') === '1')
  const [aiOpen, setAiOpen] = useState(params.get('ai') === '1')
  const [settingsOpen, setSettingsOpen] = useState(params.get('settings') === '1')
  const [reminderOpen, setReminderOpen] = useState(false)
  const [createMode, setCreateMode] = useState<CreateMode | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const scrollRef = useRef<HTMLDivElement>(null)

  const currentWeekTasks = tasks.filter((task) => task.weekKey === '2026-W42')
  const weekAvailable = 40
  const weekPlanned = hoursOf(currentWeekTasks)
  const todayCount = tasks.filter(
    (task) => !task.done && (task.dueDate === TODAY || isOverdue(task)),
  ).length
  const weekCount = currentWeekTasks.filter((task) => !task.done).length
  const bellCount = tasks.filter(
    (task) => !task.done && (task.dueDate === TODAY || isOverdue(task)),
  ).length
  const q4Objectives = objectives['2026-Q4'] ?? []

  const showToast = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3000)
  }, [])

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
          setExpanded(false)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [createMode, settingsOpen, commandOpen, aiOpen, reminderOpen, expanded])

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

  const navigate = (next: ViewId) => {
    setView(next)
    setAiOpen(false)
  }

  const toggleTask = (id: string) => {
    setTasks((value) =>
      value.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    )
  }

  const quickAdd = (title: string) => {
    const task: WeekTask = {
      id: `t-${Date.now()}`,
      weekKey: '2026-W42',
      title,
      categoryId: filter === 'all' ? 'other' : filter,
      dueDate: TODAY,
      dueTime: '23:30',
      estimateHours: 1,
      done: false,
      reminder: '提前 1 天 · 09:30',
    }
    setTasks((value) => [task, ...value])
    showToast('已添加今日事项')
  }

  const createTask = (data: {
    title: string
    categoryId: CategoryId
    dueDate: string
    estimateHours: number
  }) => {
    const task: WeekTask = {
      id: `t-${Date.now()}`,
      weekKey: weekKeyForDate(data.dueDate),
      title: data.title,
      categoryId: data.categoryId,
      dueDate: data.dueDate,
      dueTime: data.dueDate === TODAY ? '23:30' : undefined,
      estimateHours: data.estimateHours,
      done: false,
      reminder: '提前 2 天 · 09:30',
    }
    setTasks((value) => [task, ...value])
    showToast('已创建本周事项')
  }

  const createObjective = (data: {
    title: string
    categoryId: CategoryId
    plannedHours: number
    dueDate: string
  }) => {
    const key = quarterKey(year, quarter)
    const objective: Objective = {
      id: `o-${Date.now()}`,
      title: data.title,
      categoryId: data.categoryId,
      plannedHours: data.plannedHours,
      progress: 0,
      status: 'planned',
      dueDate: data.dueDate,
      reminder: '提前 2 天 · 09:30',
    }
    setObjectives((value) => ({ ...value, [key]: [...(value[key] ?? []), objective] }))
    showToast('已创建季度主线，容量已重新计算')
  }

  const createProject = (data: {
    title: string
    categoryId: CategoryId
    targetDate: string
    description: string
  }) => {
    const targetMonth = Number(data.targetDate.slice(5, 7))
    const targetYear = data.targetDate.slice(0, 4)
    const project: Project = {
      id: `p-${Date.now()}`,
      title: data.title,
      categoryId: data.categoryId,
      description: data.description || '新建长期项目。',
      span: `2026.10 – ${targetYear}.${String(targetMonth).padStart(2, '0')}`,
      status: 'active',
      milestones: [
        {
          id: `m-${Date.now()}`,
          title: '启动与范围确认',
          targetDate: data.targetDate,
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
      estimateHours: task.estimateHours,
      done: false,
      objectiveId: task.objectiveId,
      projectId: task.projectId,
      reminder: '提前 2 天 · 09:30',
    }))
    setTasks((value) => [...newTasks, ...value])
  }

  const moveOverdue = (ids: string[]) => {
    const weekEnd = WEEKS[weekKey]?.end ?? WEEKS['2026-W42'].end
    setTasks((value) =>
      value.map((task) =>
        ids.includes(task.id)
          ? { ...task, weekKey, dueDate: weekEnd, dueTime: undefined }
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
      case 'today':
        return (
          <TodayView
            tasks={tasks}
            objectives={q4Objectives}
            projects={projects}
            onToggleTask={toggleTask}
            onQuickAdd={quickAdd}
            onOpenCreate={setCreateMode}
            onNavigate={navigate}
          />
        )
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
            onToast={showToast}
          />
        )
      case 'week':
        return (
          <WeekView
            weekKey={weekKey}
            tasks={tasks}
            objectives={q4Objectives}
            projects={projects}
            filter={filter}
            onFilter={setFilter}
            onWeekChange={setWeekKey}
            onToggleTask={toggleTask}
            onOpenCreate={setCreateMode}
            onMoveOverdue={moveOverdue}
            onToast={showToast}
          />
        )
      case 'projects':
        return (
          <ProjectsView
            projects={projects}
            filter={filter}
            onFilter={setFilter}
            onOpenCreate={setCreateMode}
            onToast={showToast}
          />
        )
      case 'stats':
        return <StatsView year={year} quarter={quarter} onToast={showToast} />
      case 'notes':
        return <NotesView notes={notes} onChange={setNotes} onToast={showToast} />
      case 'links':
        return <LinksView links={links} onChange={setLinks} onToast={showToast} />
      default:
        return null
    }
  }

  return (
    <div className="qp-root" data-theme={theme}>
      <div
        className="wallpaper"
        onClick={() => {
          if (expanded) setExpanded(false)
        }}
      />
      <div className="noise" />
      <MenuBar />

      {expanded ? (
        <>
          <div className="panel-wrap">
            <div className="panel-shell">
              <div className="panel" data-theme={theme}>
                <TopBar
                  onToggleTheme={() =>
                    setTheme((value) => (value === 'noir' ? 'ops' : 'noir'))
                  }
                  year={year}
                  quarter={quarter}
                  onPeriodChange={(nextYear, nextQuarter) => {
                    setYear(nextYear)
                    setQuarter(nextQuarter)
                  }}
                  onOpenCommand={() => setCommandOpen(true)}
                  onOpenAI={() => setAiOpen(true)}
                  onOpenSettings={() => setSettingsOpen(true)}
                  onOpenReminder={() => setReminderOpen(true)}
                  onCollapse={() => setExpanded(false)}
                  aiOpen={aiOpen}
                  bellCount={bellCount}
                />
                <div className="panel-body">
                  <Sidebar
                    view={view}
                    onView={navigate}
                    todayCount={todayCount}
                    weekCount={weekCount}
                    weekPlanned={weekPlanned}
                    weekAvailable={weekAvailable}
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
                  />
                ) : null}
              </div>
            </div>
          </div>
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
        </>
      ) : (
        <>
          <button
            type="button"
            className="notch"
            onClick={() => setExpanded(true)}
            aria-label="展开 Q-Panel"
          >
            <span className="notch-mark">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 3.2l7.2 2.7v5.2c0 4.8-3 8.1-7.2 9.7-4.2-1.6-7.2-4.9-7.2-9.7V5.9L12 3.2z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path d="M8.8 12h6.4M12 8.8v6.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
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
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleTheme={() => setTheme((value) => (value === 'noir' ? 'ops' : 'noir'))}
        />
      ) : null}

      {settingsOpen ? (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          theme={theme}
          onTheme={setTheme}
          onTestReminder={() => setReminderOpen(true)}
          onToast={showToast}
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
        />
      ) : null}

      {reminderOpen ? (
        <ReminderPopup
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
