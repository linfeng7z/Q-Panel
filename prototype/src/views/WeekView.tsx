import { useState } from 'react'
import {
  ArrowRight,
  CaretLeft,
  CaretRight,
  CheckCircle,
  FolderSimple,
  Plus,
  Target,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import type { CategoryId, CreateMode, Objective, Project, WeekTask } from '../types'
import {
  CATEGORIES,
  TODAY,
  WEEKDAY_CN,
  WEEK_ORDER,
  WEEKS,
  dayInfo,
} from '../data/mock'
import {
  cn,
  doneHoursOf,
  fmtDate,
  hoursOf,
  isOverdue,
  projectNext,
  projectProgress,
} from '../utils'
import { TaskRow } from '../components/TaskRow'
import { Card, Progress, catStyle } from '../components/ui'

interface WeekViewProps {
  weekKey: string
  tasks: WeekTask[]
  objectives: Objective[]
  projects: Project[]
  filter: CategoryId | 'all'
  onFilter: (filter: CategoryId | 'all') => void
  onWeekChange: (weekKey: string) => void
  onToggleTask: (id: string) => void
  onOpenCreate: (mode: CreateMode) => void
  onMoveOverdue: (ids: string[]) => void
  onToast: (message: string) => void
}

function addDays(iso: string, amount: number): string {
  const date = new Date(`${iso}T12:00:00+08:00`)
  date.setDate(date.getDate() + amount)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function WeekView({
  weekKey,
  tasks,
  objectives,
  projects,
  filter,
  onFilter,
  onWeekChange,
  onToggleTask,
  onOpenCreate,
  onMoveOverdue,
  onToast,
}: WeekViewProps) {
  const [activeDay, setActiveDay] = useState<string | null>(null)
  const meta = WEEKS[weekKey] ?? WEEKS['2026-W42']
  const weekTasks = tasks.filter((task) => task.weekKey === weekKey)
  const filteredTasks =
    filter === 'all' ? weekTasks : weekTasks.filter((task) => task.categoryId === filter)
  const visibleTasks = activeDay
    ? filteredTasks.filter((task) => task.dueDate === activeDay)
    : filteredTasks
  const undone = visibleTasks.filter((task) => !task.done)
  const done = visibleTasks.filter((task) => task.done)
  const planned = hoursOf(weekTasks)
  const doneHours = doneHoursOf(weekTasks)
  const available = meta.workdays * 8 - meta.leaveHours
  const remaining = available - planned
  const overdue = tasks.filter(isOverdue)
  const days = Array.from({ length: 7 }, (_, index) => addDays(meta.start, index))
  const weekIndex = WEEK_ORDER.indexOf(weekKey)
  const linkedObjectiveIds = Array.from(
    new Set(weekTasks.map((task) => task.objectiveId).filter(Boolean)),
  ) as string[]
  const linkedObjectives = linkedObjectiveIds
    .map((id) => objectives.find((objective) => objective.id === id))
    .filter((objective): objective is Objective => Boolean(objective))
    .slice(0, 3)
  const sideObjectives = linkedObjectives.length
    ? linkedObjectives
    : objectives.filter((objective) => objective.status !== 'done').slice(0, 3)
  const linkedProjectIds = Array.from(
    new Set(weekTasks.map((task) => task.projectId).filter(Boolean)),
  ) as string[]
  const sideProjects = linkedProjectIds
    .map((id) => projects.find((project) => project.id === id))
    .filter((project): project is Project => Boolean(project))
    .slice(0, 3)
  const segments = CATEGORIES.map((category) => ({
    category,
    hours: hoursOf(weekTasks.filter((task) => task.categoryId === category.id)),
  })).filter((segment) => segment.hours > 0)

  const goPrev = () => {
    if (weekIndex > 0) onWeekChange(WEEK_ORDER[weekIndex - 1])
  }
  const goNext = () => {
    if (weekIndex < WEEK_ORDER.length - 1) onWeekChange(WEEK_ORDER[weekIndex + 1])
  }

  return (
    <div className="view week-view">
      <div className="page-head week-head">
        <div>
          <div className="eyebrow">
            <span className="tick" />
            Week {meta.num} · 2026
          </div>
          <h1 className="page-title">
            第 {meta.num} 周 <span className="light">本周必做</span>
          </h1>
          <p className="page-sub">
            {meta.range} · {meta.workdays} 个工作日 · 可用 {available}h
            {meta.note ? ` · ${meta.note}` : ''}
          </p>
        </div>
        <div className="head-actions">
          <div className="week-nav">
            <button
              type="button"
              className="icon-btn"
              style={{ width: 25, height: 25 }}
              onClick={goPrev}
              disabled={weekIndex <= 0}
              aria-label="上一周"
            >
              <CaretLeft size={13} />
            </button>
            <span className="week-nav-label">第 {meta.num} 周</span>
            <button
              type="button"
              className="icon-btn"
              style={{ width: 25, height: 25 }}
              onClick={goNext}
              disabled={weekIndex >= WEEK_ORDER.length - 1}
              aria-label="下一周"
            >
              <CaretRight size={13} />
            </button>
          </div>
          <button type="button" className="btn primary" onClick={() => onOpenCreate('task')}>
            <span className="icon-circle">
              <Plus size={12} weight="bold" />
            </span>
            新建事项
          </button>
        </div>
      </div>

      <Card className="week-cap" innerClassName="week-cap-inner">
        <div className="week-cap-stats">
          <div className="week-cap-stat">
            <b className="num">{available}h</b>
            <span>可用工时</span>
          </div>
          <div className="week-cap-stat">
            <b className="num">{planned}h</b>
            <span>已排工时</span>
          </div>
          <div className="week-cap-stat">
            <b className="num">{doneHours}h</b>
            <span>已完成</span>
          </div>
          <div className="week-cap-stat">
            <b className="num">{Math.max(0, remaining)}h</b>
            <span>剩余</span>
          </div>
        </div>
        <div className="week-cap-viz">
          <div className="stack">
            {segments.map((segment) => (
              <i
                key={segment.category.id}
                style={{
                  width: `${(segment.hours / Math.max(available, 1)) * 100}%`,
                  background: `var(${segment.category.colorVar})`,
                }}
              />
            ))}
            <span className="remaining" />
          </div>
          <div className="week-cap-legend">
            {segments.map((segment) => (
              <span key={segment.category.id}>
                <i style={{ background: `var(${segment.category.colorVar})` }} />
                {segment.category.name} {segment.hours}h
              </span>
            ))}
            <span style={{ marginLeft: 'auto' }}>
              {weekTasks.filter((task) => task.done).length}/{weekTasks.length} 项完成
            </span>
          </div>
        </div>
      </Card>

      <div className="day-strip">
        {days.map((iso) => {
          const info = dayInfo(iso)
          const dayTasks = weekTasks.filter((task) => task.dueDate === iso)
          const isToday = iso === TODAY
          return (
            <button
              key={iso}
              type="button"
              className={cn(
                'day-card',
                isToday && 'today',
                (info.kind === 'weekend' || info.kind === 'holiday') && 'off',
              )}
              onClick={() => setActiveDay((value) => (value === iso ? null : iso))}
            >
              {isToday ? <span className="today-pill">TODAY</span> : null}
              <span className="day-name">周{WEEKDAY_CN[new Date(`${iso}T12:00:00+08:00`).getDay()]}</span>
              <span className="day-num">{Number(iso.slice(-2))}</span>
              <span
                className={cn(
                  'day-note',
                  info.kind === 'holiday' && 'holiday',
                  info.kind === 'makeup' && 'makeup',
                  info.kind === 'leave' && 'leave',
                )}
              >
                {info.label ?? (info.kind === 'weekend' ? '周末' : '')}
              </span>
              <span className="day-dots">
                {dayTasks.slice(0, 4).map((task) => (
                  <i key={task.id} style={catStyle(task.categoryId)} />
                ))}
              </span>
            </button>
          )
        })}
      </div>

      <div className="week-grid">
        <Card>
          <div className="list-head">
            <div className="list-title">
              本周必做
              <span className="list-count num">{visibleTasks.length}</span>
            </div>
            <div className="list-actions">
              <button
                type="button"
                className={cn('chip', filter === 'all' && 'active')}
                onClick={() => onFilter('all')}
              >
                全部
              </button>
              {CATEGORIES.map((category) => {
                const count = weekTasks.filter((task) => task.categoryId === category.id).length
                if (!count) return null
                return (
                  <button
                    key={category.id}
                    type="button"
                    className={cn('chip cat', filter === category.id && 'active')}
                    style={catStyle(category.id)}
                    onClick={() => onFilter(category.id)}
                  >
                    <span className="dot" />
                    {category.name}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="list-body">
            {overdue.length > 0 ? (
              <div className="overdue-strip">
                <WarningCircle size={12} />
                上期有 <b>{overdue.length}</b> 项逾期未完成
                <button type="button" className="btn sm" onClick={() => onMoveOverdue(overdue.map((task) => task.id))}>
                  移入本周
                </button>
              </div>
            ) : null}
            {activeDay ? (
              <div className="filter-row" style={{ padding: '5px 9px 3px', marginBottom: 3 }}>
                <span className="chip active">
                  {fmtDate(activeDay)} · 周
                  {WEEKDAY_CN[new Date(`${activeDay}T12:00:00+08:00`).getDay()]}
                  <button
                    type="button"
                    onClick={() => setActiveDay(null)}
                    style={{ display: 'grid', placeItems: 'center', color: 'var(--text-3)' }}
                  >
                    <X size={10} />
                  </button>
                </span>
                <span className="faint" style={{ fontSize: 9 }}>
                  点击日期再次取消筛选
                </span>
              </div>
            ) : null}
            <div className="task-rows">
              {undone.map((task) => {
                const project = projects.find((item) => item.id === task.projectId)
                const objective = objectives.find((item) => item.id === task.objectiveId)
                return (
                  <TaskRow
                    key={task.id}
                    task={task}
                    project={project}
                    objective={objective}
                    onToggle={onToggleTask}
                    onMenu={(item) => onToast(`「${item.title}」的编辑菜单将在功能版接入`)}
                  />
                )
              })}
            </div>
            {done.length > 0 ? (
              <>
                <div className="section-label">
                  <CheckCircle size={10} /> 已完成 · {done.length}
                </div>
                <div className="task-rows">
                  {done.map((task) => {
                    const project = projects.find((item) => item.id === task.projectId)
                    const objective = objectives.find((item) => item.id === task.objectiveId)
                    return (
                      <TaskRow
                        key={task.id}
                        task={task}
                        project={project}
                        objective={objective}
                        onToggle={onToggleTask}
                      />
                    )
                  })}
                </div>
              </>
            ) : null}
            {visibleTasks.length === 0 ? (
              <div className="task-empty">这一周还没有事项。先建一件最想推进的事。</div>
            ) : null}
          </div>
          <div className="list-foot">
            <button type="button" className="add-row" onClick={() => onOpenCreate('task')}>
              <Plus size={13} />
              添加本周必做
            </button>
          </div>
        </Card>

        <div className="week-side">
          <Card>
            <div className="card-pad-sm">
              <div className="card-head">
                <div className="card-title">
                  <Target size={13} />
                  关联主线
                </div>
                <button type="button" className="card-link" onClick={() => onToast('季度主线详情在季度页查看')}>
                  Q4 <ArrowRight size={10} />
                </button>
              </div>
              {sideObjectives.map((objective) => (
                <div
                  className="objective-mini"
                  key={objective.id}
                  onClick={() => onToast(`主线：${objective.title} · ${objective.progress}%`)}
                >
                  <div className="objective-mini-top" style={catStyle(objective.categoryId)}>
                    <span className="dot" style={{ width: 5, height: 5, flexBasis: 5 }} />
                    <span className="obj-name">{objective.title}</span>
                    <span className="obj-pct">{objective.progress}%</span>
                  </div>
                  <Progress value={objective.progress} catId={objective.categoryId} />
                </div>
              ))}
              {sideObjectives.length === 0 ? <div className="task-empty">本周还没有关联主线。</div> : null}
            </div>
          </Card>

          <Card>
            <div className="card-pad-sm">
              <div className="card-head">
                <div className="card-title">
                  <FolderSimple size={13} />
                  项目推进
                </div>
                <button type="button" className="card-link" onClick={() => onToast('去项目页查看全部里程碑')}>
                  全部 <ArrowRight size={10} />
                </button>
              </div>
              {sideProjects.map((project) => {
                const next = projectNext(project)
                return (
                  <div className="project-mini" key={project.id}>
                    <span className="project-mini-icon" style={catStyle(project.categoryId)}>
                      <FolderSimple size={14} />
                    </span>
                    <span className="project-mini-copy">
                      <b>{project.title}</b>
                      <span>
                        {next ? `下一里程碑 ${fmtDate(next.targetDate)}` : '全部里程碑已完成'}
                      </span>
                    </span>
                    <span className="mini-pct">{projectProgress(project)}%</span>
                  </div>
                )
              })}
              {sideProjects.length === 0 ? (
                <div className="task-empty">本周事项还没有关联项目。</div>
              ) : null}
            </div>
          </Card>

        </div>
      </div>
    </div>
  )
}
