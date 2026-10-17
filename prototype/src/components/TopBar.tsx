import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  CaretDown,
  CaretUp,
  GearSix,
  MagnifyingGlass,
  Palette,
  Sparkle,
} from '@phosphor-icons/react'
import { OBJECTIVES, QUARTER_STATS, YEARS, quarterKey, quarterRange } from '../data/mock'
import { Logo } from './Logo'
import { quarterLoad } from '../utils'
import { cn } from '../utils'
import type { Project } from '../types'

interface TopBarProps {
  onToggleTheme: () => void
  projects: Project[]
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

export function TopBar({
  onToggleTheme,
  projects,
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
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="brand">
          <span className="brand-mark">
            <Logo size={19} />
          </span>
          <div className="brand-name">Q-Panel</div>
        </div>

        <span className="topbar-divider" />

        <div ref={ref} style={{ position: 'relative' }}>
          <button
            type="button"
            className={cn('period-btn', open && 'open')}
            onClick={() => {
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
                  const available = stats ? stats.workdays - stats.leaveDays : null
                  const load = stats
                    ? quarterLoad(objectives, projects, year, q, available ?? 0)
                    : null
                  const allocated = load?.committedDays ?? 0
                  const completion = load?.completion ?? 0
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
                        <span className="q-card-workdays">{stats ? `${stats.workdays} 工作日` : '未规划'}</span>
                      </div>
                      <div className="q-card-meta">
                        <b className="num">{allocated}</b>
                        <span> / {available ?? '—'} 人日</span>
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
