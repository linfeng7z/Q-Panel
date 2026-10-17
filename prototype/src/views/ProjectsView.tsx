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
import type { CategoryId, CreateMode, Project, ProjectWorkItem } from '../types'
import { CATEGORIES, CURRENT_WEEK_KEY, WEEKS, WEEK_ORDER, getCategory } from '../data/mock'
import {
  cn,
  fmtDateTime,
  fmtDays,
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

interface ProjectsViewProps {
  projects: Project[]
  year: number
  quarter: number
  filter: CategoryId | 'all'
  onFilter: (filter: CategoryId | 'all') => void
  onOpenCreate: (mode: CreateMode) => void
  onToast: (message: string) => void
  onChangeProjects: (projects: Project[]) => void
  onOpenWeek: (weekKey: string) => void
  onManageCategories: () => void
}

function projectStatus(project: Project, year: number, quarter: number) {
  if (project.status === 'risk' || projectCrossQuarter(project, year, quarter)) {
    return { cls: 'risk', label: '有风险' }
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
      />
    )
  }

  const visibleProjects =
    filter === 'all' ? projects : projects.filter((project) => project.categoryId === filter)
  const globalDays = projects.reduce((sum, project) => sum + project.plannedDays, 0)
  const crossCount = projects.filter((project) => projectCrossQuarter(project, year, quarter)).length
  const riskCount = projects.filter(
    (project) => project.status === 'risk' || projectCrossQuarter(project, year, quarter),
  ).length
  const quarterDays = projects.reduce(
    (sum, project) => sum + projectQuarterDays(project, year, quarter),
    0,
  )
  const sortedProjects = [...visibleProjects].sort((a, b) => {
    const rank = (project: Project) => {
      if (project.status === 'risk' || projectCrossQuarter(project, year, quarter)) return 0
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
              const status = projectStatus(project, year, quarter)
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
                      {next ? `下一里程碑 ${fmtDue(next.targetDate, next.targetTime)}` : '里程碑已完成'}
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
}: {
  project: Project
  year: number
  quarter: number
  onBack: () => void
  onChange: (project: Project) => void
  onOpenWeek: (weekKey: string) => void
  onToast: (message: string) => void
}) {
  const decomposed = projectDecomposedDays(project)
  const scheduled = projectScheduledDays(project)
  const quarterDays = projectQuarterDays(project, year, quarter)
  const quarterDoneDays = projectQuarterDoneDays(project, year, quarter)
  const doneItems = project.workItems.filter((item) => item.status === 'done')
  const doneDays = doneItems.reduce((sum, item) => sum + item.plannedDays, 0)
  const over = decomposed > project.plannedDays
  const crossQuarter = projectCrossQuarter(project, year, quarter)
  const atRisk = crossQuarter || project.status === 'risk'
  const quarterLabel = `Q${quarter}`
  const weekGroups = WEEK_ORDER.map((key) => ({
    key,
    meta: WEEKS[key],
    items: project.workItems.filter((item) => item.weekKey === key),
  })).filter((group) => group.items.length > 0)

  const projectWeekOptions = WEEK_ORDER.filter(
    (key) => WEEKS[key].end >= project.startDate && WEEKS[key].start <= project.endDate,
  )
  const weekOptions = projectWeekOptions.length > 0 ? projectWeekOptions : [CURRENT_WEEK_KEY]

  const updateItem = (id: string, patch: Partial<ProjectWorkItem>) => {
    onChange({
      ...project,
      workItems: project.workItems.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })
  }

  const addItem = () => {
    const item: ProjectWorkItem = {
      id: `wi-${Date.now()}`,
      title: '新工作项',
      plannedDays: 0.5,
      weekKey: CURRENT_WEEK_KEY,
      status: 'todo',
    }
    onChange({ ...project, workItems: [...project.workItems, item] })
    onToast('已添加工作项，按安排周自动进入本周安排')
  }

  const removeItem = (id: string) => {
    onChange({ ...project, workItems: project.workItems.filter((item) => item.id !== id) })
    onToast('已删除工作项，本周安排已同步')
  }

  return (
    <div className="view project-detail-view">
      <button type="button" className="back-link" onClick={onBack}>
        <CaretLeft size={13} />
        全局项目
      </button>

      <div className="page-head project-detail-head">
        <div>
                    <h1 className="page-title">{project.title}</h1>
          <p className="page-sub">
            {project.span} · 计划结束 {fmtDateTime(project.endDate, project.endTime)} · 全局项目 ·{' '}
            {projectDoneCount(project)}/{project.milestones.length}{' '}
            里程碑 · {project.workItems.length} 个工作项 · 本季度 {quarterLabel} 排期{' '}
            {fmtDays(quarterDays)} 人日
          </p>
          <div className="project-scope-line">
            {crossQuarter ? <span className="tag risk-tag">跨季度 · 有风险</span> : null}
            {project.reminder ? <span className="tag">提醒 {project.reminder}</span> : null}
            <span>
              全局规划 {project.plannedDays} 人日 · 本季度只看 {quarterLabel} 排期{' '}
              {fmtDays(quarterDays)} 人日
            </span>
          </div>
        </div>
        <div className="head-actions">
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

      {atRisk ? (
        <div className="warn-banner project-risk-banner">
          <WarningCircle size={14} style={{ flex: '0 0 14px', marginTop: 1 }} />
          <span>
            {crossQuarter
              ? `项目计划结束 ${fmtDateTime(project.endDate, project.endTime)}，超出当前季度；本季度只计 ${quarterLabel} 排期 ${fmtDays(quarterDays)} 人日，其余属于后续季度，已标记有风险。`
              : '项目状态为有风险，请关注当前季度排期与里程碑。'}
          </span>
        </div>
      ) : null}

      <div className="project-summary">
        <Card>
          <div className="project-summary-card">
            <span className="stat-label">全局总规划人日</span>
            <div className="hours-edit">
              <input
                className="hours-input num"
                type="number"
                min={0}
                step={0.25}
                value={project.plannedDays}
                onChange={(event) =>
                  onChange({ ...project, plannedDays: Math.max(0, Number(event.target.value) || 0) })
                }
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
            <span className="auto-label">设置安排周 → 自动进入本周安排</span>
          </div>
          <div className="workplan-note">
            工作项会按「安排周」自动出现在对应周的「项目自动排期」中，并计入当周已排人日；
            修改人日或周次会实时同步。
          </div>
          <div className="workplan-table">
            <div className="workplan-row workplan-head">
              <span>工作项</span>
              <span>规划人日</span>
              <span>安排周</span>
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
                <div className="hours-edit compact">
                  <input
                    className="hours-input num"
                    type="number"
                    min={0}
                    step={0.25}
                    value={item.plannedDays}
                    onChange={(event) =>
                      updateItem(item.id, {
                        plannedDays: Math.max(0, Number(event.target.value) || 0),
                      })
                    }
                  />
                  <span>人日</span>
                </div>
                <select
                  className="workitem-week"
                  value={item.weekKey}
                  onChange={(event) => updateItem(item.id, { weekKey: event.target.value })}
                >
                  {weekOptions.map((key) => (
                    <option value={key} key={key}>
                      {weekLabel(key)} · {WEEKS[key].range}
                    </option>
                  ))}
                </select>
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
                修改安排周后，对应本周安排会自动更新，不需要手动搬事项。
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
                    <span className="tl-title">{milestone.title}</span>
                    <span className="tl-date">{fmtDue(milestone.targetDate, milestone.targetTime)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
