import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  CaretDown,
  CaretUp,
  ChartLineUp,
  GearSix,
  LinkSimple,
  MagnifyingGlass,
  NotePencil,
  Palette,
  Sparkle,
  SquaresFour,
} from '@phosphor-icons/react'
import { OBJECTIVES, QUARTER_STATS, YEARS, quarterKey, quarterRange } from '../data/mock'
import { sumHours, weightedCompletion } from '../utils'
import { cn } from '../utils'
import type { ViewId } from '../types'

interface TopBarProps {
  view: ViewId
  onView: (view: ViewId) => void
  onToggleTheme: () => void
  year: number
  quarter: number
  onPeriodChange: (year: number, quarter: number) => void
  onOpenCommand: () => void
  onOpenAI: () => void
  onOpenSettings: () => void
  onOpenReminder: () => void
  onCollapse: () => void
  aiOpen: boolean
  bellCount: number
}

const toolItems: Array<{ id: ViewId; label: string; hint: string; icon: typeof ChartLineUp }> = [
  { id: 'stats', label: '统计与容量', hint: '季度 / 月度 / 周口径', icon: ChartLineUp },
  { id: 'notes', label: '随笔记', hint: 'Markdown 本地速记', icon: NotePencil },
  { id: 'links', label: '链接收藏', hint: '常用安全入口', icon: LinkSimple },
]

export function TopBar({
  view,
  onView,
  onToggleTheme,
  year,
  quarter,
  onPeriodChange,
  onOpenCommand,
  onOpenAI,
  onOpenSettings,
  onOpenReminder,
  onCollapse,
  aiOpen,
  bellCount,
}: TopBarProps) {
  const [open, setOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const toolsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (!toolsOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) setToolsOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [toolsOpen])

  const toolPageActive = view === 'stats' || view === 'notes' || view === 'links'

  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="brand">
          <span className="brand-mark">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3.2l7.2 2.7v5.2c0 4.8-3 8.1-7.2 9.7-4.2-1.6-7.2-4.9-7.2-9.7V5.9L12 3.2z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M8.8 12h6.4M12 8.8v6.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <div className="brand-name">Q-Panel</div>
            <div className="brand-sub">Security Workbench</div>
          </div>
        </div>

        <span className="topbar-divider" />

        <div ref={ref} style={{ position: 'relative' }}>
          <button
            type="button"
            className={cn('period-btn', open && 'open')}
            onClick={() => {
              setToolsOpen(false)
              setOpen((value) => !value)
            }}
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <span className="year num">{year}</span>
            <span className="q">Q{quarter}</span>
            <CaretDown size={12} className="caret" />
          </button>

          {open ? (
            <div className="period-pop" role="dialog" aria-label="选择期间">
              <div className="period-pop-head">
                <span className="period-pop-title">Jump to period</span>
                <button
                  type="button"
                  className="period-pop-today"
                  onClick={() => {
                    onPeriodChange(2026, 4)
                    setOpen(false)
                  }}
                >
                  回到当前 Q4
                </button>
              </div>
              <div className="year-strip">
                {YEARS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={cn('year-btn', item === year && 'active')}
                    onClick={() => onPeriodChange(item, quarter)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="q-card-grid">
                {[1, 2, 3, 4].map((q) => {
                  const key = quarterKey(year, q)
                  const stats = QUARTER_STATS[key]
                  const objectives = OBJECTIVES[key] ?? []
                  const available = stats ? stats.workdays * 8 - stats.leaveHours : null
                  const allocated = sumHours(objectives)
                  const completion = weightedCompletion(objectives)
                  const ratio = available ? Math.min(100, Math.round((allocated / available) * 100)) : 0
                  return (
                    <button
                      key={q}
                      type="button"
                      className={cn('q-card', q === quarter && 'active')}
                      onClick={() => {
                        onPeriodChange(year, q)
                        setOpen(false)
                      }}
                    >
                      <div className="q-card-top">
                        <span className="q-card-name">Q{q}</span>
                        <span className="q-card-workdays">{stats ? `${stats.workdays} 天` : '未规划'}</span>
                      </div>
                      <div className="q-card-meta">
                        <b className="num">{allocated}</b>
                        <span>h / {available ?? '—'}h</span>
                      </div>
                      <div className="q-card-track">
                        <i style={{ width: `${ratio}%` }} />
                      </div>
                      <div className="q-card-meta" style={{ marginTop: 6, fontSize: 8.5 }}>
                        <span>{stats ? quarterRange(year, q) : '暂无数据'}</span>
                        <span style={{ marginLeft: 'auto' }}>{available ? `${completion}%` : '—'}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="q-tabs" role="tablist" aria-label="季度">
          {[1, 2, 3, 4].map((q) => (
            <button
              key={q}
              type="button"
              role="tab"
              aria-selected={quarter === q}
              className={cn('q-tab', quarter === q && 'active')}
              onClick={() => onPeriodChange(year, q)}
            >
              Q{q}
            </button>
          ))}
        </div>
      </div>

      <div className="topbar-right">
        <button type="button" className="icon-btn" onClick={onOpenCommand} title="搜索与跳转 ⌘K">
          <MagnifyingGlass size={16} />
        </button>
        <button
          type="button"
          className={cn('ai-pill')}
          onClick={onOpenAI}
          style={aiOpen ? { borderColor: 'var(--line-strong)' } : undefined}
        >
          <Sparkle size={14} weight="fill" className="spark" />
          AI
        </button>
        <button type="button" className="icon-btn" onClick={onOpenReminder} title="提醒演示">
          <Bell size={16} />
          {bellCount > 0 ? <span className="ping" /> : null}
        </button>

        <div ref={toolsRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className={cn('icon-btn', (toolsOpen || toolPageActive) && 'active')}
            onClick={() => {
              setOpen(false)
              setToolsOpen((value) => !value)
            }}
            title="工具"
            aria-haspopup="menu"
            aria-expanded={toolsOpen}
          >
            <SquaresFour size={16} />
          </button>
          {toolsOpen ? (
            <div className="tools-pop" role="menu" aria-label="工具">
              <div className="tools-pop-head">工具</div>
              {toolItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={cn('tools-item', view === item.id && 'active')}
                    role="menuitem"
                    onClick={() => {
                      onView(item.id)
                      setToolsOpen(false)
                    }}
                  >
                    <span className="tools-item-icon">
                      <Icon size={15} />
                    </span>
                    <span className="tools-item-copy">
                      <b>{item.label}</b>
                      <span>{item.hint}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>

        <button type="button" className="icon-btn" onClick={onToggleTheme} title="切换皮肤">
          <Palette size={16} />
        </button>
        <button type="button" className="icon-btn" onClick={onOpenSettings} title="设置">
          <GearSix size={16} />
        </button>
        <span className="topbar-divider" />
        <button type="button" className="icon-btn" onClick={onCollapse} title="收起面板 Esc">
          <CaretUp size={16} />
        </button>
      </div>
    </div>
  )
}
