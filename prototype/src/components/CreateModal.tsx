import { useState } from 'react'
import { Check, Clock, X } from '@phosphor-icons/react'
import type { CategoryId, CreateMode } from '../types'
import { CATEGORIES, TODAY } from '../data/mock'
import { catStyle } from './ui'

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
  }) => void
  onCreateTask: (data: {
    title: string
    categoryId: CategoryId
    dueDate: string
    dueTime: string
    estimateDays: number
  }) => void
  onCreateProject: (data: {
    title: string
    categoryId: CategoryId
    targetDate: string
    targetTime: string
    description: string
  }) => void
}

const TITLES: Record<CreateMode, { title: string; sub: string; kicker: string }> = {
  objective: {
    title: '新建季度任务',
    sub: '一项季度任务会占用本季度的人日',
    kicker: 'Quarter task',
  },
  task: {
    title: '新建本周必做',
    sub: '可以关联季度任务或长期项目，提醒默认继承分类设置',
    kicker: 'Weekly task',
  },
  project: {
    title: '新建长期项目',
    sub: '项目可以跨季度推进，工作项按安排周自动进入本周安排',
    kicker: 'Long-running project',
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
}: CreateModalProps) {
  const meta = TITLES[mode]
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState<CategoryId>(defaultCategory)
  const [days, setDays] = useState(mode === 'objective' ? 15 : mode === 'task' ? 0.5 : 0)
  const [date, setDate] = useState(defaultDate || TODAY)
  const [time, setTime] = useState('18:00')
  const [description, setDescription] = useState('')

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
      })
    } else if (mode === 'task') {
      onCreateTask({
        title: title.trim(),
        categoryId,
        dueDate: date,
        dueTime: time || '18:00',
        estimateDays: Number(days) || 0.5,
      })
    } else {
      onCreateProject({
        title: title.trim(),
        categoryId,
        targetDate: date,
        targetTime: time || '18:00',
        description: description.trim(),
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
                <div className="eyebrow" style={{ marginBottom: 6 }}>
                  <span className="tick" />
                  {meta.kicker}
                </div>
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
                </div>
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

              <div className={mode === 'project' ? 'field-grid two' : 'field-grid three'}>
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
                  <label>{mode === 'project' ? '目标日期' : '截止日期'}</label>
                  <input
                    className="input"
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label>{mode === 'project' ? '目标时间' : '截止时间'}</label>
                  <input
                    className="input time-input"
                    type="time"
                    step={60}
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                  />
                </div>
              </div>
              <div className="datetime-preview">
                <Clock size={10} />
                {mode === 'project' ? '目标' : '截止'} {date} {time} · 24 小时制 · 系统通知精确到分钟
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
