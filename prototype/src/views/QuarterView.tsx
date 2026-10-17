import { useState } from 'react'
import {
  ArrowRight,
  CalendarBlank,
  ChartLineUp,
  Clock,
  FolderSimple,
  Plus,
  SquaresFour,
  Target,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import type { CategoryId, CreateMode, Objective, Project } from '../types'
import {
  CATEGORIES,
  QUARTER_STATS,
  TODAY,
  dayInfo,
  getCategory,
  quarterKey,
  quarterRange,
} from '../data/mock'
import {
  dateISO,
  fmtDate,
  monthGrid,
  pct,
  sumHours,
  weightedCompletion,
} from '../utils'
import { cn } from '../utils'
import {
  Card,
  Donut,
  EmptyState,
  Progress,
  StatusChip,
  catStyle,
} from '../components/ui'

interface QuarterViewProps {
  year: number
  quarter: number
  objectives: Record<string, Objective[]>
  projects: Project[]
  filter: CategoryId | 'all'
  onFilter: (filter: CategoryId | 'all') => void
  onOpenCreate: (mode: CreateMode) => void
  onSelectPeriod: (year: number, quarter: number) => void
  onToast: (message: string) => void
  onOpenStats: () => void
}

function monthName(month: number): string {
  return `${month} 月`
}

export function QuarterView({
  year,
  quarter,
  objectives,
  projects,
  filter,
  onFilter,
  onOpenCreate,
  onSelectPeriod,
  onToast,
  onOpenStats,
}: QuarterViewProps) {
  const [yearOverview, setYearOverview] = useState(false)
  const [selectedObjective, setSelectedObjective] = useState<Objective | null>(null)
  const key = quarterKey(year, quarter)
  const stats = QUARTER_STATS[key]
  const objectivesOfPeriod = objectives[key] ?? []
  const filteredObjectives =
    filter === 'all'
      ? objectivesOfPeriod
      : objectivesOfPeriod.filter((objective) => objective.categoryId === filter)
  const allocated = sumHours(objectivesOfPeriod)
  const available = stats ? stats.workdays * 8 - stats.leaveHours : 0
  const remaining = available - allocated
  const usedPercent = available > 0 ? Math.round((allocated / available) * 100) : 0
  const completion = weightedCompletion(objectivesOfPeriod)
  const firstMonth = quarter * 3 - 2
  const months = [firstMonth, firstMonth + 1, firstMonth + 2]
  const segments = CATEGORIES.map((category) => ({
    category,
    hours: sumHours(objectivesOfPeriod.filter((objective) => objective.categoryId === category.id)),
  })).filter((segment) => segment.hours > 0)

  const currentKey = '2026-Q4'
  const yearQuarters = [1, 2, 3, 4].map((q) => {
    const quarterKeyValue = quarterKey(year, q)
    const quarterStats = QUARTER_STATS[quarterKeyValue]
    const quarterObjectives = objectives[quarterKeyValue] ?? []
    const quarterAvailable = quarterStats ? quarterStats.workdays * 8 - quarterStats.leaveHours : 0
    const quarterAllocated = sumHours(quarterObjectives)
    const quarterCompletion = weightedCompletion(quarterObjectives)
    const status =
      quarterCompletion >= 100
        ? '已完成'
        : quarterKeyValue > currentKey
          ? '未开始'
          : quarterKeyValue === currentKey
            ? '进行中'
            : '已归档'
    return {
      q,
      key: quarterKeyValue,
      stats: quarterStats,
      available: quarterAvailable,
      allocated: quarterAllocated,
      completion: quarterCompletion,
      status,
      count: quarterObjectives.length,
    }
  })

  const yearWorkdays = yearQuarters.reduce((sum, item) => sum + (item.stats?.workdays ?? 0), 0)
  const yearAvailable = yearQuarters.reduce((sum, item) => sum + item.available, 0)

  return (
    <div className="view quarter-view">
      <div className="page-head" style={{ marginBottom: yearOverview ? 18 : 14 }}>
        <div>
          <div className="eyebrow">
            <span className="tick" />
            {yearOverview ? `Year overview · ${year}` : `Home · Quarter tasks · ${year}`}
          </div>
          <h1 className="page-title">
            {yearOverview ? (
              <>
                {year} <span className="light">年度总览</span>
              </>
            ) : (
              <>
                <span className="q-num">Q{quarter}</span>
                <span className="light">季度任务</span>
              </>
            )}
          </h1>
          <p className="page-sub">
            {yearOverview
              ? `${year} 年 · 已录入 ${yearWorkdays} 个工作日 · ${yearAvailable}h 可用 · 点击季度卡片跳转`
              : `${quarterRange(year, quarter)} · ${stats ? `${stats.workdays} 个工作日 · ${available}h 可用` : '该季度尚未规划'}`}
          </p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn ghost" onClick={onOpenStats}>
            <ChartLineUp size={14} />
            统计
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => setYearOverview((value) => !value)}
          >
            <SquaresFour size={14} />
            {yearOverview ? '返回季度' : '年度总览'}
          </button>
          <button type="button" className="btn primary" onClick={() => onOpenCreate('objective')}>
            <span className="icon-circle">
              <Plus size={12} weight="bold" />
            </span>
            新建任务
          </button>
        </div>
      </div>

      {!yearOverview && stats?.estimated ? (
        <div className="warn-banner">
          <WarningCircle size={14} style={{ flex: '0 0 14px', marginTop: 1 }} />
          <span>{stats.note}</span>
        </div>
      ) : null}

      {yearOverview ? (
        <div className="year-overview">
          {yearQuarters.map((item) => (
            <button key={item.q} type="button" onClick={() => onSelectPeriod(year, item.q)} style={{ textAlign: 'left' }}>
              <Card className={cn('year-card', item.q === quarter && 'active')} innerClassName="year-inner">
                <div className="q-ghost">Q{item.q}</div>
                <div className="year-top">
                  <div>
                    <div className="year-q">Q{item.q}</div>
                    <div className="faint" style={{ fontSize: 8.5, marginTop: 2 }}>
                      {quarterRange(year, item.q)}
                    </div>
                  </div>
                  <span className="year-status">{item.status}</span>
                </div>
                <div className="year-stats">
                  <div className="year-stat">
                    <b className="num">{item.stats?.workdays ?? '—'}</b>
                    <span>工作日</span>
                  </div>
                  <div className="year-stat">
                    <b className="num">{item.available || '—'}</b>
                    <span>可用 h</span>
                  </div>
                  <div className="year-stat">
                    <b className="num">{item.allocated}</b>
                    <span>已分配 h</span>
                  </div>
                  <div className="year-stat">
                    <b className="num">{item.completion}%</b>
                    <span>完成度</span>
                  </div>
                </div>
                <div className="year-bar">
                  <Progress value={item.available ? (item.allocated / item.available) * 100 : 0} />
                </div>
                <div className="year-foot">
                  <span>{item.count} 项任务</span>
                  <span>{item.available ? pct((item.allocated / item.available) * 100) : '—'} 容量占用</span>
                </div>
              </Card>
            </button>
          ))}
        </div>
      ) : (
        <>
          {!stats ? (
            <Card>
              <EmptyState
                icon={<CalendarBlank size={20} />}
                title={`${year} Q${quarter} 还没有规划`}
                sub="先建一项季度任务，或者切换到其他季度看看。"
                action={
                  <button type="button" className="btn primary sm" onClick={() => onOpenCreate('objective')}>
                    <Plus size={12} /> 新建任务
                  </button>
                }
              />
            </Card>
          ) : (
            <>
              <Card className="capacity-card" innerClassName="capacity-inner">
                <div className="capacity-head">
                  <div className="capacity-title">
                    <Target size={14} />
                    容量与分配
                  </div>
                  <span className={cn('capacity-badge', usedPercent > 100 ? 'bad' : usedPercent > 85 ? 'warn' : '')}>
                    {usedPercent > 100 ? `超载 ${usedPercent - 100}%` : `已用 ${usedPercent}%`}
                  </span>
                </div>
                <div className="capacity-stats">
                  <div className="capacity-stat stat">
                    <span className="stat-label">可用工时</span>
                    <span className="stat-value num">
                      {available}
                      <small>h</small>
                    </span>
                    <span className="stat-foot">
                      {stats.workdays} 天 × 8h − {stats.leaveHours}h 请假
                    </span>
                  </div>
                  <div className="capacity-stat stat">
                    <span className="stat-label">已分配</span>
                    <span className="stat-value num">
                      {allocated}
                      <small>h</small>
                    </span>
                    <span className="stat-foot">{objectivesOfPeriod.length} 项任务</span>
                  </div>
                  <div className="capacity-stat stat">
                    <span className="stat-label">剩余</span>
                    <span className="stat-value num">
                      {remaining}
                      <small>h</small>
                    </span>
                    <span className="stat-foot">建议保留 10% 缓冲</span>
                  </div>
                  <div className="capacity-stat stat">
                    <span className="stat-label">完成度</span>
                    <span className="stat-value num">
                      {completion}
                      <small>%</small>
                    </span>
                    <span className="stat-foot">按计划工时加权</span>
                  </div>
                </div>
                <div className="capacity-bar-wrap">
                  <div className="stack" style={{ height: 10 }}>
                    {segments.map((segment) => (
                      <i
                        key={segment.category.id}
                        style={{
                          width: `${(segment.hours / Math.max(available, 1)) * 100}%`,
                          background: `var(${segment.category.colorVar})`,
                        }}
                        title={`${segment.category.name} ${segment.hours}h`}
                      />
                    ))}
                    <span className="remaining" />
                  </div>
                  <div className="capacity-legend">
                    {segments.map((segment) => (
                      <span key={segment.category.id}>
                        <i style={{ background: `var(${segment.category.colorVar})` }} />
                        {segment.category.name} {segment.hours}h
                      </span>
                    ))}
                    <span>
                      <i style={{ background: 'var(--surface-3)' }} />
                      剩余 {Math.max(0, remaining)}h
                    </span>
                  </div>
                </div>
                <div className="capacity-foot">
                  <span>
                    {stats.estimated
                      ? '官方放假安排尚未发布，当前按周末规则估算'
                      : `${year} Q${quarter} 已按官方节假日 + 调休补班计算`}
                    ；本季度剩余可排 <b>{Math.max(0, remaining)}h</b>
                  </span>
                  <span>
                    {stats.estimated
                      ? '数据源：待国务院公告 · 可手动编辑'
                      : `8h/天 · 数据源：国务院办公厅 ${year} 放假安排`}
                  </span>
                </div>
              </Card>

              <div className="quarter-grid">
                <Card>
                  <div className="list-head">
                    <div className="list-title">
                      季度任务
                      <span className="list-count num">{filteredObjectives.length}</span>
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
                        const count = objectivesOfPeriod.filter(
                          (objective) => objective.categoryId === category.id,
                        ).length
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
                    </div>
                  </div>
                  <div className="list-body">
                    <div className="obj-rows">
                      {filteredObjectives.map((objective) => {
                        const project = projects.find((item) => item.id === objective.projectId)
                        return (
                          <div
                            key={objective.id}
                            className="obj-row"
                            onClick={() => setSelectedObjective(objective)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') setSelectedObjective(objective)
                            }}
                          >
                            <span className="obj-grip">
                              <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                                <circle cx="2.5" cy="2.5" r="1" />
                                <circle cx="7.5" cy="2.5" r="1" />
                                <circle cx="2.5" cy="7" r="1" />
                                <circle cx="7.5" cy="7" r="1" />
                                <circle cx="2.5" cy="11.5" r="1" />
                                <circle cx="7.5" cy="11.5" r="1" />
                              </svg>
                            </span>
                            <div className="obj-main">
                              <div className="obj-title-row">
                                <span className="dot" style={catStyle(objective.categoryId)} />
                                <span className="obj-title">{objective.title}</span>
                                {project ? (
                                  <span className="project-chip">
                                    <FolderSimple size={9} />
                                    {project.title}
                                  </span>
                                ) : null}
                              </div>
                              <div className="obj-sub">
                                <StatusChip status={objective.status} />
                                <span>截止 {fmtDate(objective.dueDate)}</span>
                                <span className="sep" />
                                <span>
                                  {objective.reminder ? (
                                    <>
                                      <Clock size={9} style={{ marginRight: 3, verticalAlign: -1 }} />
                                      {objective.reminder}
                                    </>
                                  ) : (
                                    '无提醒'
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="obj-hours">
                              <b className="num">{objective.plannedHours}</b>
                              <span>h</span>
                            </div>
                            <div className="obj-progress">
                              <div className="meter-row">
                                <Progress value={objective.progress} catId={objective.categoryId} />
                                <span className="meter-pct">{objective.progress}%</span>
                              </div>
                            </div>
                            <span className="obj-menu">
                              <span className="faint">···</span>
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    {filteredObjectives.length === 0 ? (
                      <div className="task-empty">这个分类下还没有季度任务。</div>
                    ) : null}
                  </div>
                  <div className="list-foot">
                    <button type="button" className="add-row" onClick={() => onOpenCreate('objective')}>
                      <Plus size={13} />
                      添加季度任务
                    </button>
                  </div>
                </Card>

                <div className="quarter-side">
                  <Card>
                    <div className="card-pad-sm">
                      <div className="card-head">
                        <div className="card-title">
                          <CalendarBlank size={13} />
                          本季度日历
                        </div>
                        <span className="card-meta">
                          {stats.workdays} 个工作日{stats.estimated ? ' · 估算' : ''}
                        </span>
                      </div>
                      <div className="mini-months">
                        {months.map((month) => (
                          <div key={month}>
                            <div className="mini-month-title">{monthName(month)}</div>
                            <div className="mini-grid">
                              {monthGrid(year, month).map((day, index) => {
                                if (day === null) return <span key={`blank-${index}`} />
                                const iso = dateISO(year, month, day)
                                const info = dayInfo(iso)
                                return (
                                  <span
                                    key={iso}
                                    className={cn(
                                      'mini-day',
                                      info.kind === 'workday' && 'work',
                                      info.kind === 'holiday' && 'holiday',
                                      info.kind === 'makeup' && 'makeup',
                                      info.kind === 'leave' && 'leave',
                                      iso === TODAY && 'today',
                                    )}
                                    title={`${iso}${info.label ? ` · ${info.label}` : ''}`}
                                  />
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mini-legend">
                        <span><i style={{ background: 'color-mix(in srgb, var(--text-1) 14%, transparent)' }} />工作日</span>
                        <span><i style={{ background: 'var(--bad-soft)' }} />法定假</span>
                        <span><i style={{ background: 'var(--warn-soft)' }} />调休</span>
                        <span><i style={{ background: 'var(--info-soft)' }} />请假</span>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <div className="card-pad-sm">
                      <div className="card-head">
                        <div className="card-title">
                          <Target size={13} />
                          分类分配
                        </div>
                        <button type="button" className="card-link" onClick={() => onOpenStats()}>
                          明细 <ArrowRight size={10} />
                        </button>
                      </div>
                      <div className="donut-wrap">
                        <Donut
                          segments={segments.map((segment) => ({
                            value: segment.hours,
                            color: `var(${segment.category.colorVar})`,
                          }))}
                          centerValue={`${usedPercent}%`}
                          centerLabel="已分配"
                        />
                        <div className="donut-legend">
                          {segments.map((segment) => (
                            <div className="donut-row" key={segment.category.id}>
                              <span className="dot" style={catStyle(segment.category.id)} />
                              {segment.category.name}
                              <b>{segment.hours}h</b>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>

                </div>
              </div>
            </>
          )}
        </>
      )}

      {selectedObjective ? (
        <>
          <div className="scrim" onMouseDown={() => setSelectedObjective(null)} />
          <div className="modal-layer">
            <div className="modal-card" style={{ width: 540 }}>
              <div className="modal-inner">
                <div className="modal-head">
                  <div>
                    <div className="eyebrow" style={{ marginBottom: 6 }}>
                      <span className="tick" />
                      Quarter task
                    </div>
                    <div className="modal-title">{selectedObjective.title}</div>
                    <div className="modal-sub">
                      {getCategory(selectedObjective.categoryId).name} · Q{quarter} {year} · 截止{' '}
                      {fmtDate(selectedObjective.dueDate)}
                    </div>
                  </div>
                  <button type="button" className="modal-close" onClick={() => setSelectedObjective(null)}>
                    <X size={16} />
                  </button>
                </div>
                <div className="modal-body">
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <StatusChip status={selectedObjective.status} />
                    <span className="card-meta">{selectedObjective.plannedHours}h 计划工时</span>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <div className="meter-row">
                      <Progress value={selectedObjective.progress} catId={selectedObjective.categoryId} className="lg" />
                      <span className="meter-pct">{selectedObjective.progress}%</span>
                    </div>
                  </div>
                  <div className="settings-section">
                    <div className="settings-row">
                      <div className="settings-label">关联项目</div>
                      <div className="settings-value">
                        {projects.find((project) => project.id === selectedObjective.projectId)?.title ?? '未关联'}
                      </div>
                    </div>
                    <div className="settings-row">
                      <div className="settings-label">默认提醒</div>
                      <div className="settings-value">{selectedObjective.reminder ?? '无'}</div>
                    </div>
                    <div className="settings-row">
                      <div className="settings-label">状态</div>
                      <div className="settings-value">
                        <StatusChip status={selectedObjective.status} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-foot">
                  <button type="button" className="btn ghost" onClick={() => setSelectedObjective(null)}>
                    关闭
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => {
                      onToast('编辑表单将在功能版接入，原型先展示详情')
                      setSelectedObjective(null)
                    }}
                  >
                    编辑
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
