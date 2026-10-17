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
} from '@phosphor-icons/react'
import type { CategoryId, CreateMode, Project, ProjectWorkItem } from '../types'
import { CATEGORIES, WEEKS, WEEK_ORDER, getCategory } from '../data/mock'
import {
  cn,
  fmtDate,
  projectDecomposedHours,
  projectDoneCount,
  projectNext,
  projectProgress,
  projectScheduledHours,
} from '../utils'
import { Card, EmptyState, Progress, catStyle } from '../components/ui'

interface ProjectsViewProps {
  projects: Project[]
  filter: CategoryId | 'all'
  onFilter: (filter: CategoryId | 'all') => void
  onOpenCreate: (mode: CreateMode) => void
  onToast: (message: string) => void
  onChangeProjects: (projects: Project[]) => void
  onOpenWeek: (weekKey: string) => void
}

function projectStatus(project: Project) {
  if (project.status === 'risk') return { cls: 'risk', label: '有风险' }
  if (project.status === 'done') return { cls: 'done', label: '已完成' }
  return { cls: 'in_progress', label: '进行中' }
}

function weekLabel(key: string): string {
  return `第 ${WEEKS[key]?.num ?? '?'} 周`
}

export function ProjectsView({
  projects,
  filter,
  onFilter,
  onOpenCreate,
  onToast,
  onChangeProjects,
  onOpenWeek,
}: ProjectsViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? projects.find((project) => project.id === selectedId) : null

  useEffect(() => {
    document.querySelector('.view-scroll')?.scrollTo({ top: 0 })
  }, [selectedId])
  const visibleProjects =
    filter === 'all' ? projects : projects.filter((project) => project.categoryId === filter)
  const showFeatured = filter === 'all' && visibleProjects.length > 0
  const featured = showFeatured ? visibleProjects[0] : null
  const rest = showFeatured ? visibleProjects.slice(1) : visibleProjects
  const featuredProgress = featured ? projectProgress(featured) : 0
  const featuredNext = featured ? projectNext(featured) : undefined

  if (selected) {
    return (
      <ProjectDetail
        project={selected}
        onBack={() => setSelectedId(null)}
        onChange={(next) =>
          onChangeProjects(projects.map((project) => (project.id === next.id ? next : project)))
        }
        onOpenWeek={onOpenWeek}
        onToast={onToast}
      />
    )
  }

  return (
    <div className="view projects-view">
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <span className="tick" />
            Long-running projects · 2026
          </div>
          <h1 className="page-title">
            长期项目 <span className="light">与工作规划</span>
          </h1>
          <p className="page-sub">
            {projects.length} 个项目进行中 · 共{' '}
            {projects.reduce((sum, project) => sum + project.workItems.length, 0)} 个工作项 ·
            按安排周自动进入周计划 · 点击项目进入工作规划
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
              <span className="count">{count}</span>
            </button>
          )
        })}
        <span className="filter-spacer" />
        <span className="card-meta">进度 = 已完成里程碑 / 总里程碑（等权）</span>
      </div>

      {visibleProjects.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FolderSimple size={20} />}
            title="这个分类下还没有项目"
            sub="长期推进的事情放这里，周事项可以关联到项目里程碑。"
            action={
              <button type="button" className="btn primary sm" onClick={() => onOpenCreate('project')}>
                <Plus size={12} /> 新建项目
              </button>
            }
          />
        </Card>
      ) : (
        <div className="proj-grid">
          {featured ? (
            <Card className="proj-featured">
              <div className="proj-card proj-card-featured" onClick={() => setSelectedId(featured.id)}>
                <div className="proj-top">
                  <div className="proj-cat" style={catStyle(featured.categoryId)}>
                    <span className="dot" />
                    {getCategory(featured.categoryId).name}
                    <span className="tag" style={{ marginLeft: 4 }}>
                      季度任务
                    </span>
                  </div>
                  <span className={cn('status', projectStatus(featured).cls)}>
                    <span className="mini-dot" />
                    {projectStatus(featured).label}
                  </span>
                </div>
                <h3>{featured.title}</h3>
                <p className="proj-desc">{featured.description}</p>
                <div className="proj-meta">
                  <Target size={10} />
                  {featured.span}
                  <span className="sep" />
                  {projectDoneCount(featured)}/{featured.milestones.length} 里程碑
                  <span className="sep" />
                  下一里程碑 {featuredNext ? fmtDate(featuredNext.targetDate) : '—'}
                </div>
                <div className="proj-plan-line">
                  <span>
                    总规划 <b>{featured.plannedHours}h</b>
                  </span>
                  <span>
                    已拆解 <b>{projectDecomposedHours(featured)}h</b>
                  </span>
                  <span>{featured.workItems.length} 个工作项</span>
                  <span className="auto-label">自动排入周计划</span>
                </div>
                <div className="featured-body">
                  <div>
                    <div
                      className="milestone-bar"
                      style={{ height: 8, marginTop: 0 }}
                      title={`${featuredProgress}% 完成`}
                    >
                      {featured.milestones.map((milestone) => (
                        <i
                          key={milestone.id}
                          className={
                            milestone.status === 'done'
                              ? 'done'
                              : milestone.status === 'doing'
                                ? 'doing'
                                : ''
                          }
                        />
                      ))}
                    </div>
                    <div className="featured-timeline" style={{ marginTop: 15 }}>
                      {featured.milestones.map((milestone) => (
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
                          <span className="tl-date">{fmtDate(milestone.targetDate)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="featured-side">
                    <div className="featured-kpi">
                      <span>整体进度</span>
                      <b>
                        {featuredProgress}
                        <small>%</small>
                      </b>
                      <div style={{ marginTop: 8 }}>
                        <Progress value={featuredProgress} catId={featured.categoryId} />
                      </div>
                    </div>
                    <div className="featured-kpi">
                      <span>下一里程碑</span>
                      <b style={{ fontSize: 12, lineHeight: 1.4 }}>
                        {featuredNext?.title ?? '全部完成'}
                      </b>
                      <span style={{ marginTop: 4 }}>
                        {featuredNext ? `目标 ${fmtDate(featuredNext.targetDate)}` : ''}
                      </span>
                    </div>
                    <button type="button" className="btn sm" style={{ marginTop: 'auto' }}>
                      编辑项目规划
                      <ArrowRight size={11} />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          {rest.map((project) => {
            const progress = projectProgress(project)
            const next = projectNext(project)
            return (
              <Card key={project.id}>
                <div className="proj-card" onClick={() => setSelectedId(project.id)}>
                  <div className="proj-top">
                    <div className="proj-cat" style={catStyle(project.categoryId)}>
                      <span className="dot" />
                      {getCategory(project.categoryId).name}
                    </div>
                    <span className={cn('status', projectStatus(project).cls)}>
                      <span className="mini-dot" />
                      {projectStatus(project).label}
                    </span>
                  </div>
                  <h3>{project.title}</h3>
                  <p className="proj-desc">{project.description}</p>
                  <div className="proj-meta">
                    <Target size={10} />
                    {project.span}
                    <span className="sep" />
                    {projectDoneCount(project)}/{project.milestones.length} 里程碑
                  </div>
                  <div className="proj-plan-line">
                    <span>
                      规划 <b>{project.plannedHours}h</b>
                    </span>
                    <span>
                      已拆 <b>{projectDecomposedHours(project)}h</b>
                    </span>
                    <span>{project.workItems.length} 个工作项</span>
                  </div>
                  <div className="milestone-bar">
                    {project.milestones.map((milestone) => (
                      <i
                        key={milestone.id}
                        className={
                          milestone.status === 'done'
                            ? 'done'
                            : milestone.status === 'doing'
                              ? 'doing'
                              : ''
                        }
                      />
                    ))}
                  </div>
                  <div className="proj-foot">
                    <span>
                      进度 <b>{progress}%</b>
                    </span>
                    <span>{next ? `下一里程碑 ${fmtDate(next.targetDate)}` : '已完成'}</span>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ProjectDetail({
  project,
  onBack,
  onChange,
  onOpenWeek,
  onToast,
}: {
  project: Project
  onBack: () => void
  onChange: (project: Project) => void
  onOpenWeek: (weekKey: string) => void
  onToast: (message: string) => void
}) {
  const decomposed = projectDecomposedHours(project)
  const scheduled = projectScheduledHours(project)
  const doneItems = project.workItems.filter((item) => item.status === 'done')
  const doneHours = doneItems.reduce((sum, item) => sum + item.plannedHours, 0)
  const over = decomposed > project.plannedHours
  const weekGroups = WEEK_ORDER.map((key) => ({
    key,
    meta: WEEKS[key],
    items: project.workItems.filter((item) => item.weekKey === key),
  })).filter((group) => group.items.length > 0)

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
      plannedHours: 4,
      weekKey: '2026-W42',
      status: 'todo',
    }
    onChange({ ...project, workItems: [...project.workItems, item] })
    onToast('已添加工作项，按安排周自动进入周计划')
  }

  const removeItem = (id: string) => {
    onChange({ ...project, workItems: project.workItems.filter((item) => item.id !== id) })
    onToast('已删除工作项，周计划已同步')
  }

  return (
    <div className="view project-detail-view">
      <button type="button" className="back-link" onClick={onBack}>
        <CaretLeft size={13} />
        全部项目
      </button>

      <div className="page-head project-detail-head">
        <div>
          <div className="eyebrow">
            <span className="tick" />
            Project planning · {getCategory(project.categoryId).name}
          </div>
          <h1 className="page-title">{project.title}</h1>
          <p className="page-sub">
            {project.span} · {project.status === 'risk' ? '有风险' : '进行中'} ·{' '}
            {projectDoneCount(project)}/{project.milestones.length} 里程碑 ·{' '}
            {project.workItems.length} 个工作项
          </p>
        </div>
        <div className="head-actions">
          <button
            type="button"
            className="btn ghost"
            onClick={() => onOpenWeek(project.workItems[0]?.weekKey ?? '2026-W42')}
          >
            <CalendarDots size={14} />
            打开周计划
          </button>
        </div>
      </div>

      <div className="project-summary">
        <Card>
          <div className="project-summary-card">
            <span className="stat-label">总规划工时</span>
            <div className="hours-edit">
              <input
                className="hours-input num"
                type="number"
                min={0}
                value={project.plannedHours}
                onChange={(event) =>
                  onChange({ ...project, plannedHours: Math.max(0, Number(event.target.value) || 0) })
                }
              />
              <span>h</span>
            </div>
            <span className="stat-foot">项目跨季度总投入，可随时调整</span>
          </div>
        </Card>
        <Card>
          <div className="project-summary-card">
            <span className="stat-label">已拆解</span>
            <div className="project-summary-value">
              <b className="num">{decomposed}</b>
              <span>h</span>
            </div>
            <span className={cn('stat-foot', over && 'bad-text')}>
              {over
                ? `超出总规划 ${decomposed - project.plannedHours}h`
                : `剩余 ${Math.max(0, project.plannedHours - decomposed)}h 待拆解`}
            </span>
          </div>
        </Card>
        <Card>
          <div className="project-summary-card">
            <span className="stat-label">已排入周计划</span>
            <div className="project-summary-value">
              <b className="num">{scheduled}</b>
              <span>h</span>
            </div>
            <span className="stat-foot">覆盖 {weekGroups.length} 个周次，自动同步</span>
          </div>
        </Card>
        <Card>
          <div className="project-summary-card">
            <span className="stat-label">工作项完成</span>
            <div className="project-summary-value">
              <b className="num">{doneItems.length}</b>
              <span>/ {project.workItems.length}</span>
            </div>
            <span className="stat-foot">已完成 {doneHours}h / {decomposed}h</span>
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
            <span className="auto-label">设置安排周 → 自动进入周计划</span>
          </div>
          <div className="workplan-note">
            工作项会按「安排周」自动出现在对应周的「项目自动排期」中，并计入当周已排工时；
            修改工时或周次会实时同步。
          </div>
          <div className="workplan-table">
            <div className="workplan-row workplan-head">
              <span>工作项</span>
              <span>规划工时</span>
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
                    value={item.plannedHours}
                    onChange={(event) =>
                      updateItem(item.id, {
                        plannedHours: Math.max(0, Number(event.target.value) || 0),
                      })
                    }
                  />
                  <span>h</span>
                </div>
                <select
                  className="workitem-week"
                  value={item.weekKey}
                  onChange={(event) => updateItem(item.id, { weekKey: event.target.value })}
                >
                  {WEEK_ORDER.map((key) => (
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
                还没有工作项。先把项目拆成可排进周计划的小块。
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
                    {group.items.length} 项 · {group.items.reduce((sum, item) => sum + item.plannedHours, 0)}h
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
                修改安排周后，对应周计划会自动更新，不需要手动搬事项。
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
                    <span className="tl-date">{fmtDate(milestone.targetDate)}</span>
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
