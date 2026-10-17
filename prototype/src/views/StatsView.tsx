import {
  CalendarBlank,
  CaretLeft,
  ChartLineUp,
  Export,
  Target,
} from '@phosphor-icons/react'
import type { Objective, Project } from '../types'
import {
  CATEGORIES,
  MONTH_STATS,
  OBJECTIVES,
  QUARTER_STATS,
  TODAY,
  WEEK_STATS,
  dayInfo,
  quarterKey,
  quarterRange,
} from '../data/mock'
import {
  cn,
  dateISO,
  monthGrid,
  projectWorkItemsInQuarter,
  quarterLoad,
  sumDays,
} from '../utils'
import { Card, Donut, Progress, catStyle } from '../components/ui'

interface StatsViewProps {
  year: number
  quarter: number
  projects: Project[]
  onToast: (message: string) => void
  onBack: () => void
}

function monthWorkdays(year: number, month: number): number {
  const days = new Date(year, month, 0).getDate()
  let count = 0
  for (let day = 1; day <= days; day += 1) {
    if (dayInfo(dateISO(year, month, day)).isWorkday) count += 1
  }
  return count
}

export function StatsView({ year, quarter, projects, onToast, onBack }: StatsViewProps) {
  const quarterRows = [1, 2, 3, 4].map((q) => {
    const key = quarterKey(year, q)
    const stats = QUARTER_STATS[key]
    const objectives = OBJECTIVES[key] ?? []
    const available = stats ? stats.workdays - stats.leaveDays : 0
    const load = quarterLoad(objectives, projects, year, q, available)
    return { q, key, stats, objectives, available, allocated: load.committedDays, completion: load.completion, load }
  })
  const yearWorkdays = quarterRows.reduce((sum, row) => sum + (row.stats?.workdays ?? 0), 0)
  const yearAvailable = quarterRows.reduce((sum, row) => sum + row.available, 0)
  const currentRow = quarterRows[quarter - 1]
  const currentObjectives: Objective[] = OBJECTIVES[`${year}-Q${quarter}`] ?? []
  const currentProjectItems = projects.flatMap((project) =>
    projectWorkItemsInQuarter(project, year, quarter).map((item) => ({ item, project })),
  )
  const categorySegments = CATEGORIES.map((category) => ({
    category,
    days:
      sumDays(currentObjectives.filter((objective) => objective.categoryId === category.id)) +
      currentProjectItems
        .filter(({ project }) => project.categoryId === category.id)
        .reduce((sum, { item }) => sum + item.plannedDays, 0),
  })).filter((segment) => segment.days > 0)
  const firstMonth = quarter * 3 - 2
  const months = [firstMonth, firstMonth + 1, firstMonth + 2]
  const isQ4 = year === 2026 && quarter === 4
  const monthRows = isQ4
    ? MONTH_STATS
    : months.map((month) => {
        const workdays = monthWorkdays(year, month)
        return {
          month: `${month} 月`,
          workdays,
          leaveDays: 0,
          available: workdays,
          allocated: 0,
          completion: 0,
        }
      })

  return (
    <div className="view stats-view">
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <span className="tick" />
            分析 · {year}
          </div>
          <h1 className="page-title">
            统计与容量 <span className="light">· Q{quarter}</span>
          </h1>
          <p className="page-sub">
            {year} 年已录入 {yearWorkdays} 个工作日 · {yearAvailable} 人日可用（已扣请假）· 数据源：中国法定节假日 + 调休补班
          </p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn ghost" onClick={onBack}>
            <CaretLeft size={14} />
            返回季度规划
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => onToast('季度摘要已复制为 Markdown（原型模拟）')}
          >
            <Export size={14} />
            导出季度摘要
          </button>
        </div>
      </div>

      <div className="stats-top">
        <Card>
          <div className="stat">
            <span className="stat-label">年度工作日</span>
            <span className="stat-value num">
              {yearWorkdays}
              <small>天</small>
            </span>
            <span className="stat-foot">含调休补班，已扣法定假日</span>
          </div>
        </Card>
        <Card>
          <div className="stat">
            <span className="stat-label">年度可用人日</span>
            <span className="stat-value num">
              {yearAvailable}
              <small>人日</small>
            </span>
            <span className="stat-foot">按工作日计 · 请假 2 人日已扣</span>
          </div>
        </Card>
        <Card>
          <div className="stat">
            <span className="stat-label">Q{quarter} 已占用</span>
            <span className="stat-value num">
              {currentRow.allocated}
              <small>人日</small>
            </span>
            <span className="stat-foot">
              季度任务 + 项目本季排期 · 可用 {currentRow.available} 人日 · 占比{' '}
              {currentRow.available ? Math.round((currentRow.allocated / currentRow.available) * 100) : 0}%
            </span>
          </div>
        </Card>
        <Card>
          <div className="stat">
            <span className="stat-label">Q{quarter} 完成度</span>
            <span className="stat-value num">
              {currentRow.completion}
              <small>%</small>
            </span>
            <span className="stat-foot">按季度内事项加权 · {currentObjectives.length} 项季度任务 + Q4 项目排期</span>
          </div>
        </Card>
      </div>

      <div className="stats-grid">
        <Card>
          <div className="card-pad-lg">
            <div className="card-head">
              <div className="card-title">
                <CalendarBlank size={13} />
                工作日历
              </div>
              <span className="card-meta">
                {year} Q{quarter} · {quarterRange(year, quarter)}
              </span>
            </div>
            <div className="cal-heat">
              {months.map((month) => {
                const workdays = monthWorkdays(year, month)
                return (
                  <div key={month}>
                    <div className="heat-month-title">
                      <b>{month} 月</b>
                      <span>{workdays} 个工作日</span>
                    </div>
                    <div className="heat-dow">
                      {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
                        <span key={day}>{day}</span>
                      ))}
                    </div>
                    <div className="heat-grid">
                      {monthGrid(year, month).map((day, index) => {
                        if (day === null) return <span key={`blank-${index}`} className="heat-day blank" />
                        const iso = dateISO(year, month, day)
                        const info = dayInfo(iso)
                        return (
                          <span
                            key={iso}
                            className={cn(
                              'heat-day',
                              info.kind === 'workday' && 'work',
                              info.kind === 'holiday' && 'holiday',
                              info.kind === 'makeup' && 'makeup',
                              info.kind === 'leave' && 'leave',
                              iso === TODAY && 'today',
                            )}
                            title={`${iso}${info.label ? ` · ${info.label}` : ''}`}
                          >
                            {day}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="heat-legend">
              <span><i style={{ background: 'color-mix(in srgb, var(--text-1) 14%, transparent)' }} />工作日</span>
              <span><i style={{ background: 'var(--bad-soft)' }} />法定假日</span>
              <span><i style={{ background: 'var(--warn-soft)' }} />调休补班</span>
              <span><i style={{ background: 'var(--info-soft)' }} />请假 / 占用</span>
              <span><i style={{ border: '1px solid var(--text-1)' }} />今天</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="card-pad-lg">
            <div className="card-head">
              <div className="card-title">
                <Target size={13} />
                分类人日
              </div>
              <span className="card-meta">{currentRow.allocated} 人日</span>
            </div>
            <div className="stat-donut">
              <Donut
                segments={categorySegments.map((segment) => ({
                  value: segment.days,
                  color: `var(${segment.category.colorVar})`,
                }))}
                centerValue={`${currentRow.available ? Math.round((currentRow.allocated / currentRow.available) * 100) : 0}%`}
                centerLabel="容量占用"
              />
              <div className="donut-legend">
                {categorySegments.map((segment) => (
                  <div className="donut-row" key={segment.category.id}>
                    <span className="dot" style={catStyle(segment.category.id)} />
                    {segment.category.name}
                    <b>{segment.days} 人日</b>
                  </div>
                ))}
              </div>
            </div>
            <div className="cat-bars">
              {categorySegments.map((segment) => (
                <div className="cat-bar-row" key={segment.category.id} style={catStyle(segment.category.id)}>
                  <span className="cat-bar-name">{segment.category.name}</span>
                  <Progress value={(segment.days / Math.max(1, currentRow.allocated)) * 100} catId={segment.category.id} />
                  <span className="cat-bar-val">{Math.round((segment.days / Math.max(1, currentRow.allocated)) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className="table-card">
        <div className="card-pad-lg">
          <div className="card-head">
            <div className="card-title">
              <ChartLineUp size={13} />
              季度拆分
            </div>
            <span className="card-meta">口径：人日 · 可用 = 工作日 − 请假</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>季度</th>
                <th>工作日</th>
                <th>可用人日</th>
                <th>已占用人日</th>
                <th>容量占用</th>
                <th>完成度</th>
              </tr>
            </thead>
            <tbody>
              {quarterRows.map((row) => (
                <tr key={row.q} className={cn(row.q === quarter && 'active')}>
                  <td>Q{row.q}</td>
                  <td>{row.stats?.workdays ?? '—'}</td>
                  <td>{row.available || '—'}</td>
                  <td>{row.allocated}</td>
                  <td>
                    <div className="cell-bar">
                      <Progress value={row.available ? (row.allocated / row.available) * 100 : 0} />
                      <span className="cell-muted">
                        {row.available ? Math.round((row.allocated / row.available) * 100) : 0}%
                      </span>
                    </div>
                  </td>
                  <td>{row.completion}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="two-tables">
        <Card>
          <div className="card-pad-lg">
            <div className="card-head">
              <div className="card-title">月度拆分</div>
              <span className="card-meta">
                {isQ4 ? 'Q4 实际日历' : '按周末规则估算'}
              </span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>月份</th>
                  <th>工作日</th>
                  <th>可用人日</th>
                  <th>已分配人日</th>
                </tr>
              </thead>
              <tbody>
                {monthRows.map((row) => (
                  <tr key={row.month}>
                    <td>{row.month}</td>
                    <td>{row.workdays}</td>
                    <td>{row.available}</td>
                    <td>{row.allocated ? row.allocated : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="card-pad-lg">
            <div className="card-head">
              <div className="card-title">周拆分</div>
              <span className="card-meta">本周 W42</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>周</th>
                  <th>工作日</th>
                  <th>可用人日</th>
                  <th>已排人日</th>
                  <th>完成人日</th>
                </tr>
              </thead>
              <tbody>
                {(isQ4
                  ? WEEK_STATS
                  : [{ week: `W${Math.ceil(quarter * 13)}`, workdays: 5, available: 5, planned: 0, done: 0 }]
                ).map((row) => (
                  <tr key={row.week} className={cn(row.week === 'W42' && 'active')}>
                    <td>{row.week}</td>
                    <td>{row.workdays}</td>
                    <td>{row.available}</td>
                    <td>{row.planned ? row.planned : '—'}</td>
                    <td>{row.done ? row.done : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
