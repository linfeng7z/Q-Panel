import { useState } from 'react'
import {
  ArrowRight,
  CheckCircle,
  FolderSimple,
  Plus,
  Target,
  Trash,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import type { CategoryId, CreateMode, Objective, Project, WeekTask } from '../types'
import { CATEGORIES, CURRENT_WEEK_KEY, TODAY, WEEKDAY_CN, WEEKS, dayInfo, getCategory } from '../data/mock'
import {
  cn,
  doneDaysOf,
  fmtDate,
  fmtDays,
  fmtDue,
  fmtRange,
  daysOf,
  projectNext,
  projectProgress,
  projectWorkItemDays,
  projectWorkItemsForWeek,
  type ProjectWeekItem,
} from '../utils'
import { TaskRow } from '../components/TaskRow'
import { RelationThreads } from '../components/RelationThreads'
import { Card, CheckBox, Progress, catStyle } from '../components/ui'
import { getLanguage, t } from '../i18n'

interface WeekViewProps {
  weekKey: string
  tasks: WeekTask[]
  objectives: Objective[]
  projects: Project[]
  filter: CategoryId | 'all'
  onFilter: (filter: CategoryId | 'all') => void
  onToggleTask: (id: string) => void
  onEditTask: (task: WeekTask) => void
  onDeleteTask: (id: string) => void
  onOpenCreate: (mode: CreateMode) => void
  onMoveOverdue: (ids: string[]) => void
  onOpenQuarter: () => void
  onOpenProjects: () => void
  onToggleWorkItem: (projectId: string, itemId: string) => void
  onSkipProjectItem: (projectId: string, itemId: string, weekKey: string) => void
  onManageCategories: () => void
}

function weekdayLabel(iso: string): string {
  if (getLanguage() === 'en') {
    return new Date(`${iso}T12:00:00+08:00`).toLocaleString('en-US', { weekday: 'short' })
  }
  return `周${WEEKDAY_CN[new Date(`${iso}T12:00:00+08:00`).getDay()]}`
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
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onOpenCreate,
  onMoveOverdue,
  onOpenQuarter,
  onOpenProjects,
  onToggleWorkItem,
  onSkipProjectItem,
  onManageCategories,
}: WeekViewProps) {
  const [activeDay, setActiveDay] = useState<string | null>(null)
  const meta = WEEKS[weekKey] ?? WEEKS[CURRENT_WEEK_KEY]
  const [relationId, setRelationId] = useState<string | null>(null)
  const taskStart = (task: WeekTask) => task.startDate ?? task.dueDate
  const taskEnd = (task: WeekTask) => task.endDate ?? task.dueDate
  const taskTouchesWeek = (task: WeekTask) => taskStart(task) <= meta.end && taskEnd(task) >= meta.start
  const weekTasks = tasks.filter((task) => task.weekKey === weekKey || taskTouchesWeek(task))
  const autoItems = projectWorkItemsForWeek(projects, weekKey)
  const autoTouchesDay = (item: ProjectWeekItem) => {
    if (!activeDay) return true
    const start = item.startDate ?? WEEKS[item.weekKey]?.start ?? meta.start
    const end = item.endDate ?? WEEKS[item.weekKey]?.end ?? meta.end
    return start <= activeDay && end >= activeDay
  }
  const filteredTasks =
    filter === 'all' ? weekTasks : weekTasks.filter((task) => task.categoryId === filter)
  const visibleAutoItems =
    filter === 'all'
      ? autoItems.filter(autoTouchesDay)
      : autoItems.filter((item) => item.project.categoryId === filter && autoTouchesDay(item))
  const visibleTasks = activeDay
    ? filteredTasks.filter((task) => taskStart(task) <= activeDay && taskEnd(task) >= activeDay)
    : filteredTasks
  const relationTask = relationId ? weekTasks.find((task) => task.id === relationId) ?? null : null
  const relationAuto = relationId ? autoItems.find((item) => item.id === relationId) ?? null : null
  const relationObjectiveId = relationTask?.objectiveId ?? relationAuto?.project.objectiveId
  const relationProjectId = relationTask?.projectId ?? relationAuto?.project.id
  const relationSourceId = relationTask?.id ?? relationAuto?.id ?? null
  const isRelatedTask = (task: WeekTask) =>
    relationId !== null &&
    (task.id === relationId ||
      (relationObjectiveId !== undefined && task.objectiveId === relationObjectiveId) ||
      (relationProjectId !== undefined && task.projectId === relationProjectId))
  const isRelatedAuto = (item: ProjectWeekItem) =>
    relationId !== null &&
    (item.id === relationId ||
      (relationProjectId !== undefined && item.project.id === relationProjectId))

  const focusObjective = (objectiveId: string) => {
    const linkedTask = visibleTasks.find((task) => task.objectiveId === objectiveId)
    const linkedAuto = visibleAutoItems.find((item) => item.project.objectiveId === objectiveId)
    setRelationId(linkedTask?.id ?? linkedAuto?.id ?? null)
  }

  const focusProject = (projectId: string) => {
    const linkedTask = visibleTasks.find((task) => task.projectId === projectId)
    const linkedAuto = visibleAutoItems.find((item) => item.project.id === projectId)
    setRelationId(linkedTask?.id ?? linkedAuto?.id ?? null)
  }
  const undone = visibleTasks.filter((task) => !task.done)
  const done = visibleTasks.filter((task) => task.done)
  const autoUndone = visibleAutoItems.filter((item) => item.status !== 'done')
  const autoDone = visibleAutoItems.filter((item) => item.status === 'done')
  const autoPlanned = projectWorkItemDays(autoItems)
  const autoDoneDays = autoItems
    .filter((item) => item.status === 'done')
    .reduce((sum, item) => sum + item.weekDays, 0)
  const planned = daysOf(weekTasks) + autoPlanned
  const doneDays = doneDaysOf(weekTasks) + autoDoneDays
  const available = meta.workdays - meta.leaveDays
  const remaining = available - planned
  // “上期未完成” is defined by the task's week and its checkbox, not by the
  // due timestamp: an unchecked item from an earlier week stays in the backlog.
  const overdue =
    meta.end <= '2026-12-31'
      ? tasks.filter((task) => !task.done && task.weekKey < weekKey)
      : []
  const days = Array.from({ length: 7 }, (_, index) => addDays(meta.start, index))
  const linkedObjectiveIds = Array.from(
    new Set([
      ...weekTasks.map((task) => task.objectiveId).filter(Boolean),
      ...autoItems.map((item) => item.project.objectiveId).filter(Boolean),
    ]),
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
        .reduce((sum, item) => sum + item.weekDays, 0),
  })).filter((segment) => segment.days > 0)
  const totalItems = weekTasks.length + autoItems.length
  const totalDone =
    weekTasks.filter((task) => task.done).length +
    autoItems.filter((item) => item.status === 'done').length

  const renderAutoRow = (item: ProjectWeekItem) => {
    const category = getCategory(item.project.categoryId)
    return (
      <div
        key={item.id}
        className={cn(
          'task-row auto-row',
          item.status === 'done' && 'done',
          isRelatedAuto(item) && 'relation-related',
          relationId !== null && !isRelatedAuto(item) && 'relation-dimmed',
        )}
        style={catStyle(item.project.categoryId)}
        data-relation-task={item.id}
        onMouseEnter={() => setRelationId(item.id)}
        onMouseLeave={() => setRelationId(null)}
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
          </div>
        </div>
        <div className={cn('task-hours', item.status === 'done' && 'done')}>
          <b>{fmtDays(item.weekDays)}</b>
          <span>人日</span>
        </div>
        <button
          type="button"
          className="auto-remove-btn"
          title="从本周移除，不再自动同步"
          aria-label={`从本周移除 ${item.title}`}
          onClick={() => onSkipProjectItem(item.project.id, item.id, weekKey)}
        >
          <Trash size={11} />
        </button>
        <span className="auto-row-actions-pad" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className="view week-view">
      <div className="page-head week-head">
        <div className="week-head-copy">
          <h1 className="page-title">{t('第 {n} 周', { n: meta.num })}</h1>
          <p className="page-sub">
            {t('{workdays} 个工作日 · 可用 {available} 人日', { workdays: meta.workdays, available })}
            {meta.note ? ` · ${meta.note}` : ''}
          </p>
        </div>
        <div className="head-actions week-head-actions">
          <button type="button" className="btn primary" onClick={() => onOpenCreate('task')}>
            <span className="icon-circle">
              <Plus size={12} weight="bold" />
            </span>
            {t('新建事项')}
          </button>
        </div>
      </div>

      <Card className="week-cap" innerClassName="week-cap-inner">
        <div className="week-cap-stats">
          <div className="week-cap-stat">
            <b className="num">{fmtDays(available)}</b>
            <span>{t('可用人日')}</span>
          </div>
          <div className="week-cap-stat">
            <b className="num">{fmtDays(planned)}</b>
            <span>{t('已排人日')}</span>
          </div>
          <div className="week-cap-stat">
            <b className="num">{fmtDays(doneDays)}</b>
            <span>{t('已完成')}</span>
          </div>
          <div className="week-cap-stat">
            <b className={cn('num', remaining < 0 && 'negative')}>
              {remaining < 0 ? `-${fmtDays(Math.abs(remaining))}` : fmtDays(remaining)}
            </b>
            <span>{remaining < 0 ? t('超载人日') : t('剩余人日')}</span>
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
                {t(segment.category.name)} {segment.days} {t('人日')}
              </span>
            ))}
            {autoPlanned > 0 ? (
              <span className="auto-cap-note">
                <FolderSimple size={9} /> {t('项目排期 {n} 人日', { n: fmtDays(autoPlanned) })}
              </span>
            ) : null}
            <span style={{ marginLeft: 'auto' }}>
              {t('{done}/{total} 项完成', { done: totalDone, total: totalItems })}
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
                {weekdayLabel(iso)}
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
                {info.label ?? (info.kind === 'weekend' ? t('周末') : '')}
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
          <div className="list-head week-list-head">
            <div className="week-list-heading">
              <div className="list-title">
                {t('本周必做')}
                <span className="list-count num">{visibleTasks.length + visibleAutoItems.length}</span>
              </div>
            </div>
            <div className="list-actions week-list-actions">
              <button
                type="button"
                className={cn('chip', filter === 'all' && 'active')}
                onClick={() => onFilter('all')}
              >
                {t('全部')}
              </button>
              {CATEGORIES.map((category) => {
                const count =
                  weekTasks.filter((task) => task.categoryId === category.id).length +
                  autoItems.filter((item) => item.project.categoryId === category.id).length
                if (!count && filter !== category.id) return null
                return (
                  <button
                    key={category.id}
                    type="button"
                    className={cn('chip cat', filter === category.id && 'active')}
                    style={catStyle(category.id)}
                    onClick={() => onFilter(category.id)}
                  >
                    <span className="dot" />
                    <span className="cat-name">{t(category.name)}</span>
                  </button>
                )
              })}
              <button type="button" className="chip add" onClick={onManageCategories}>
                <Plus size={10} />
                {t('分类')}
              </button>
            </div>
          </div>
          <div className="list-body">
            {overdue.length > 0 ? (
              <div className="overdue-strip">
                <WarningCircle size={12} />
                {t('上期有 {n} 项未完成', { n: overdue.length })}
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

            {undone.length + autoUndone.length > 0 ? (
              <div className="section-label">
                <CheckCircle size={10} /> {t('待完成 · {n}', { n: undone.length + autoUndone.length })}
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
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    onHover={(next) => setRelationId(next?.id ?? null)}
                    related={isRelatedTask(task)}
                    dimmed={relationId !== null && !isRelatedTask(task)}
                  />
                )
              })}
              {autoUndone.map(renderAutoRow)}
            </div>
            {done.length + autoDone.length > 0 ? (
              <>
                <div className="section-label">
                  <CheckCircle size={10} /> {t('已完成 · {n}', { n: done.length + autoDone.length })}
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
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                        onHover={(next) => setRelationId(next?.id ?? null)}
                        related={isRelatedTask(task)}
                        dimmed={relationId !== null && !isRelatedTask(task)}
                      />
                    )
                  })}
                  {autoDone.map(renderAutoRow)}
                </div>
              </>
            ) : null}

            {visibleTasks.length === 0 && visibleAutoItems.length === 0 ? (
              <div className="task-empty">{t('这一周还没有事项。先建一件最想推进的事。')}</div>
            ) : null}
          </div>
          <div className="list-foot">
            <button type="button" className="add-row" onClick={() => onOpenCreate('task')}>
              <Plus size={13} />
              {t('添加本周必做')}
            </button>
          </div>
        </Card>

        <div className="week-side">
          <Card>
            <div className="card-pad-sm">
              <div className="card-head">
                <div className="card-title">
                  <Target size={13} />
                  {t('关联季度任务')}
                </div>
                <button type="button" className="card-link" onClick={onOpenQuarter}>
                  {t('季度规划')} <ArrowRight size={10} />
                </button>
              </div>
              {sideObjectives.map((objective) => (
                <button
                  type="button"
                  className={cn('objective-mini', relationObjectiveId === objective.id && 'relation-target')}
                  key={objective.id}
                  data-relation-objective={objective.id}
                  onClick={onOpenQuarter}
                  onMouseEnter={() => focusObjective(objective.id)}
                  onMouseLeave={() => setRelationId(null)}
                >
                  <div className="objective-mini-top" style={catStyle(objective.categoryId)}>
                    <span className="dot" style={{ width: 5, height: 5, flexBasis: 5 }} />
                    <span className="obj-name">{objective.title}</span>
                    <span className="obj-pct">{objective.progress}%</span>
                  </div>
                  <Progress value={objective.progress} catId={objective.categoryId} />
                </button>
              ))}
              {sideObjectives.length === 0 ? (
                <div className="task-empty">{t('本周还没有关联季度任务。')}</div>
              ) : null}
            </div>
          </Card>

          <Card>
            <div className="card-pad-sm">
              <div className="card-head">
                <div className="card-title">
                  <FolderSimple size={13} />
                  {t('项目推进')}
                </div>
                <button type="button" className="card-link" onClick={onOpenProjects}>
                  {t('全部')} <ArrowRight size={10} />
                </button>
              </div>
              {sideProjects.map((project) => {
                const next = projectNext(project)
                return (
                  <div
                    className={cn('project-mini', relationProjectId === project.id && 'relation-target')}
                    key={project.id}
                    data-relation-project={project.id}
                    onMouseEnter={() => focusProject(project.id)}
                    onMouseLeave={() => setRelationId(null)}
                  >
                    <span className="project-mini-icon" style={catStyle(project.categoryId)}>
                      <FolderSimple size={14} />
                    </span>
                    <span className="project-mini-copy">
                      <b>{project.title}</b>
                      <span>
                        {next ? t('下一里程碑 {range}', { range: fmtRange(next.startDate ?? next.targetDate, next.endDate ?? next.targetDate) }) : t('全部里程碑已完成')}
                      </span>
                    </span>
                    <span className="mini-pct">{projectProgress(project)}%</span>
                  </div>
                )
              })}
              {sideProjects.length === 0 ? (
                <div className="task-empty">{t('本周事项还没有关联项目。')}</div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
      <RelationThreads
        taskId={relationSourceId}
        objectiveId={relationObjectiveId}
        projectId={relationProjectId}
      />
    </div>
  )
}
