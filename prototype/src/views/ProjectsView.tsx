import { useState } from 'react'
import {
  ArrowRight,
  FolderSimple,
  Plus,
  Target,
  X,
} from '@phosphor-icons/react'
import type { CategoryId, CreateMode, Project } from '../types'
import { CATEGORIES, getCategory } from '../data/mock'
import { cn, fmtDate, projectDoneCount, projectNext, projectProgress } from '../utils'
import { Card, EmptyState, Progress, catStyle } from '../components/ui'

interface ProjectsViewProps {
  projects: Project[]
  filter: CategoryId | 'all'
  onFilter: (filter: CategoryId | 'all') => void
  onOpenCreate: (mode: CreateMode) => void
  onToast: (message: string) => void
}

function projectStatus(project: Project) {
  if (project.status === 'risk') return { cls: 'risk', label: '有风险' }
  if (project.status === 'done') return { cls: 'done', label: '已完成' }
  return { cls: 'in_progress', label: '进行中' }
}

export function ProjectsView({ projects, filter, onFilter, onOpenCreate, onToast }: ProjectsViewProps) {
  const [selected, setSelected] = useState<Project | null>(null)
  const visibleProjects =
    filter === 'all' ? projects : projects.filter((project) => project.categoryId === filter)
  const showFeatured = filter === 'all' && visibleProjects.length > 0
  const featured = showFeatured ? visibleProjects[0] : null
  const rest = showFeatured ? visibleProjects.slice(1) : visibleProjects
  const featuredProgress = featured ? projectProgress(featured) : 0
  const featuredNext = featured ? projectNext(featured) : undefined

  return (
    <div className="view projects-view">
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <span className="tick" />
            Long-running projects · 2026
          </div>
          <h1 className="page-title">
            长期项目 <span className="light">与里程碑</span>
          </h1>
          <p className="page-sub">
            {projects.length} 个项目进行中 · 共{' '}
            {projects.reduce((sum, project) => sum + project.milestones.length, 0)} 个里程碑 · 可跨季度推进
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
              <div className="proj-card proj-card-featured" onClick={() => setSelected(featured)}>
                <div className="proj-top">
                  <div className="proj-cat" style={catStyle(featured.categoryId)}>
                    <span className="dot" />
                    {getCategory(featured.categoryId).name}
                    <span className="tag" style={{ marginLeft: 4 }}>Q4 主线</span>
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
                          className={milestone.status === 'done' ? 'done' : milestone.status === 'doing' ? 'doing' : ''}
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
                      查看项目详情
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
                <div className="proj-card" onClick={() => setSelected(project)}>
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
                  <div className="milestone-bar">
                    {project.milestones.map((milestone) => (
                      <i
                        key={milestone.id}
                        className={milestone.status === 'done' ? 'done' : milestone.status === 'doing' ? 'doing' : ''}
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

      {selected ? (
        <>
          <div className="scrim" onMouseDown={() => setSelected(null)} />
          <div className="modal-layer">
            <div className="modal-card" style={{ width: 720 }}>
              <div className="modal-inner">
                <div className="modal-head">
                  <div>
                    <div className="eyebrow" style={{ marginBottom: 6 }}>
                      <span className="tick" />
                      Project detail
                    </div>
                    <div className="modal-title">{selected.title}</div>
                    <div className="modal-sub">
                      {getCategory(selected.categoryId).name} · {selected.span} ·{' '}
                      {projectDoneCount(selected)}/{selected.milestones.length} 里程碑
                    </div>
                  </div>
                  <button type="button" className="modal-close" onClick={() => setSelected(null)}>
                    <X size={16} />
                  </button>
                </div>
                <div className="modal-body">
                  <p className="stat-foot" style={{ fontSize: 10.5, lineHeight: 1.7, color: 'var(--text-2)' }}>
                    {selected.description}
                  </p>
                  <div className="row" style={{ marginTop: 14, gap: 13 }}>
                    <div style={{ flex: 1 }}>
                      <div className="meter-row">
                        <Progress value={projectProgress(selected)} catId={selected.categoryId} className="lg" />
                        <span className="meter-pct">{projectProgress(selected)}%</span>
                      </div>
                    </div>
                    <span className={cn('status', projectStatus(selected).cls)}>
                      <span className="mini-dot" />
                      {projectStatus(selected).label}
                    </span>
                  </div>
                  <div className="settings-section">
                    <div className="settings-section-label">里程碑</div>
                    {selected.milestones.map((milestone) => (
                      <div
                        key={milestone.id}
                        className={cn(
                          'timeline-item',
                          milestone.status === 'done' && 'done',
                          milestone.status === 'doing' && 'doing',
                        )}
                        style={{ height: 32, borderBottom: '1px solid var(--line-soft)' }}
                      >
                        <span className="timeline-dot" />
                        <span className="tl-title">{milestone.title}</span>
                        <span className="tag">
                          {milestone.status === 'done' ? '已完成' : milestone.status === 'doing' ? '进行中' : '未开始'}
                        </span>
                        <span className="tl-date">{fmtDate(milestone.targetDate)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="modal-foot">
                  <button type="button" className="btn ghost" onClick={() => setSelected(null)}>
                    关闭
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => {
                      onToast('项目编辑与里程碑管理将在功能版接入')
                      setSelected(null)
                    }}
                  >
                    编辑项目
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
