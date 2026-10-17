import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  CalendarCheck,
  CalendarDots,
  ChartLineUp,
  FolderSimple,
  GearSix,
  House,
  LinkSimple,
  MagnifyingGlass,
  NotePencil,
  Palette,
  Sparkle,
  Target,
} from '@phosphor-icons/react'
import type { Objective, Project, ViewId, WeekTask } from '../types'
import { fmtDue } from '../utils'
import { cn } from '../utils'

interface CommandPaletteProps {
  year: number
  quarter: number
  tasks: WeekTask[]
  projects: Project[]
  objectives: Record<string, Objective[]>
  onClose: () => void
  onView: (view: ViewId) => void
  onPeriod: (year: number, quarter: number) => void
  onOpenAI: () => void
  onOpenSettings: () => void
  onToggleTheme: () => void
}

interface CommandItem {
  id: string
  group: string
  label: string
  hint?: string
  icon: ReactNode
  run: () => void
}

export function CommandPalette({
  year,
  quarter,
  tasks,
  projects,
  objectives,
  onClose,
  onView,
  onPeriod,
  onOpenAI,
  onOpenSettings,
  onToggleTheme,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const items = useMemo<CommandItem[]>(() => {
    const viewItems: Array<[ViewId, string, ReactNode]> = [
      ['quarter', '首页 · 季度任务', <House size={15} key="quarter" />],
      ['week', '周计划', <CalendarDots size={15} key="week" />],
      ['projects', '长期项目', <FolderSimple size={15} key="projects" />],
      ['stats', '统计与容量', <ChartLineUp size={15} key="stats" />],
      ['notes', '随笔记', <NotePencil size={15} key="notes" />],
      ['links', '链接收藏', <LinkSimple size={15} key="links" />],
    ]
    const currentKey = `${year}-Q${quarter}`
    const objectiveItems = Object.entries(objectives)
      .filter(([key]) => key === currentKey)
      .flatMap(([, list]) => list)
      .filter((item) => item.status !== 'done')
      .map((item) => ({
        id: `obj-${item.id}`,
        group: '季度任务',
        label: item.title,
        hint: `${item.plannedHours}h`,
        icon: <Target size={15} />,
        run: () => onView('quarter'),
      }))

    return [
      ...viewItems.map(([id, label, icon]) => ({
        id: `view-${id}`,
        group: '页面',
        label,
        icon,
        run: () => onView(id),
      })),
      ...[
        [2026, 4],
        [2026, 3],
        [2027, 1],
      ].map(([y, q]) => ({
        id: `period-${y}-${q}`,
        group: '期间',
        label: `${y} · Q${q}`,
        hint: y === year && q === quarter ? '当前' : '跳转',
        icon: <CalendarCheck size={15} />,
        run: () => onPeriod(y, q),
      })),
      ...objectiveItems,
      ...projects.map((project) => ({
        id: `proj-${project.id}`,
        group: '长期项目',
        label: project.title,
        hint: `${project.milestones.filter((m) => m.status === 'done').length}/${project.milestones.length} 里程碑`,
        icon: <FolderSimple size={15} />,
        run: () => onView('projects'),
      })),
      ...tasks
        .filter((task) => !task.done)
        .map((task) => ({
          id: `task-${task.id}`,
          group: '未完成事项',
          label: task.title,
          hint: fmtDue(task.dueDate, task.dueTime),
          icon: <CalendarDots size={15} />,
          run: () => onView('week'),
        })),
      {
        id: 'action-ai',
        group: '操作',
        label: '打开 AI 助手',
        hint: '⌘J',
        icon: <Sparkle size={15} />,
        run: onOpenAI,
      },
      {
        id: 'action-settings',
        group: '操作',
        label: '打开设置',
        icon: <GearSix size={15} />,
        run: onOpenSettings,
      },
      {
        id: 'action-theme',
        group: '操作',
        label: '切换皮肤 Noir / Ops',
        icon: <Palette size={15} />,
        run: onToggleTheme,
      },
    ]
  }, [year, quarter, objectives, projects, tasks, onView, onPeriod, onOpenAI, onOpenSettings, onToggleTheme])

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return items
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(keyword) ||
        (item.hint ?? '').toLowerCase().includes(keyword) ||
        item.group.toLowerCase().includes(keyword),
    )
  }, [items, query])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelected((value) => Math.min(filtered.length - 1, value + 1))
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelected((value) => Math.max(0, value - 1))
      } else if (event.key === 'Enter') {
        event.preventDefault()
        const item = filtered[selected]
        if (item) {
          item.run()
          onClose()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [filtered, selected, onClose])

  let lastGroup = ''
  let runningIndex = -1

  return (
    <div className="cmd-layer" onMouseDown={onClose}>
      <div className="cmd-panel" onMouseDown={(event) => event.stopPropagation()}>
        <div className="cmd-inner">
          <div className="cmd-input-row">
            <MagnifyingGlass size={17} />
            <input
              ref={inputRef}
              className="cmd-input"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setSelected(0)
              }}
              placeholder="搜索页面、季度、项目、事项…"
            />
            <span className="cmd-kbd">esc</span>
          </div>
          <div className="cmd-list scroll">
            {filtered.length === 0 ? (
              <div className="task-empty">没有匹配结果</div>
            ) : (
              filtered.map((item) => {
                runningIndex += 1
                const showGroup = item.group !== lastGroup
                lastGroup = item.group
                return (
                  <div key={item.id}>
                    {showGroup ? <div className="cmd-group">{item.group}</div> : null}
                    <button
                      type="button"
                      className={cn('cmd-item', runningIndex === selected && 'sel')}
                      onMouseEnter={() => setSelected(runningIndex)}
                      onClick={() => {
                        item.run()
                        onClose()
                      }}
                    >
                      <span className="ph">{item.icon}</span>
                      <span>{item.label}</span>
                      {item.hint ? <span className="cmd-hint">{item.hint}</span> : null}
                    </button>
                  </div>
                )
              })
            )}
          </div>
          <div className="cmd-foot">
            <span>
              <span className="cmd-kbd">↑</span>
              <span className="cmd-kbd">↓</span> 选择
            </span>
            <span>
              <span className="cmd-kbd">↵</span> 打开
            </span>
            <span>
              <span className="cmd-kbd">esc</span> 关闭
            </span>
            <span style={{ marginLeft: 'auto' }}>Q-Panel Quick Jump</span>
          </div>
        </div>
      </div>
    </div>
  )
}
