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
import { CATEGORIES, TODAY, WEEKDAY_CN, WEEK_ORDER, WEEKS, dayInfo, getCategory } from '../data/mock'
import {
  cn,
  doneDaysOf,
  fmtDate,
  fmtDays,
  fmtDue,
  daysOf,
  isOverdue,
  projectNext,
  projectProgress,
  projectWorkItemDays,
  projectWorkItemsForWeek,
} from '../utils'
import { TaskRow } from '../components/TaskRow'
import { Card, CheckBox, Progress, catStyle } from '../components/ui'

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
  onToggleWorkItem: (projectId: string, itemId: string) => void
  onManageCategories: () => void
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
  onToggleWorkItem,
  onManageCategories,
}: WeekViewProps) {
  const [activeDay, setActiveDay] = useState<string | null>(null)
  const meta = WEEKS[weekKey] ?? WEEKS['2026-W42']
  const weekYear = Number(meta.end.slice(0, 4))
  const weekTasks = tasks.filter((task) => task.weekKey === weekKey)
  const autoItems = projectWorkItemsForWeek(projects, weekKey)
  const filteredTasks =
    filter === 'all' ? weekTasks : weekTasks.filter((task) => task.categoryId === filter)
  const visibleAutoItems =
    filter === 'all'
      ? autoItems
      : autoItems.filter((item) => item.project.categoryId === filter)
  const visibleTasks = activeDay
    ? filteredTasks.filter((task) => task.dueDate === activeDay)
    : filteredTasks
  const undone = visibleTasks.filter((task) => !task.done)
  const done = visibleTasks.filter((task) => task.done)
  const autoPlanned = projectWorkItemDays(autoItems)
  const autoDone = autoItems
    .filter((item) => item.status === 'done')
    .reduce((sum, item) => sum + item.plannedDays, 0)
  const planned = daysOf(weekTasks) + autoPlanned
  const doneDays = doneDaysOf(weekTasks) + autoDone
  const available = meta.workdays - meta.leaveDays
  const remaining = available - planned
  const overdue = meta.end <= '2026-12-31' ? tasks.filter(isOverdue) : []
  const days = Array.from({ length: 7 }, (_, index) => addDays(meta.start, index))
  const weekIndex = WEEK_ORDER.indexOf(weekKey)
  const prevWeek = weekIndex > 0 ? WEEKS[WEEK_ORDER[weekIndex - 1]] : null
  const nextWeek = weekIndex < WEEK_ORDER.length - 1 ? WEEKS[WEEK_ORDER[weekIndex + 1]] : null
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
    new Set([
      ...weekTasks.map((task) => task.projectId).filter(Boolean),
      ...autoItems.map((item) => item.project.id),
    ]),
  ) as string[]
  const sideProjects = linkedProjectIds
    .map((id) => projects.find((project) => project.id === id))
    .filter((project): project is Project => Boolean(project))
    .slice(0, 3)
  const segments = CATEGORIES.map((category) => ({
    category,
    days:
      daysOf(weekTasks.filter((task) => task.categoryId === category.id)) +
      autoItems
        .filter((item) => item.project.categoryId === category.id)
        .reduce((sum, item) => sum + item.plannedDays, 0),
  })).filter((segment) => segment.days > 0)
  const totalItems = weekTasks.length + autoItems.length
  const totalDone =
    weekTasks.filter((task) => task.done).length +
    autoItems.filter((item) => item.status === 'done').length

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
            本周安排 · Week {meta.num} · {weekYear}
          </div>
          <h1 className="page-title">
            第 {meta.num} 周
          </h1>
          <p className="page-sub">
            {meta.range} · {meta.workdays} 个工作日 · 可用 {available} 人日
            {meta.note ? ` · ${meta.note}` : ''}
          </p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn primary" onClick={() => onOpenCreate('task')}>
            <span className="icon-circle">
              <Plus size={12} weight="bold" />
            </span>
            新建事项
          </button>
        </div>
      </div>

      <div className="week-switch-bar">
        <button
          type="button"
          className="btn ghost sm"
          onClick={goPrev}
          disabled={weekIndex <= 0}
          title={prevWeek ? `第 ${prevWeek.num} 周 · ${prevWeek.range}` : '没有上一周'}
        >
          <CaretLeft size={13} />
          上一周
        </button>
        <div className="week-switch-center">
          <b>
            第 {meta.num} 周 <span className="faint">/ {meta.range}</span>
          </b>
          <span>
            {meta.workdays} 个工作日 · 可用 {available} 人日
          </span>
        </div>
        <button
          type="button"
          className="btn ghost sm"
          onClick={goNext}
          disabled={weekIndex >= WEEK_ORDER.length - 1}
          title={nextWeek ? `第 ${nextWeek.num} 周 · ${nextWeek.range}` : '没有下一周'}
        >
          下一周
          <CaretRight size={13} />
        </button>
        <button
          type="button"
          className={cn('chip', weekKey === '2026-W42' && 'active')}
          onClick={() => onWeekChange('2026-W42')}
        >
          回到本周
        </button>
      </div>

      <Card className="week-cap" innerClassName="week-cap-inner">
        <div className="week-cap-stats">
          <div className="week-cap-stat">
            <b className="num">{fmtDays(available)}</b>
            <span>可用人日</span>
          </div>
          <div className="week-cap-stat">
            <b className="num">{fmtDays(planned)}</b>
            <span>已排人日</span>
          </div>
          <div className="week-cap-stat">
            <b className="num">{fmtDays(doneDays)}</b>
            <span>已完成</span>
          </div>
          <div className="week-cap-stat">
            <b className={cn('num', remaining < 0 && 'negative')}>
              {remaining < 0 ? `-${fmtDays(Math.abs(remaining))}` : fmtDays(remaining)}
            </b>
            <span>{remaining < 0 ? '超载人日' : '剩余人日'}</span>
          </div>
        </div>
        <div className="week-cap-viz">
          <div className="stack">
            {segments.map((segment) => (
              <i
                key={segment.category.id}
                style={{
                  width: `${(segment.days / Math.max(available, 1)) * 100}%`,
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
                {segment.category.name} {segment.days} 人日
              </span>
            ))}
            {autoPlanned > 0 ? (
              <span className="auto-cap-note">
                <FolderSimple size={9} /> 项目排期 {fmtDays(autoPlanned)} 人日
              </span>
            ) : null}
            <span style={{ marginLeft: 'auto' }}>
              {totalDone}/{totalItems} 项完成
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
              <span className="day-name">
                周{WEEKDAY_CN[new Date(`${iso}T12:00:00+08:00`).getDay()]}
              </span>
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
              本周事项
              <span className="list-count num">{visibleTasks.length + visibleAutoItems.length}</span>
              {visibleAutoItems.length > 0 ? (
                <span className="auto-head-tag">项目自动排期 {visibleAutoItems.length} 项</span>
              ) : null}
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
                const count =
                  weekTasks.filter((task) => task.categoryId === category.id).length +
                  autoItems.filter((item) => item.project.categoryId === category.id).length
                if (!count && !category.id.startsWith('cat-')) return null
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
              <button type="button" className="chip add" onClick={onManageCategories}>
                <Plus size={10} />
                分类
              </button>
            </div>
          </div>
          <div className="list-body">
            {overdue.length > 0 ? (
              <div className="overdue-strip">
                <WarningCircle size={12} />
                上期有 <b>{overdue.length}</b> 项逾期未完成
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => onMoveOverdue(overdue.map((task) => task.id))}
                >
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

            {undone.length > 0 ? (
              <div className="section-label">
                <CheckCircle size={10} /> 本周必做 · {undone.length}
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
            {!activeDay && visibleAutoItems.length > 0 ? (
              <>
                <div className="section-label auto-section-label">
                  <FolderSimple size={10} />
                  项目自动排期 · {visibleAutoItems.length} 项 ·{' '}
                  {fmtDays(visibleAutoItems.reduce((sum, item) => sum + item.plannedDays, 0))} 人日
                  <span className="auto-section-hint">来自全局项目规划</span>
                </div>
                <div className="task-rows">
                  {visibleAutoItems.map((item) => {
                    const category = getCategory(item.project.categoryId)
                    return (
                      <div
                        key={item.id}
                        className={cn('task-row auto-row', item.status === 'done' && 'done')}
                        style={catStyle(item.project.categoryId)}
                      >
                        <CheckBox
                          on={item.status === 'done'}
                          onToggle={() => onToggleWorkItem(item.project.id, item.id)}
                          label={item.title}
                        />
                        <div className="task-main">
                          <div className="task-title">{item.title}</div>
                          <div className="task-meta">
                            <span className="meta-item">
                              <span className="dot" style={{ width: 5, height: 5, flexBasis: 5 }} />
                              {category.name}
                            </span>
                            <span className="project-chip">
                              <Target size={9} />
                              {item.project.title}
                            </span>
                            <span className="auto-tag">自动排期</span>
                            <span className="meta-item">第 {meta.num} 周</span>
                          </div>
                        </div>
                        <div className={cn('task-hours', item.status === 'done' && 'done')}>
                          <b>{fmtDays(item.plannedDays)}</b>
                          <span>人日</span>
                        </div>
                        <span className="auto-row-pad" />
                      </div>
                    )
                  })}
                </div>
              </>
            ) : null}

            {visibleTasks.length === 0 && (activeDay || visibleAutoItems.length === 0) ? (
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
                  关联季度任务
                </div>
                <button
                  type="button"
                  className="card-link"
                  onClick={() => onToast('季度任务详情在季度规划查看')}
                >
                  季度规划 <ArrowRight size={10} />
                </button>
              </div>
              {sideObjectives.map((objective) => (
                <div
                  className="objective-mini"
                  key={objective.id}
                  onClick={() => onToast(`季度任务：${objective.title} · ${objective.progress}%`)}
                >
                  <div className="objective-mini-top" style={catStyle(objective.categoryId)}>
                    <span className="dot" style={{ width: 5, height: 5, flexBasis: 5 }} />
                    <span className="obj-name">{objective.title}</span>
                    <span className="obj-pct">{objective.progress}%</span>
                  </div>
                  <Progress value={objective.progress} catId={objective.categoryId} />
                </div>
              ))}
              {sideObjectives.length === 0 ? (
                <div className="task-empty">本周还没有关联季度任务。</div>
              ) : null}
            </div>
          </Card>

          <Card>
            <div className="card-pad-sm">
              <div className="card-head">
                <div className="card-title">
                  <FolderSimple size={13} />
                  项目推进
                </div>
                <button
                  type="button"
                  className="card-link"
                  onClick={() => onToast('去项目页查看全部里程碑')}
                >
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
                        {next ? `下一里程碑 ${fmtDue(next.targetDate, next.targetTime)}` : '全部里程碑已完成'}
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
