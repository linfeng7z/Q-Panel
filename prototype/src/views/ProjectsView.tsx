import { useEffect, useState } from 'react'
import {
  ArrowRight,
  CalendarDots,
  CaretLeft,
  Check,
  FolderSimple,
  Plus,
  Target,
  Trash,
  WarningCircle,
} from '@phosphor-icons/react'
import type { CategoryId, CreateMode, Milestone, Project, ProjectWorkItem } from '../types'
import { CATEGORIES, CURRENT_WEEK_KEY, WEEKS, WEEK_ORDER, getCategory } from '../data/mock'
import {
  cn,
  fmtDays,
  fmtRange,
  formatReminderDate,
  resolveReminder,
  fmtDue,
  projectCrossQuarter,
  projectDecomposedDays,
  projectDoneCount,
  projectNext,
  projectProgress,
  projectQuarterDays,
  projectQuarterDoneDays,
  projectScheduledDays,
} from '../utils'
import { Card, EmptyState, Progress, catStyle } from '../components/ui'
import { DateField } from '../components/DateField'
import { DateRangeField } from '../components/DateRangeField'
import { DayInput } from '../components/DayInput'
import { ReminderFields } from '../components/ReminderFields'

interface ProjectsViewProps {
  projects: Project[]
  year: number
  quarter: number
  filter: CategoryId | 'all'
  onFilter: (filter: CategoryId | 'all') => void
  onOpenCreate: (mode: CreateMode) => void
  onToast: (message: string) => void
  onChangeProjects: (projects: Project[]) => void
  onDeleteProject: (id: string) => void
  onOpenWeek: (weekKey: string) => void
  onManageCategories: () => void
}

function projectStatus(project: Project) {
  if (projectDecomposedDays(project) > project.plannedDays) {
    return { cls: 'risk', label: '有延期风险' }
  }
  if (project.status === 'done') return { cls: 'done', label: '已完成' }
  return { cls: 'in_progress', label: '进行中' }
}

function weekLabel(key: string): string {
  return `第 ${WEEKS[key]?.num ?? '?'} 周`
}

export function ProjectsView({
  projects,
  year,
  quarter,
  filter,
  onFilter,
  onOpenCreate,
  onToast,
  onChangeProjects,
  onDeleteProject,
  onOpenWeek,
  onManageCategories,
}: ProjectsViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? projects.find((project) => project.id === selectedId) : null

  useEffect(() => {
    document.querySelector('.view-scroll')?.scrollTo({ top: 0 })
  }, [selectedId])

  if (selected) {
    return (
      <ProjectDetail
        project={selected}
        year={year}
        quarter={quarter}
        onBack={() => setSelectedId(null)}
        onChange={(next) =>
          onChangeProjects(projects.map((project) => (project.id === next.id ? next : project)))
        }
        onOpenWeek={onOpenWeek}
        onToast={onToast}
        onDeleteProject={onDeleteProject}
      />
    )
  }

  const visibleProjects =
    filter === 'all' ? projects : projects.filter((project) => project.categoryId === filter)
  const globalDays = projects.reduce((sum, project) => sum + project.plannedDays, 0)
  const crossCount = projects.filter((project) => projectCrossQuarter(project, year, quarter)).length
  const riskCount = projects.filter(
    (project) => projectDecomposedDays(project) > project.plannedDays,
  ).length
  const quarterDays = projects.reduce(
    (sum, project) => sum + projectQuarterDays(project, year, quarter),
    0,
  )
  const sortedProjects = [...visibleProjects].sort((a, b) => {
    const rank = (project: Project) => {
      if (projectDecomposedDays(project) > project.plannedDays) return 0
      return 1
    }
    return rank(a) - rank(b)
  })

  return (
    <div className="view projects-view">
      <div className="page-head">
        <div>
                    <h1 className="page-title">全局项目</h1>
          <p className="page-sub">
            跨季度项目按全局维度管理 · 本季度只统计 Q{quarter} 排期
          </p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn primary" onClick={() => onOpenCreate('project')}>
            <span className="icon-circle">
              <Plus size={12} weight="bold" />
            </span>
            新建项目
          </button>
        </div>
      </div>

      <div className="global-scope-strip">
        <div>
          <span>全局项目</span>
          <b>{projects.length}</b>
        </div>
        <div>
          <span>全局规划</span>
          <b>{fmtDays(globalDays)} 人日</b>
        </div>
        <div>
          <span>跨季度</span>
          <b>{crossCount}</b>
        </div>
        <div>
          <span>有风险</span>
          <b className="bad-text">{riskCount}</b>
        </div>
        <div>
          <span>本季排期</span>
          <b>{fmtDays(quarterDays)} 人日</b>
        </div>
        <span className="scope-strip-note">本季度只计 Q{quarter} 排期</span>
      </div>

      <div className="filter-row">
        <span className="faint" style={{ fontSize: 9.5, letterSpacing: '0.08em' }}>
          分类
        </span>
        <button
          type="button"
          className={cn('chip', filter === 'all' && 'active')}
          onClick={() => onFilter('all')}
        >
          全部
        </button>
        {CATEGORIES.map((category) => {
          const count = projects.filter((project) => project.categoryId === category.id).length
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
              <span className="count">{count}</span>
            </button>
          )
        })}
        <button type="button" className="chip add" onClick={onManageCategories}>
          <Plus size={10} />
          分类
        </button>
        <span className="filter-spacer" />
        <span className="card-meta">按风险优先 · 点击项目查看工作规划</span>
      </div>

      {visibleProjects.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FolderSimple size={20} />}
            title="这个分类下还没有项目"
            sub="项目是全局维度，跨季度推进；可以按分类筛选。"
            action={
              <button type="button" className="btn primary sm" onClick={() => onOpenCreate('project')}>
                <Plus size={12} /> 新建项目
              </button>
            }
          />
        </Card>
      ) : (
        <Card className="project-overview-card" innerClassName="project-overview-inner">
          <div className="list-head">
            <div className="list-title">
              项目概览
              <span className="list-count num">{sortedProjects.length}</span>
            </div>
            <span className="card-meta">全局规划 / 本季排期 / 进度</span>
          </div>
          <div className="project-overview-head">
            <span>项目</span>
            <div className="project-overview-head-metrics">
              <span>全局规划</span>
              <span>本季排期</span>
              <span>已拆解</span>
              <span>里程碑</span>
            </div>
            <span>进度</span>
            <span />
          </div>
          <div className="project-overview-rows">
            {sortedProjects.map((project) => {
              const status = projectStatus(project)
              const progress = projectProgress(project)
              const next = projectNext(project)
              const cross = projectCrossQuarter(project, year, quarter)
              return (
                <button
                  key={project.id}
                  type="button"
                  className={cn('project-overview-row', status.cls === 'risk' && 'ring-risk')}
                  onClick={() => setSelectedId(project.id)}
                >
                  <div className="project-row-main">
                    <div className="project-row-title">
                      <span className="dot" style={catStyle(project.categoryId)} />
                      <b>{project.title}</b>
                      {cross ? <span className="tag risk-tag">跨季度</span> : null}
                      <span className={cn('status', status.cls)}>
                        {status.cls === 'risk' ? (
                          <WarningCircle size={10} weight="fill" className="risk-icon" />
                        ) : (
                          <span className="mini-dot" />
                        )}
                        {status.label}
                      </span>
                    </div>
                    <div className="project-row-desc">
                      {getCategory(project.categoryId).name} · {project.span} ·{' '}
                      {next ? `下一里程碑 ${fmtRange(next.startDate ?? next.targetDate, next.endDate ?? next.targetDate)}` : '里程碑已完成'}
                    </div>
                  </div>
                  <div className="project-row-metrics">
                    <div>
                      <b>{fmtDays(project.plannedDays)} 人日</b>
                    </div>
                    <div>
                      <b>{fmtDays(projectQuarterDays(project, year, quarter))} 人日</b>
                    </div>
                    <div>
                      <b>{fmtDays(projectDecomposedDays(project))} 人日</b>
                    </div>
                    <div>
                      <b>
                        {projectDoneCount(project)}/{project.milestones.length}
                      </b>
                    </div>
                  </div>
                  <div className="project-row-progress">
                    <div className="project-row-progress-top">
                      <span>进度</span>
                      <b>{progress}%</b>
                    </div>
                    <Progress value={progress} catId={project.categoryId} />
                  </div>
                  <ArrowRight size={13} className="project-row-arrow" />
                </button>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

function ProjectDetail({
  project,
  year,
  quarter,
  onBack,
  onChange,
  onOpenWeek,
  onToast,
  onDeleteProject,
}: {
  project: Project
  year: number
  quarter: number
  onBack: () => void
  onChange: (project: Project) => void
  onOpenWeek: (weekKey: string) => void
  onToast: (message: string) => void
  onDeleteProject: (id: string) => void
}) {
  const reminderRule = resolveReminder(project.reminder, project.endDate, { offsetDays: 2, time: '09:00' })
  const decomposed = projectDecomposedDays(project)
  const scheduled = projectScheduledDays(project)
  const quarterDays = projectQuarterDays(project, year, quarter)
  const quarterDoneDays = projectQuarterDoneDays(project, year, quarter)
  const doneItems = project.workItems.filter((item) => item.status === 'done')
  const doneDays = doneItems.reduce((sum, item) => sum + item.plannedDays, 0)
  const over = decomposed > project.plannedDays
  const crossQuarter = projectCrossQuarter(project, year, quarter)
  const quarterLabel = `Q${quarter}`
  const weekGroups = WEEK_ORDER.map((key) => ({
    key,
    meta: WEEKS[key],
    items: project.workItems.filter((item) => item.weekKey === key),
  })).filter((group) => group.items.length > 0)


  const updateItem = (id: string, patch: Partial<ProjectWorkItem>) => {
    onChange({
      ...project,
      workItems: project.workItems.map((item) => {
        if (item.id !== id) return item
        const next = { ...item, ...patch }
        if (patch.startDate) {
          const week = WEEK_ORDER.find((key) => patch.startDate! >= WEEKS[key].start && patch.startDate! <= WEEKS[key].end)
          if (week) next.weekKey = week
        }
        if (patch.weekKey) {
          next.startDate = WEEKS[patch.weekKey].start
          next.endDate = WEEKS[patch.weekKey].end
        }
        return next
      }),
    })
  }

  const addItem = () => {
    const item: ProjectWorkItem = {
      id: `wi-${Date.now()}`,
      title: '新工作项',
      plannedDays: 0.5,
      weekKey: CURRENT_WEEK_KEY,
      startDate: WEEKS[CURRENT_WEEK_KEY].start,
      endDate: WEEKS[CURRENT_WEEK_KEY].end,
      status: 'todo',
    }
    onChange({ ...project, workItems: [...project.workItems, item] })
    onToast('已添加工作项，按时间段自动进入本周安排')
  }

  const removeItem = (id: string) => {
    onChange({ ...project, workItems: project.workItems.filter((item) => item.id !== id) })
    onToast('已删除工作项，本周安排已同步')
  }

  const updateMilestone = (id: string, patch: Partial<Milestone>) => {
    onChange({
      ...project,
      milestones: project.milestones.map((milestone) =>
        milestone.id === id ? { ...milestone, ...patch } : milestone,
      ),
    })
  }

  const addMilestone = () => {
    const stamp = Date.now()
    onChange({
      ...project,
      milestones: [
        ...project.milestones,
        {
          id: `m-${stamp}`,
          title: '新里程碑',
          targetDate: project.endDate,
          startDate: project.startDate,
          endDate: project.endDate,
          status: 'todo',
        },
      ],
    })
    onToast('已添加里程碑')
  }

  const removeMilestone = (id: string) => {
    onChange({ ...project, milestones: project.milestones.filter((milestone) => milestone.id !== id) })
    onToast('已删除里程碑')
  }

  return (
    <div className="view project-detail-view">
      <button type="button" className="back-link" onClick={onBack}>
        <CaretLeft size={13} />
        全局项目
      </button>

      <div className="page-head project-detail-head">
        <div className="project-head-copy">
          <div className="project-title-row">
            <h1 className="page-title">{project.title}</h1>
            {crossQuarter ? <span className="tag risk-tag">跨季度</span> : null}
            {over ? <span className="tag risk-tag">有延期风险</span> : null}
          </div>
          <p className="project-subline">
            本季 {quarterLabel} 排期 {fmtDays(quarterDays)} 人日 · {project.workItems.length} 个工作项 ·{' '}
            {projectDoneCount(project)}/{project.milestones.length} 里程碑
          </p>
          <div className="project-plan-strip">
            <div className="project-plan-main">
              <span className="project-plan-label">项目周期</span>
              <DateRangeField
                startDate={project.startDate}
                endDate={project.endDate}
                label="项目开展时间段"
                onChange={(nextStart, nextEnd) =>
                  onChange({
                    ...project,
                    startDate: nextStart,
                    endDate: nextEnd,
                    span: `${nextStart.slice(0, 4)}.${nextStart.slice(5, 7)} – ${nextEnd.slice(0, 4)}.${nextEnd.slice(5, 7)}`,
                  })
                }
              />
            </div>
            <span className="project-plan-divider" />
            <div className="project-plan-reminder">
              <span className="project-plan-label">结束提醒</span>
              <ReminderFields
                hideMode
                compact
                mode="custom"
                date={reminderRule.date}
                time={reminderRule.time}
                defaults={{ offsetDays: 2, time: '09:00' }}
                onChange={(next) =>
                  onChange({ ...project, reminder: formatReminderDate(next.date, next.time) })
                }
              />
            </div>
          </div>
        </div>
        <div className="head-actions">
          <button
            type="button"
            className="btn ghost danger-text"
            onClick={() => {
              onDeleteProject(project.id)
              onBack()
            }}
          >
            <Trash size={14} />
            删除项目
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => onOpenWeek(project.workItems[0]?.weekKey ?? CURRENT_WEEK_KEY)}
          >
            <CalendarDots size={14} />
            打开本周安排
          </button>
        </div>
      </div>

      <div className="project-summary">
        <Card>
          <div className="project-summary-card">
            <span className="stat-label">全局总规划人日</span>
            <div className="hours-edit">
              <DayInput
                className="hours-input num"
                value={project.plannedDays}
                onChange={(plannedDays) => onChange({ ...project, plannedDays })}
                placeholder="15"
                min={0}
                fallback={15}
                label="全局总规划人日"
              />
              <span>人日</span>
            </div>
            <span className="stat-foot">项目全局维度总投入，可随时调整</span>
          </div>
        </Card>
        <Card>
          <div className="project-summary-card">
            <span className="stat-label">全局已拆解</span>
            <div className="project-summary-value">
              <b className="num">{fmtDays(decomposed)}</b>
              <span>人日</span>
            </div>
            <span className={cn('stat-foot', over && 'bad-text')}>
              {over
                ? `超出总规划 ${fmtDays(decomposed - project.plannedDays)} 人日`
                : `剩余 ${fmtDays(Math.max(0, project.plannedDays - decomposed))} 人日待拆解`}
            </span>
          </div>
        </Card>
        <Card>
          <div className="project-summary-card">
            <span className="stat-label">本季度排期</span>
            <div className="project-summary-value">
              <b className="num">{fmtDays(quarterDays)}</b>
              <span>人日 / {quarterLabel}</span>
            </div>
            <span className="stat-foot">
              季度内已完成 {fmtDays(quarterDoneDays)} 人日 · 全局已排 {fmtDays(scheduled)} 人日
            </span>
          </div>
        </Card>
        <Card>
          <div className="project-summary-card">
            <span className="stat-label">全局工作项完成</span>
            <div className="project-summary-value">
              <b className="num">{doneItems.length}</b>
              <span>/ {project.workItems.length}</span>
            </div>
            <span className="stat-foot">已完成 {fmtDays(doneDays)} / {fmtDays(decomposed)} 人日</span>
          </div>
        </Card>
      </div>

      <div className="project-detail-grid">
        <Card>
          <div className="list-head">
            <div className="list-title">
              工作规划
              <span className="list-count num">{project.workItems.length}</span>
            </div>
            <span className="auto-label">设置时间段 → 自动进入本周安排</span>
          </div>
          <div className="workplan-note">
            设置工作项的时间段后，会按开始日自动归入对应周并进入本周安排，计入当周已排人日。
          </div>
          <div className="workplan-table">
            <div className="workplan-row workplan-head">
              <span>工作项</span>
              <span>排期日历</span>
              <span>规划人日</span>
              <span>状态</span>
              <span />
            </div>
            {project.workItems.map((item) => (
              <div className="workplan-row" key={item.id}>
                <input
                  className="workitem-title"
                  value={item.title}
                  onChange={(event) => updateItem(item.id, { title: event.target.value })}
                />
                <div className="workitem-calendar">
                  <DateRangeField
                    compact
                    startDate={item.startDate ?? WEEKS[item.weekKey]?.start ?? project.startDate}
                    endDate={item.endDate ?? WEEKS[item.weekKey]?.end ?? project.endDate}
                    onChange={(nextStart, nextEnd) => updateItem(item.id, { startDate: nextStart, endDate: nextEnd })}
                    label="工作项开展时间段"
                  />
                </div>
                <div className="hours-edit compact">
                  <DayInput
                    className="hours-input num"
                    value={item.plannedDays}
                    onChange={(plannedDays) => updateItem(item.id, { plannedDays })}
                    placeholder="0.5"
                    min={0}
                    fallback={0.5}
                    label={`${item.title}规划人日`}
                  />
                  <span>人日</span>
                </div>
                <button
                  type="button"
                  className={cn('workitem-status', item.status === 'done' && 'done')}
                  onClick={() =>
                    updateItem(item.id, {
                      status: item.status === 'done' ? 'todo' : 'done',
                    })
                  }
                >
                  {item.status === 'done' ? <Check size={10} weight="bold" /> : null}
                  {item.status === 'done' ? '已完成' : '待办'}
                </button>
                <button
                  type="button"
                  className="workitem-del"
                  onClick={() => removeItem(item.id)}
                  aria-label={`删除 ${item.title}`}
                >
                  <Trash size={13} />
                </button>
              </div>
            ))}
            {project.workItems.length === 0 ? (
              <div className="task-empty" style={{ padding: '18px 10px' }}>
                还没有工作项。先把项目拆成可排进本周安排的小块。
              </div>
            ) : null}
          </div>
          <div className="list-foot">
            <button type="button" className="add-row" onClick={addItem}>
              <Plus size={13} />
              添加工作项
            </button>
          </div>
        </Card>

        <div className="project-detail-side">
          <Card>
            <div className="card-pad-sm">
              <div className="card-head">
                <div className="card-title">
                  <CalendarDots size={13} />
                  周排期
                </div>
                <span className="card-meta">自动同步</span>
              </div>
              {weekGroups.map((group) => (
                <button
                  key={group.key}
                  type="button"
                  className="week-plan-row"
                  onClick={() => onOpenWeek(group.key)}
                >
                  <span className="week-plan-copy">
                    <b>{weekLabel(group.key)}</b>
                    <span>{group.meta.range}</span>
                  </span>
                  <span className="week-plan-meta">
                    {group.items.length} 项 · {fmtDays(group.items.reduce((sum, item) => sum + item.plannedDays, 0))} 人日
                  </span>
                  <ArrowRight size={10} />
                </button>
              ))}
              {weekGroups.length === 0 ? (
                <div className="task-empty" style={{ padding: '12px 4px' }}>
                  还没有安排到具体周。
                </div>
              ) : null}
              <div className="auto-note">
                修改时间段后，对应本周安排会自动更新，不需要手动搬事项。
              </div>
            </div>
          </Card>

          <Card>
            <div className="card-pad-sm">
              <div className="card-head">
                <div className="card-title">
                  <Target size={13} />
                  里程碑
                </div>
                <span className="card-meta">
                  {projectDoneCount(project)}/{project.milestones.length}
                </span>
              </div>
              <div className="project-progress-row">
                <Progress value={projectProgress(project)} catId={project.categoryId} className="lg" />
                <span className="meter-pct">{projectProgress(project)}%</span>
              </div>
              <div className="timeline" style={{ marginTop: 12 }}>
                {project.milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className={cn(
                      'timeline-item',
                      milestone.status === 'done' && 'done',
                      milestone.status === 'doing' && 'doing',
                    )}
                  >
                    <span className="timeline-dot" />
                    <input
                      className="tl-title-input"
                      value={milestone.title}
                      onChange={(event) => updateMilestone(milestone.id, { title: event.target.value })}
                      aria-label="里程碑名称"
                    />
                    <div className="milestone-date-edit">
                      <DateField
                        value={milestone.targetDate}
                        onChange={(date) =>
                          updateMilestone(milestone.id, {
                            targetDate: date,
                            startDate: date,
                            endDate: date,
                          })
                        }
                        label={`${milestone.title}日期`}
                      />
                    </div>
                    <button
                      type="button"
                      className="milestone-del"
                      onClick={() => removeMilestone(milestone.id)}
                      aria-label={`删除里程碑 ${milestone.title}`}
                      title="删除里程碑"
                    >
                      <Trash size={11} />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="add-row milestone-add" onClick={addMilestone}>
                <Plus size={12} />
                添加里程碑
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
