import { Clock, DotsThree, Target } from '@phosphor-icons/react'
import type { Objective, Project, WeekTask } from '../types'
import { getCategory } from '../data/mock'
import { cn, fmtDays, fmtDue, isOverdue } from '../utils'
import { catStyle } from './ui'
import { CheckBox } from './ui'

interface TaskRowProps {
  task: WeekTask
  project?: Project
  objective?: Objective
  onToggle: (id: string) => void
  onMenu?: (task: WeekTask) => void
}

function shortReminder(value?: string): string {
  if (!value) return ''
  return value.split('·')[0].trim()
}

export function TaskRow({ task, project, objective, onToggle, onMenu }: TaskRowProps) {
  const category = getCategory(task.categoryId)
  const overdue = isOverdue(task)
  const today = task.dueDate === '2026-10-17'
  const dueLabel = fmtDue(task.dueDate, task.dueTime)

  return (
    <div
      className={cn('task-row', task.done && 'done')}
      style={catStyle(task.categoryId)}
    >
      <CheckBox on={task.done} onToggle={() => onToggle(task.id)} label={task.title} />
      <div className="task-main">
        <div className="task-title">{task.title}</div>
        <div className="task-meta">
          <span className="meta-item">
            <span className="dot" style={{ width: 5, height: 5, flexBasis: 5 }} />
            <span className="cat-name">{category.name}</span>
          </span>
          {project ? (
            <span className="project-chip">
              <Target size={9} />
              {project.title}
            </span>
          ) : objective ? (
            <span className="project-chip">{objective.title}</span>
          ) : null}
          <span className={cn('meta-item due', overdue && !task.done && 'late')}>
            <Clock size={9} />
            {today ? '今天 ' : ''}
            {dueLabel}
          </span>
          {task.reminder ? (
            <span className="reminder-chip">
              <Clock size={8} />
              {shortReminder(task.reminder)}
            </span>
          ) : null}
        </div>
      </div>
      <div className={cn('task-hours', task.done && 'done')}>
        <b>{fmtDays(task.estimateDays)}</b>
        <span>人日</span>
      </div>
      <button
        type="button"
        className="task-menu"
        aria-label="更多操作"
        onClick={(event) => {
          event.stopPropagation()
          onMenu?.(task)
        }}
      >
        <DotsThree size={15} />
      </button>
    </div>
  )
}
