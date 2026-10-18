import { Clock, PencilSimple, Target, Trash } from '@phosphor-icons/react'
import type { Objective, Project, WeekTask } from '../types'
import { TODAY, getCategory } from '../data/mock'
import { cn, fmtDays, fmtRange, isOverdue } from '../utils'
import { catStyle } from './ui'
import { t } from '../i18n'
import { CheckBox } from './ui'

interface TaskRowProps {
  task: WeekTask
  project?: Project
  objective?: Objective
  onToggle: (id: string) => void
  onEdit?: (task: WeekTask) => void
  onDelete?: (id: string) => void
  onHover?: (task: WeekTask | null) => void
  related?: boolean
  dimmed?: boolean
}

function shortReminder(value?: string): string {
  return value ?? ''
}

export function TaskRow({ task, project, objective, onToggle, onEdit, onDelete, onHover, related, dimmed }: TaskRowProps) {
  const category = getCategory(task.categoryId)
  const overdue = isOverdue(task)
  const today = task.dueDate === TODAY
  const dueLabel = fmtRange(task.startDate ?? task.dueDate, task.endDate ?? task.dueDate)

  return (
    <div
      className={cn('task-row', task.done && 'done', related && 'relation-related', dimmed && 'relation-dimmed')}
      style={catStyle(task.categoryId)}
      data-relation-task={task.id}
      onMouseEnter={() => onHover?.(task)}
      onMouseLeave={() => onHover?.(null)}
    >
      <CheckBox on={task.done} onToggle={() => onToggle(task.id)} label={task.title} />
      <div className="task-main">
        <div className="task-title">{task.title}</div>
        <div className="task-meta">
          <span className="meta-item">
            <span className="dot" style={{ width: 5, height: 5, flexBasis: 5 }} />
            <span className="cat-name">{t(category.name)}</span>
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
            {today ? `${t('今天')} ` : ''}
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
        <span>{t('人日')}</span>
      </div>
      {onEdit ? (
        <button
          type="button"
          className="task-edit-btn"
          onClick={() => onEdit(task)}
          title={t('编辑事项')}
          aria-label={`${t('编辑事项')} ${task.title}`}
        >
          <PencilSimple size={12} />
        </button>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          className="task-edit-btn task-delete-btn"
          onClick={() => onDelete(task.id)}
          title={t('删除事项')}
          aria-label={`${t('删除事项')} ${task.title}`}
        >
          <Trash size={12} />
        </button>
      ) : null}
    </div>
  )
}
