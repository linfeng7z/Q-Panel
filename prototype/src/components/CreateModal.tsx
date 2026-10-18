import { useState } from 'react'
import { Check, Clock, Plus, X } from '@phosphor-icons/react'
import type { Category, CategoryId, CreateMode, Objective, Project, ReminderDefaults } from '../types'
import { CATEGORIES, CATEGORY_COLORS, TODAY } from '../data/mock'
import { catStyle } from './ui'
import { DateRangeField } from './DateRangeField'
import { DayInput } from './DayInput'
import { ReminderFields } from './ReminderFields'
import { formatReminder, formatReminderDate, shiftDate } from '../utils'

interface CreateModalProps {
  mode: CreateMode
  defaultCategory?: CategoryId
  defaultDate: string
  onClose: () => void
  onCreateObjective: (data: {
    title: string
    categoryId: CategoryId
    plannedDays: number
    startDate: string
    endDate: string
    dueDate: string
    dueTime: string
    projectId?: string
    reminder?: string
  }) => void
  onCreateTask: (data: {
    title: string
    categoryId: CategoryId
    startDate: string
    endDate: string
    dueDate: string
    dueTime: string
    estimateDays: number
    reminder?: string
  }) => void
  onCreateProject: (data: {
    title: string
    categoryId: CategoryId
    startDate: string
    endDate: string
    targetDate: string
    targetTime: string
    description: string
    plannedDays: number
    objectiveId?: string
    reminder?: string
  }) => void
  quarterObjectives: Objective[]
  projects: Project[]
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
  quarterObjectives,
  projects,
  onAddCategory,
  reminderDefaults,
}: CreateModalProps) {
  const meta = TITLES[mode]
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState<CategoryId>(defaultCategory)
  const [objectiveId, setObjectiveId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [days, setDays] = useState(mode === 'objective' ? 15 : mode === 'task' ? 0.5 : 15)
  const initialEnd = defaultDate || TODAY
  const [startDate, setStartDate] = useState(mode === 'task' ? initialEnd : TODAY)
  const [endDate, setEndDate] = useState(initialEnd)
  const [description, setDescription] = useState('')
  const [newCategoryOpen, setNewCategoryOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0].value)
  const [categoryError, setCategoryError] = useState('')
  const [reminderMode, setReminderMode] = useState<'default' | 'custom'>('default')
  const [reminderDate, setReminderDate] = useState(() => shiftDate(initialEnd, -reminderDefaults.offsetDays))
  const [reminderTime, setReminderTime] = useState(reminderDefaults.time)

  const valid = title.trim().length > 0 && Boolean(startDate) && Boolean(endDate) && endDate >= startDate

  const submit = () => {
    if (!valid) return
    if (mode === 'objective') {
      onCreateObjective({
        title: title.trim(),
        categoryId,
        plannedDays: Number(days) || 1,
        startDate,
        endDate,
        dueDate: endDate,
        dueTime: '18:00',
        projectId: projectId || undefined,
        reminder:
          reminderMode === 'custom'
            ? formatReminderDate(reminderDate, reminderTime)
            : formatReminder(reminderDefaults.offsetDays, reminderDefaults.time),
      })
    } else if (mode === 'task') {
      onCreateTask({
        title: title.trim(),
        categoryId,
        startDate,
        endDate,
        dueDate: endDate,
        dueTime: '18:00',
        estimateDays: Number(days) || 0.5,
        reminder:
          reminderMode === 'custom'
            ? formatReminderDate(reminderDate, reminderTime)
            : formatReminder(reminderDefaults.offsetDays, reminderDefaults.time),
      })
    } else {
      onCreateProject({
        title: title.trim(),
        categoryId,
        startDate,
        endDate,
        targetDate: endDate,
        targetTime: '18:00',
        description: description.trim(),
        plannedDays: Number(days) || 15,
        objectiveId: objectiveId || undefined,
        reminder:
          reminderMode === 'custom'
            ? formatReminderDate(reminderDate, reminderTime)
            : formatReminder(reminderDefaults.offsetDays, reminderDefaults.time),
      })
    }
    onClose()
  }

  return (
    <>
      <div className="scrim" onMouseDown={onClose} />
      <div
        className="modal-layer create-modal"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
      >
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
                    if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
                      submit()
                    }
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
                        if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
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
                  <label>关联季度规划</label>
                  <select
                    className="select"
                    value={objectiveId}
                    onChange={(event) => setObjectiveId(event.target.value)}
                    aria-label="关联季度规划"
                  >
                    <option value="">不关联，按独立项目占用容量</option>
                    {quarterObjectives.map((objective) => (
                      <option value={objective.id} key={objective.id}>
                        {objective.title} · {objective.plannedDays} 人日
                      </option>
                    ))}
                  </select>
                  <div className="field-help">关联后项目工作项视为该季度任务的拆解，不重复占用容量。</div>
                </div>
              ) : mode === 'objective' ? (
                <div className="field">
                  <label>关联项目</label>
                  <select
                    className="select"
                    value={projectId}
                    onChange={(event) => setProjectId(event.target.value)}
                    aria-label="关联项目"
                  >
                    <option value="">不关联，作为独立季度任务</option>
                    {projects.map((project) => (
                      <option value={project.id} key={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                  <div className="field-help">关联后该项目的工作项归入此季度任务，不再重复占用容量。</div>
                </div>
              ) : null}

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

              <div className="field">
                <label>{mode === 'objective' ? '计划人日' : mode === 'task' ? '预计人日' : '总规划人日'}</label>
                <DayInput
                  className="input num"
                  value={days}
                  onChange={setDays}
                  placeholder={mode === 'task' ? '0.5' : '15'}
                  min={0.25}
                  fallback={mode === 'task' ? 0.5 : 15}
                  label={mode === 'objective' ? '计划人日' : mode === 'task' ? '预计人日' : '总规划人日'}
                />
              </div>
              <div className="field">
                <label>{mode === 'project' ? '项目开展时间段' : '开展时间段'}</label>
                <DateRangeField
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(nextStart, nextEnd) => {
                    setStartDate(nextStart)
                    setEndDate(nextEnd)
                  }}
                />
              </div>
              <div className="datetime-preview">
                <Clock size={10} />
                按自然日计算 · 提醒精确到 24 小时制整点
              </div>

              <div className="field reminder-field">
                <label>提醒</label>
                <ReminderFields
                  mode={reminderMode}
                  date={reminderDate}
                  time={reminderTime}
                  defaults={reminderDefaults}
                  onChange={(next) => {
                    if (next.mode === 'custom' && reminderMode === 'default') {
                      setReminderDate(shiftDate(endDate, -reminderDefaults.offsetDays))
                      setReminderTime(reminderDefaults.time)
                    }
                    setReminderMode(next.mode)
                    setReminderDate(next.date)
                    setReminderTime(next.time)
                  }}
                />
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
