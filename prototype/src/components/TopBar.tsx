import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  GearSix,
  MagnifyingGlass,
  Palette,
  Sparkle,
} from '@phosphor-icons/react'
import {
  OBJECTIVES,
  QUARTER_STATS,
  WEEK_ORDER,
  WEEKS,
  YEARS,
  quarterKey,
  quarterRange,
} from '../data/mock'
import { Logo } from './Logo'
import { quarterLoad } from '../utils'
import { cn } from '../utils'
import type { Project, ViewId } from '../types'

interface TopBarProps {
  onToggleTheme: () => void
  projects: Project[]
  year: number
  quarter: number
  view: ViewId
  weekKey: string
  onWeekChange: (weekKey: string) => void
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
  view,
  weekKey,
  onWeekChange,
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
  const [weekOpen, setWeekOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const weekRef = useRef<HTMLDivElement>(null)
  const weekMeta = WEEKS[weekKey] ?? WEEKS['2026-W42']
  const weekIndex = WEEK_ORDER.indexOf(weekKey)
  const quarterWeeks = WEEK_ORDER.filter((key) => {
    const meta = WEEKS[key]
    const endYear = Number(meta.end.slice(0, 4))
    const endMonth = Number(meta.end.slice(5, 7))
    return endYear === year && Math.floor((endMonth - 1) / 3) + 1 === quarter
  })

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (!weekOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (weekRef.current && !weekRef.current.contains(event.target as Node)) setWeekOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setWeekOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [weekOpen])

  return (
    <div className={cn('topbar', view === 'week' && 'week-mode')}>
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
              setWeekOpen(false)
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

        {view === 'week' ? (
          <>
            <span className="topbar-divider" />
            <div className="top-week" ref={weekRef}>
              <button
                type="button"
                className="top-week-arrow"
                onClick={() => {
                  if (weekIndex > 0) onWeekChange(WEEK_ORDER[weekIndex - 1])
                }}
                disabled={weekIndex <= 0}
                aria-label="上一周"
                title="上一周"
              >
                <CaretLeft size={13} />
              </button>
              <button
                type="button"
                className={cn('top-week-trigger', weekOpen && 'open')}
                onClick={() => setWeekOpen((value) => !value)}
                aria-haspopup="dialog"
                aria-expanded={weekOpen}
              >
                <span className="top-week-range">{weekMeta.range}</span>
                <CaretDown size={10} className="top-week-caret" />
              </button>
              <button
                type="button"
                className="top-week-arrow"
                onClick={() => {
                  if (weekIndex < WEEK_ORDER.length - 1) onWeekChange(WEEK_ORDER[weekIndex + 1])
                }}
                disabled={weekIndex >= WEEK_ORDER.length - 1}
                aria-label="下一周"
                title="下一周"
              >
                <CaretRight size={13} />
              </button>
              <button
                type="button"
                className={cn('top-week-today', weekKey === '2026-W42' && 'active')}
                onClick={() => onWeekChange('2026-W42')}
                title="回到本周"
              >
                本周
              </button>

              {weekOpen ? (
                <div className="week-pop" role="dialog" aria-label="选择周">
                  <div className="week-pop-head">
                    <span>跳到某一周 · Q{quarter}</span>
                    <button
                      type="button"
                      className="week-pop-today"
                      onClick={() => {
                        onWeekChange('2026-W42')
                        setWeekOpen(false)
                      }}
                    >
                      回到本周
                    </button>
                  </div>
                  <div className="week-pop-grid">
                    {quarterWeeks.map((key) => {
                      const meta = WEEKS[key]
                      return (
                        <button
                          key={key}
                          type="button"
                          className={cn('week-option', key === weekKey && 'active')}
                          onClick={() => {
                            onWeekChange(key)
                            setWeekOpen(false)
                          }}
                        >
                          <b>第 {meta.num} 周</b>
                          <span>{meta.range}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
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
