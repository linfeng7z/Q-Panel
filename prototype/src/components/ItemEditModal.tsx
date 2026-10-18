import { useState } from 'react'
import { Check, X } from '@phosphor-icons/react'
import type { CategoryId, Objective, ReminderDefaults, WeekTask } from '../types'
import { CATEGORIES } from '../data/mock'
import { cn } from '../utils'
import { fmtRange, formatReminder, parseReminder, rangeDays } from '../utils'
import { DateRangeField } from './DateRangeField'
import { HourSelect } from './HourSelect'
import { catStyle } from './ui'

type EditableKind = 'objective' | 'task'
type EditableItem = Objective | WeekTask

interface ItemEditModalProps {
  kind: EditableKind
  item: EditableItem
  reminderDefaults: ReminderDefaults
  onClose: () => void
  onSave: (item: EditableItem) => void
}

function isObjective(item: EditableItem): item is Objective {
  return 'plannedDays' in item
}

export function ItemEditModal({ kind, item, reminderDefaults, onClose, onSave }: ItemEditModalProps) {
  const initialReminder = parseReminder(item.reminder, reminderDefaults)
  const [title, setTitle] = useState(item.title)
  const [categoryId, setCategoryId] = useState<CategoryId>(item.categoryId)
  const [days, setDays] = useState(String(isObjective(item) ? item.plannedDays : item.estimateDays))
  const [startDate, setStartDate] = useState(item.startDate ?? item.dueDate)
  const [endDate, setEndDate] = useState(item.endDate ?? item.dueDate)
  const [customReminder, setCustomReminder] = useState(Boolean(item.reminder))
  const [reminderOffset, setReminderOffset] = useState(initialReminder.offsetDays)
  const [reminderHour, setReminderHour] = useState(initialReminder.time)
  const valid = title.trim().length > 0 && endDate >= startDate

  const submit = () => {
    if (!valid) return
    const reminder = customReminder
      ? formatReminder(reminderOffset, reminderHour)
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
      onSave({ ...item, ...common, plannedDays: Math.max(0.25, Number(days) || 1) })
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
              <div className="field">
                <label>{kind === 'objective' ? '计划人日' : '预计人日'}</label>
                <input
                  className="input num"
                  type="number"
                  min={0.25}
                  step={0.25}
                  value={days}
                  onChange={(event) => setDays(event.target.value)}
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
                <div className="reminder-config">
                  <select
                    className="select"
                    value={customReminder ? 'custom' : 'default'}
                    onChange={(event) => setCustomReminder(event.target.value === 'custom')}
                    aria-label="提醒规则"
                  >
                    <option value="default">跟随全局 · {formatReminder(reminderDefaults.offsetDays, reminderDefaults.time)}</option>
                    <option value="custom">自定义提醒</option>
                  </select>
                  {customReminder ? (
                    <>
                      <select
                        className="select"
                        value={reminderOffset}
                        onChange={(event) => setReminderOffset(Number(event.target.value))}
                        aria-label="提前量"
                      >
                        <option value={0}>当天</option>
                        <option value={1}>提前 1 天</option>
                        <option value={2}>提前 2 天</option>
                        <option value={3}>提前 3 天</option>
                        <option value={7}>提前 1 周</option>
                      </select>
                      <HourSelect value={reminderHour} onChange={setReminderHour} label="提醒小时" />
                    </>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="modal-foot">
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
