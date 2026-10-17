import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarBlank, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { TODAY } from '../data/mock'
import { TimeSelect } from './TimeSelect'

interface DateTimeFieldProps {
  value: string
  time: string
  onChange: (date: string, time: string) => void
  ariaLabel?: string
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

export function DateTimeField({ value, time, onChange, ariaLabel }: DateTimeFieldProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const initial = parseDate(value)
  const [view, setView] = useState({ year: initial.year, month: initial.month })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const openPicker = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = 318
    const height = 376
    const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))
    const below = rect.bottom + 8
    const top = below + height > window.innerHeight - 12 ? Math.max(12, rect.top - height - 8) : below
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
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1
    return day >= 1 && day <= daysInMonth ? day : null
  })

  const selected = parseDate(value)
  const selectedKey = dateISO(selected.year, selected.month, selected.day)

  const changeMonth = (offset: number) => {
    setView((current) => {
      const next = new Date(current.year, current.month - 1 + offset, 1)
      return { year: next.getFullYear(), month: next.getMonth() + 1 }
    })
  }

  const chooseDay = (day: number) => {
    onChange(dateISO(view.year, view.month, day), time)
  }

  const chooseToday = () => {
    const today = parseDate(TODAY)
    setView({ year: today.year, month: today.month })
    onChange(TODAY, time)
  }

  const popover = open
    ? createPortal(
        <div
          ref={popoverRef}
          className="dt-pop"
          style={{ top: coords.top, left: coords.left }}
          role="dialog"
          aria-label="选择日期与时间"
        >
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
          <div className="dt-grid">
            {cells.map((day, index) =>
              day ? (
                <button
                  key={day}
                  type="button"
                  className={[
                    'dt-day',
                    dateISO(view.year, view.month, day) === selectedKey && 'selected',
                    dateISO(view.year, view.month, day) === TODAY && 'today',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => chooseDay(day)}
                >
                  {day}
                </button>
              ) : (
                <span key={`empty-${index}`} className="dt-day-empty" />
              ),
            )}
          </div>
          <div className="dt-time-row">
            <span className="dt-time-label">时刻</span>
            <TimeSelect value={time} onChange={(next) => onChange(value, next)} compact />
          </div>
          <div className="dt-pop-foot">
            <button type="button" className="btn ghost sm" onClick={chooseToday}>
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
    <div className="dt-field">
      <button
        ref={triggerRef}
        type="button"
        className={`dt-trigger${open ? ' open' : ''}`}
        onClick={() => (open ? setOpen(false) : openPicker())}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel ?? '选择日期与时间'}
      >
        <span className="dt-value">{displayDate(value)}</span>
        <span className="dt-divider" />
        <span className="dt-time">{time || '18:00'}</span>
        <span className="dt-24">24H</span>
        <CalendarBlank size={13} className="dt-icon" />
      </button>
      {popover}
    </div>
  )
}
