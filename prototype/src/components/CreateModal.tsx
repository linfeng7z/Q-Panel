import { useState } from 'react'
import { Check, Clock, Plus, X } from '@phosphor-icons/react'
import type { Category, CategoryId, CreateMode, ReminderDefaults } from '../types'
import { CATEGORIES, CATEGORY_COLORS, TODAY } from '../data/mock'
import { catStyle } from './ui'
import { DateTimeField } from './DateTimeField'
import { TimeSelect } from './TimeSelect'
import { formatReminder } from '../utils'

interface CreateModalProps {
  mode: CreateMode
  defaultCategory?: CategoryId
  defaultDate: string
  onClose: () => void
  onCreateObjective: (data: {
    title: string
    categoryId: CategoryId
    plannedDays: number
    dueDate: string
    dueTime: string
    reminder?: string
  }) => void
  onCreateTask: (data: {
    title: string
    categoryId: CategoryId
    dueDate: string
    dueTime: string
    estimateDays: number
    reminder?: string
  }) => void
  onCreateProject: (data: {
    title: string
    categoryId: CategoryId
    targetDate: string
    targetTime: string
    description: string
    reminder?: string
  }) => void
  onAddCategory: (name: string, colorVar: string) => Category
  reminderDefaults: ReminderDefaults
}

const TITLES: Record<CreateMode, { title: string; sub: string }> = {
  objective: {
    title: '新建季度任务',
    sub: '一项季度任务会占用本季度的人日',
  },
  task: {
    title: '新建本周必做',
    sub: '可以关联季度任务或长期项目，提醒默认继承分类设置',
  },
  project: {
    title: '新建长期项目',
    sub: '项目可以跨季度推进，工作项按安排周自动进入本周安排',
  },
}

export function CreateModal({
  mode,
  defaultCategory = 'appsec',
  defaultDate,
  onClose,
  onCreateObjective,
  onCreateTask,
  onCreateProject,
  onAddCategory,
  reminderDefaults,
}: CreateModalProps) {
  const meta = TITLES[mode]
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState<CategoryId>(defaultCategory)
  const [days, setDays] = useState(mode === 'objective' ? 15 : mode === 'task' ? 0.5 : 0)
  const [date, setDate] = useState(defaultDate || TODAY)
  const [time, setTime] = useState('18:00')
  const [description, setDescription] = useState('')
  const [newCategoryOpen, setNewCategoryOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0].value)
  const [categoryError, setCategoryError] = useState('')
  const [reminderMode, setReminderMode] = useState<'default' | 'custom'>('default')
  const [reminderOffset, setReminderOffset] = useState(reminderDefaults.offsetDays)
  const [reminderTime, setReminderTime] = useState(reminderDefaults.time)

  const valid = title.trim().length > 0

  const submit = () => {
    if (!valid) return
    if (mode === 'objective') {
      onCreateObjective({
        title: title.trim(),
        categoryId,
        plannedDays: Number(days) || 1,
        dueDate: date,
        dueTime: time || '18:00',
        reminder:
          reminderMode === 'custom'
            ? formatReminder(reminderOffset, reminderTime)
            : formatReminder(reminderDefaults.offsetDays, reminderDefaults.time),
      })
    } else if (mode === 'task') {
      onCreateTask({
        title: title.trim(),
        categoryId,
        dueDate: date,
        dueTime: time || '18:00',
        estimateDays: Number(days) || 0.5,
        reminder:
          reminderMode === 'custom'
            ? formatReminder(reminderOffset, reminderTime)
            : formatReminder(reminderDefaults.offsetDays, reminderDefaults.time),
      })
    } else {
      onCreateProject({
        title: title.trim(),
        categoryId,
        targetDate: date,
        targetTime: time || '18:00',
        description: description.trim(),
        reminder:
          reminderMode === 'custom'
            ? formatReminder(reminderOffset, reminderTime)
            : formatReminder(reminderDefaults.offsetDays, reminderDefaults.time),
      })
    }
    onClose()
  }

  return (
    <>
      <div className="scrim" onMouseDown={onClose} />
      <div className="modal-layer create-modal">
        <div className="modal-card">
          <div className="modal-inner">
            <div className="modal-head">
              <div>
                                <div className="modal-title">{meta.title}</div>
                <div className="modal-sub">{meta.sub}</div>
              </div>
              <button type="button" className="modal-close" onClick={onClose} aria-label="关闭">
                <X size={16} />
              </button>
            </div>

            <div className="create-body">
              <div className="field">
                <label>标题</label>
                <input
                  className="input"
                  autoFocus
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={
                    mode === 'objective'
                      ? '例：等保 2.0 差距分析闭环'
                      : mode === 'task'
                        ? '例：输出差距分析初稿'
                        : '例：AI 安全治理基线'
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') submit()
                  }}
                />
              </div>

              <div className="field">
                <label>分类</label>
                <div className="category-picker">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      className={`chip cat${categoryId === category.id ? ' active' : ''}`}
                      style={catStyle(category.id)}
                      onClick={() => setCategoryId(category.id)}
                    >
                      <span className="dot" />
                      {category.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`chip add${newCategoryOpen ? ' active' : ''}`}
                    onClick={() => {
                      setNewCategoryOpen((value) => !value)
                      setCategoryError('')
                    }}
                  >
                    <Plus size={10} />
                    新建分类
                  </button>
                </div>
                {newCategoryOpen ? (
                  <div className="inline-category">
                    <input
                      className="input"
                      autoFocus
                      value={newCategoryName}
                      onChange={(event) => {
                        setNewCategoryName(event.target.value)
                        setCategoryError('')
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          const name = newCategoryName.trim()
                          if (!name) {
                            setCategoryError('请输入分类名称')
                            return
                          }
                          if (CATEGORIES.some((category) => category.name === name)) {
                            setCategoryError('已有同名分类')
                            return
                          }
                          const category = onAddCategory(name, newCategoryColor)
                          setCategoryId(category.id)
                          setNewCategoryName('')
                          setNewCategoryOpen(false)
                        }
                      }}
                      placeholder="分类名称"
                      maxLength={12}
                    />
                    <select
                      className="select"
                      value={newCategoryColor}
                      onChange={(event) => setNewCategoryColor(event.target.value)}
                      aria-label="分类颜色"
                    >
                      {CATEGORY_COLORS.map((color) => (
                        <option value={color.value} key={color.value}>
                          {color.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn primary sm"
                      onClick={() => {
                        const name = newCategoryName.trim()
                        if (!name) {
                          setCategoryError('请输入分类名称')
                          return
                        }
                        if (CATEGORIES.some((category) => category.name === name)) {
                          setCategoryError('已有同名分类')
                          return
                        }
                        const category = onAddCategory(name, newCategoryColor)
                        setCategoryId(category.id)
                        setNewCategoryName('')
                        setNewCategoryOpen(false)
                      }}
                    >
                      添加
                    </button>
                    <button
                      type="button"
                      className="icon-btn sm"
                      onClick={() => setNewCategoryOpen(false)}
                      aria-label="取消新建分类"
                    >
                      <X size={12} />
                    </button>
                    {categoryError ? <span className="inline-category-error">{categoryError}</span> : null}
                  </div>
                ) : null}
              </div>

              {mode === 'project' ? (
                <div className="field">
                  <label>项目说明</label>
                  <textarea
                    className="textarea"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="一句话说明项目目标和范围"
                  />
                </div>
              ) : null}

              <div className={mode === 'project' ? 'field-grid one' : 'field-grid two'}>
                {mode !== 'project' ? (
                  <div className="field">
                    <label>{mode === 'objective' ? '计划人日' : '预计人日'}</label>
                    <input
                      className="input num"
                      type="number"
                      min={0.25}
                      max={200}
                      step={0.25}
                      value={days}
                      onChange={(event) => setDays(Number(event.target.value))}
                    />
                  </div>
                ) : null}
                <div className="field">
                  <label>{mode === 'project' ? '目标日期与时间' : '截止日期与时间'}</label>
                  <DateTimeField
                    value={date}
                    time={time}
                    onChange={(nextDate, nextTime) => {
                      setDate(nextDate)
                      setTime(nextTime)
                    }}
                    ariaLabel={mode === 'project' ? '选择项目目标日期与时间' : '选择截止日期与时间'}
                  />
                </div>
              </div>
              <div className="datetime-preview">
                <Clock size={10} />
                24 小时制 · 系统通知精确到分钟
              </div>

              <div className="field reminder-field">
                <label>提醒</label>
                <div className="reminder-config">
                  <select
                    className="select"
                    value={reminderMode}
                    onChange={(event) => {
                      const next = event.target.value as 'default' | 'custom'
                      setReminderMode(next)
                      if (next === 'custom') {
                        setReminderOffset(reminderDefaults.offsetDays)
                        setReminderTime(reminderDefaults.time)
                      }
                    }}
                    aria-label="提醒规则"
                  >
                    <option value="default">
                      跟随全局 · {formatReminder(reminderDefaults.offsetDays, reminderDefaults.time)}
                    </option>
                    <option value="custom">自定义提醒</option>
                  </select>
                  {reminderMode === 'custom' ? (
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
                      <TimeSelect value={reminderTime} onChange={setReminderTime} compact />
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <button type="button" className="btn ghost" onClick={onClose}>
                取消
              </button>
              <button type="button" className="btn primary" disabled={!valid} onClick={submit}>
                <span className="icon-circle">
                  <Check size={11} weight="bold" />
                </span>
                创建
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
