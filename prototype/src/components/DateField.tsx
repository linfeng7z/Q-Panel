import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarBlank, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { TODAY } from '../data/mock'

interface DateFieldProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function parseDate(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) {
    const [fallbackYear, fallbackMonth, fallbackDay] = TODAY.split('-').map(Number)
    return { year: fallbackYear, month: fallbackMonth, day: fallbackDay }
  }
  return { year, month, day }
}

function dateISO(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`
}

function displayDate(value: string): string {
  const { year, month, day } = parseDate(value)
  return `${year}.${pad(month)}.${pad(day)}`
}

function weekday(value: string): string {
  const date = new Date(`${value}T12:00:00+08:00`)
  if (Number.isNaN(date.getTime())) return ''
  return `周${WEEKDAYS[(date.getDay() + 6) % 7]}`
}

/** A single calendar date picker, used by absolute reminders. */
export function DateField({ value, onChange, label = '选择日期' }: DateFieldProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const initial = parseDate(value)
  const [view, setView] = useState({ year: initial.year, month: initial.month })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const openPicker = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = 300
    const height = 356
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))
    const below = rect.bottom + 7
    const top = below + height > window.innerHeight - 12 ? Math.max(12, rect.top - height - 7) : below
    const current = parseDate(value)
    setView({ year: current.year, month: current.month })
    setCoords({ top, left })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const handleViewportChange = () => setOpen(false)
    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, true)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange, true)
    }
  }, [open])

  const daysInMonth = new Date(view.year, view.month, 0).getDate()
  const firstWeekday = (new Date(view.year, view.month - 1, 1).getDay() + 6) % 7
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7
  const cells = Array.from({ length: cellCount }, (_, index) => {
    const day = index - firstWeekday + 1
    return day >= 1 && day <= daysInMonth ? day : null
  })

  const changeMonth = (offset: number) => {
    setView((current) => {
      const next = new Date(current.year, current.month - 1 + offset, 1)
      return { year: next.getFullYear(), month: next.getMonth() + 1 }
    })
  }

  const popover = open
    ? createPortal(
        <div
          ref={popoverRef}
          className="dt-pop date-field-pop"
          style={{ top: coords.top, left: coords.left }}
          role="dialog"
          aria-label={label}
        >
          <div className="date-field-current">
            <span>提醒日期</span>
            <b>{displayDate(value)}</b>
            <em>{weekday(value)}</em>
          </div>
          <div className="dt-pop-head">
            <button type="button" className="dt-nav" onClick={() => changeMonth(-1)} aria-label="上个月">
              <CaretLeft size={13} />
            </button>
            <div className="dt-month">
              {view.year} 年 {view.month} 月
            </div>
            <button type="button" className="dt-nav" onClick={() => changeMonth(1)} aria-label="下个月">
              <CaretRight size={13} />
            </button>
          </div>
          <div className="dt-weekdays">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="dt-grid date-field-grid">
            {cells.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} className="dt-day-empty" />
              const iso = dateISO(view.year, view.month, day)
              return (
                <button
                  key={day}
                  type="button"
                  className={`dt-day${iso === value ? ' selected' : ''}${iso === TODAY ? ' today' : ''}`}
                  onClick={() => onChange(iso)}
                >
                  {day}
                </button>
              )
            })}
          </div>
          <div className="dt-pop-foot">
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => onChange(TODAY)}
            >
              今天
            </button>
            <button type="button" className="btn primary sm" onClick={() => setOpen(false)}>
              完成
            </button>
          </div>
        </div>,
        document.querySelector('.qp-root') ?? document.body,
      )
    : null

  return (
    <div className="date-field">
      <button
        ref={triggerRef}
        type="button"
        className={`date-field-trigger${open ? ' open' : ''}`}
        onClick={() => (open ? setOpen(false) : openPicker())}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
      >
        <CalendarBlank size={11} />
        <span>{displayDate(value)}</span>
        <span className="date-field-weekday">{weekday(value)}</span>
      </button>
      {popover}
    </div>
  )
}
