import { useState } from 'react'
import {
  ArrowRight,
  CalendarDots,
  Clock,
  Flag,
  Moon,
  Plus,
  Target,
} from '@phosphor-icons/react'
import type { CreateMode, Objective, Project, ViewId, WeekTask } from '../types'
import { TODAY } from '../data/mock'
import {
  fmtDate,
  hoursOf,
  isOverdue,
  sumHours,
  timeGreeting,
  untilQuarterEnd,
} from '../utils'
import { TaskRow } from '../components/TaskRow'
import { Card, Progress, Ring, catStyle } from '../components/ui'

interface TodayViewProps {
  tasks: WeekTask[]
  objectives: Objective[]
  projects: Project[]
  onToggleTask: (id: string) => void
  onQuickAdd: (title: string) => void
  onOpenCreate: (mode: CreateMode) => void
  onNavigate: (view: ViewId) => void
}

export function TodayView({
  tasks,
  objectives,
  projects,
  onToggleTask,
  onQuickAdd,
  onOpenCreate,
  onNavigate,
}: TodayViewProps) {
  const [quick, setQuick] = useState('')
  const [, month, day] = TODAY.split('-')
  const todayTasks = tasks
    .filter((task) => task.dueDate === TODAY)
    .sort((a, b) => Number(a.done) - Number(b.done) || (a.dueTime ?? '').localeCompare(b.dueTime ?? ''))
  const overdue = tasks.filter(isOverdue)
  const weekTasks = tasks.filter((task) => task.weekKey === '2026-W42')
  const weekDone = weekTasks.filter((task) => task.done).length
  const weekPercent = weekTasks.length ? Math.round((weekDone / weekTasks.length) * 100) : 0
  const weekHours = hoursOf(weekTasks)
  const weekDoneHours = weekTasks.filter((task) => task.done).reduce((sum, task) => sum + task.estimateHours, 0)
  const allocated = sumHours(objectives)
  const available = 480
  const remaining = available - allocated
  const openToday = todayTasks.filter((task) => !task.done).length
  const nextMilestones = projects
    .flatMap((project) =>
      project.milestones
        .filter((milestone) => milestone.status !== 'done')
        .map((milestone) => ({ ...milestone, project })),
    )
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate))
    .slice(0, 3)

  const submitQuick = () => {
    const value = quick.trim()
    if (!value) return
    onQuickAdd(value)
    setQuick('')
  }

  return (
    <div className="view today-view">
      <div className="today-hero">
        <div>
          <div className="eyebrow">
            <span className="tick" />
            Saturday · 2026.10.17
          </div>
          <h1 className="today-date">
            {Number(month)}
            <span className="slash">/</span>
            {Number(day)}
            <span className="weekday">周六 · 休息日</span>
          </h1>
          <div className="today-tags">
            <span className="tag">
              <Moon size={10} /> 休息日
            </span>
            <span className="tag">第 42 周</span>
            <span className="tag">距离 Q4 结束 {untilQuarterEnd()} 天</span>
          </div>
          <p className="today-greet">
            {timeGreeting()}，<b>Huihui</b>。今天 {openToday} 条到期
            {overdue.length > 0 ? `、${overdue.length} 条逾期` : ''}，建议只处理关键项。
          </p>
        </div>
        <div className="today-mini-stats">
          <div className="today-mini-stat">
            <b className="num">
              {weekDone}
              <span className="faint" style={{ fontSize: 11 }}>
                /{weekTasks.length}
              </span>
            </b>
            <span>本周完成</span>
          </div>
          <div className="today-mini-stat">
            <b className="num">
              {remaining}
              <span className="faint" style={{ fontSize: 11 }}>
                h
              </span>
            </b>
            <span>季度剩余</span>
          </div>
          <div className="today-mini-stat">
            <b className="num">{openToday}</b>
            <span>今日待办</span>
          </div>
        </div>
      </div>

      <div className="today-grid">
        <div className="today-main">
          <Card className="task-card">
            <div className="list-head">
              <div className="list-title">
                今日清单
                <span className="list-count num">{todayTasks.length}</span>
              </div>
              <div className="list-actions">
                <button type="button" className="chip" onClick={() => onNavigate('week')}>
                  去本周
                  <ArrowRight size={10} />
                </button>
              </div>
            </div>
            <div className="quick-add">
              <Plus size={13} />
              <input
                value={quick}
                onChange={(event) => setQuick(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submitQuick()
                }}
                placeholder="添加今天要做的事，回车保存"
              />
              <span className="kbd">↵</span>
            </div>
            <div className="list-body">
              {overdue.length > 0 ? (
                <div className="overdue-strip">
                  <Clock size={12} />
                  上期有 <b>{overdue.length}</b> 条逾期未完成
                  <button type="button" className="btn sm" onClick={() => onNavigate('week')}>
                    处理
                  </button>
                </div>
              ) : null}
              <div className="task-rows">
                {todayTasks.map((task) => {
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
              {todayTasks.length === 0 ? (
                <div className="task-empty">今天没有到期事项。享受休息日，或者添加一件最重要的事。</div>
              ) : null}
            </div>
            <div className="list-foot">
              <button type="button" className="add-row" onClick={() => onOpenCreate('task')}>
                <Plus size={13} />
                添加今日事项
              </button>
            </div>
          </Card>

          <Card>
            <div className="today-week-strip">
              <div className="today-week-main">
                <span className="tag">
                  <CalendarDots size={10} /> 本周剩余
                </span>
                <b className="num">{weekTasks.filter((task) => !task.done).length} 项</b>
                <span>
                  已排 {weekHours}h · 完成 {weekDone}/{weekTasks.length}
                </span>
              </div>
              <button type="button" className="card-link" onClick={() => onNavigate('week')}>
                去周视图 <ArrowRight size={10} />
              </button>
            </div>
          </Card>
        </div>

        <div className="today-side">
          <Card>
            <div className="week-ring-card">
              <Ring value={weekPercent} />
              <div className="week-ring-copy">
                <b>本周进度</b>
                <p>
                  {weekDone}/{weekTasks.length} 项完成 · 已投入 {weekDoneHours}h / {weekHours}h
                </p>
                <div style={{ marginTop: 9 }}>
                  <Progress value={weekPercent} catId="appsec" />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="card-pad-sm">
              <div className="card-head">
                <div className="card-title">
                  <Target size={13} />
                  季度容量
                </div>
                <span className="card-meta num">{Math.round((allocated / available) * 100)}%</span>
              </div>
              <div className="capacity-stats" style={{ gridTemplateColumns: '1fr 1fr', rowGap: 12 }}>
                <div className="capacity-stat">
                  <div className="stat">
                    <span className="stat-label">已分配</span>
                    <span className="stat-value num" style={{ fontSize: 21 }}>
                      {allocated}
                      <small>h</small>
                    </span>
                  </div>
                </div>
                <div className="capacity-stat">
                  <div className="stat">
                    <span className="stat-label">剩余</span>
                    <span className="stat-value num" style={{ fontSize: 21 }}>
                      {remaining}
                      <small>h</small>
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 11 }}>
                <Progress value={(allocated / available) * 100} catId="appsec" />
              </div>
              <div className="stat-foot" style={{ marginTop: 7 }}>
                Q4 共 {available}h 可用 · 已扣 2 天年假
              </div>
            </div>
          </Card>

          <Card>
            <div className="card-pad-sm">
              <div className="card-head">
                <div className="card-title">
                  <Flag size={13} />
                  下一步里程碑
                </div>
                <button type="button" className="card-link" onClick={() => onNavigate('projects')}>
                  全部 <ArrowRight size={10} />
                </button>
              </div>
              {nextMilestones.map((milestone) => (
                <div className="next-milestone" key={milestone.id} onClick={() => onNavigate('projects')}>
                  <span className="next-milestone-icon" style={catStyle(milestone.project.categoryId)}>
                    <Flag size={13} />
                  </span>
                  <span className="next-milestone-copy">
                    <b>{milestone.title}</b>
                    <span>{milestone.project.title}</span>
                  </span>
                  <span className="date num">{fmtDate(milestone.targetDate)}</span>
                </div>
              ))}
            </div>
          </Card>

        </div>
      </div>
    </div>
  )
}
