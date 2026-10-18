import { useState } from 'react'
import { Check, Trash, X } from '@phosphor-icons/react'
import type { CategoryId, Objective, Project, ReminderDefaults, WeekTask } from '../types'
import { CATEGORIES } from '../data/mock'
import { cn } from '../utils'
import { fmtRange, formatReminder, formatReminderDate, rangeDays, resolveReminder } from '../utils'
import { DateRangeField } from './DateRangeField'
import { ReminderFields } from './ReminderFields'
import { SelectMenu } from './SelectMenu'
import { catStyle } from './ui'

type EditableKind = 'objective' | 'task'
type EditableItem = Objective | WeekTask

interface ItemEditModalProps {
  kind: EditableKind
  item: EditableItem
  reminderDefaults: ReminderDefaults
  projects: Project[]
  onClose: () => void
  onSave: (item: EditableItem) => void
  onDelete?: (id: string) => void
}

function isObjective(item: EditableItem): item is Objective {
  return 'plannedDays' in item
}

export function ItemEditModal({ kind, item, reminderDefaults, projects, onClose, onSave, onDelete }: ItemEditModalProps) {
  const initialReminder = resolveReminder(item.reminder, item.endDate ?? item.dueDate, reminderDefaults)
  const [title, setTitle] = useState(item.title)
  const [categoryId, setCategoryId] = useState<CategoryId>(item.categoryId)
  const [projectId, setProjectId] = useState(isObjective(item) ? item.projectId ?? '' : item.projectId ?? '')
  const [days, setDays] = useState(String(isObjective(item) ? item.plannedDays : item.estimateDays))
  const [startDate, setStartDate] = useState(item.startDate ?? item.dueDate)
  const [endDate, setEndDate] = useState(item.endDate ?? item.dueDate)
  const [customReminder, setCustomReminder] = useState(Boolean(item.reminder))
  const [reminderDate, setReminderDate] = useState(initialReminder.date)
  const [reminderHour, setReminderHour] = useState(initialReminder.time)
  const valid = title.trim().length > 0 && endDate >= startDate

  const submit = () => {
    if (!valid) return
    const reminder = customReminder
      ? formatReminderDate(reminderDate, reminderHour)
      : formatReminder(reminderDefaults.offsetDays, reminderDefaults.time)
    const common = {
      title: title.trim(),
      categoryId,
      startDate,
      endDate,
      dueDate: endDate,
      dueTime: '18:00',
      reminder,
    }
    if (kind === 'objective' && isObjective(item)) {
      onSave({ ...item, ...common, projectId: projectId || undefined, plannedDays: Math.max(0.25, Number(days) || 1) })
    } else if (!isObjective(item)) {
      onSave({ ...item, ...common, estimateDays: Math.max(0.25, Number(days) || 0.5) })
    }
    onClose()
  }

  return (
    <>
      <div className="scrim" onMouseDown={onClose} />
      <div
        className="modal-layer"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
      >
        <div className="modal-card" style={{ width: 560 }}>
          <div className="modal-inner">
            <div className="modal-head">
              <div>
                <div className="modal-title">{kind === 'objective' ? '编辑季度任务' : '编辑本周事项'}</div>
                <div className="modal-sub">{fmtRange(startDate, endDate)} · {rangeDays(startDate, endDate)} 天</div>
              </div>
              <button type="button" className="modal-close" onClick={onClose} aria-label="关闭">
                <X size={16} />
              </button>
            </div>
            <div className="create-body">
              <div className="field">
                <label>标题</label>
                <input className="input" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>
              <div className="field">
                <label>分类</label>
                <div className="category-picker">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      className={cn('chip cat', categoryId === category.id && 'active')}
                      style={catStyle(category.id)}
                      onClick={() => setCategoryId(category.id)}
                    >
                      <span className="dot" />
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
              {kind === 'objective' ? (
                <div className="field">
                  <label>关联项目</label>
                  <SelectMenu
                    value={projectId}
                    onChange={setProjectId}
                    options={[
                      { value: '', label: '不关联', description: '作为独立季度任务' },
                      ...projects.map((project) => ({
                        value: project.id,
                        label: project.title,
                        description: `${project.plannedDays} 人日`,
                      })),
                    ]}
                    label="关联项目"
                    menuWidth={300}
                  />
                  <div className="field-help">关联项目的工作项会计入此任务，容量不重复计算。</div>
                </div>
              ) : null}
              <div className="field">
                <label>{kind === 'objective' ? '计划人日' : '预计人日'}</label>
                <input
                  className="input num"
                  type="text"
                  inputMode="decimal"
                  placeholder={kind === 'objective' ? '15' : '0.5'}
                  value={days}
                  onChange={(event) =>
                    setDays(event.target.value.replace(/[^0-9.]/g, ''))
                  }
                  onBlur={() => {
                    if (days.trim() === '') setDays(kind === 'objective' ? '15' : '0.5')
                  }}
                />
              </div>
              <div className="field">
                <label>开展时间段（按天）</label>
                <DateRangeField startDate={startDate} endDate={endDate} onChange={(nextStart, nextEnd) => {
                  setStartDate(nextStart)
                  setEndDate(nextEnd)
                }} />
              </div>
              <div className="field reminder-field">
                <label>提醒</label>
                <ReminderFields
                  mode={customReminder ? 'custom' : 'default'}
                  date={reminderDate}
                  time={reminderHour}
                  defaults={reminderDefaults}
                  onChange={(next) => {
                    if (next.mode === 'custom' && !customReminder) {
                      setReminderHour(reminderDefaults.time)
                    }
                    setCustomReminder(next.mode === 'custom')
                    setReminderDate(next.date)
                    setReminderHour(next.time)
                  }}
                />
              </div>
            </div>
            <div className="modal-foot">
              {onDelete ? (
                <button
                  type="button"
                  className="btn ghost danger-text"
                  onClick={() => {
                    onDelete(item.id)
                    onClose()
                  }}
                >
                  <Trash size={12} /> 删除
                </button>
              ) : null}
              <div className="modal-foot-spacer" />
              <button type="button" className="btn ghost" onClick={onClose}>取消</button>
              <button type="button" className="btn primary" disabled={!valid} onClick={submit}>
                <Check size={12} /> 保存
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
