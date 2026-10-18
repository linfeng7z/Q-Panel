import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarBlank, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { TODAY } from '../data/mock'
import { rangeDays } from '../utils'

interface DateRangeFieldProps {
  startDate: string
  endDate: string
  onChange: (startDate: string, endDate: string) => void
  label?: string
  compact?: boolean
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

function addDays(value: string, amount: number): string {
  const date = new Date(`${value}T12:00:00+08:00`)
  date.setDate(date.getDate() + amount)
  return dateISO(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

/** One calendar, two-click range selection. Activity periods are whole days. */
export function DateRangeField({ startDate, endDate, onChange, compact = false }: DateRangeFieldProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const initial = parseDate(startDate)
  const [view, setView] = useState({ year: initial.year, month: initial.month })
  const [selectingEnd, setSelectingEnd] = useState(false)
  const [hovered, setHovered] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const openPicker = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = 332
    const height = 380
    const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))
    const below = rect.bottom + 8
    const top = below + height > window.innerHeight - 12 ? Math.max(12, rect.top - height - 8) : below
    const current = parseDate(startDate)
    setView({ year: current.year, month: current.month })
    setSelectingEnd(false)
    setHovered('')
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
  const cells = Array.from({ length: Math.ceil((firstWeekday + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstWeekday + 1
    return day >= 1 && day <= daysInMonth ? day : null
  })
  const previewEnd = selectingEnd && hovered ? hovered : endDate
  const rangeStart = startDate <= previewEnd ? startDate : previewEnd
  const rangeEnd = startDate <= previewEnd ? previewEnd : startDate
  const selectedDays = rangeDays(rangeStart, rangeEnd)

  const changeMonth = (offset: number) => {
    setView((current) => {
      const next = new Date(current.year, current.month - 1 + offset, 1)
      return { year: next.getFullYear(), month: next.getMonth() + 1 }
    })
  }

  const chooseDay = (date: string) => {
    if (!selectingEnd || !startDate) {
      onChange(date, date)
      setSelectingEnd(true)
      setHovered('')
      return
    }
    if (date < startDate) onChange(date, startDate)
    else onChange(startDate, date)
    setSelectingEnd(false)
    setHovered('')
  }

  const applyPreset = (days: number) => {
    onChange(TODAY, addDays(TODAY, days - 1))
    setSelectingEnd(false)
    setHovered('')
  }

  const popover = open
    ? createPortal(
        <div
          ref={popoverRef}
          className="dt-pop date-range-pop"
          style={{ top: coords.top, left: coords.left }}
          role="dialog"
          aria-label="选择开展时间段"
        >
          <div className="date-range-summary">
            <div>
              <span>开始</span>
              <b>{displayDate(startDate)}</b>
            </div>
            <div className="date-range-summary-arrow">→</div>
            <div>
              <span>结束</span>
              <b>{selectingEnd ? '请选择' : displayDate(endDate)}</b>
            </div>
            <span className="date-range-total">共 {selectedDays} 天</span>
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
          <div className="dt-grid date-range-grid">
            {cells.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} className="dt-day-empty" />
              const iso = dateISO(view.year, view.month, day)
              const isStart = iso === rangeStart
              const isEnd = iso === rangeEnd
              const inRange = iso > rangeStart && iso < rangeEnd
              return (
                <button
                  key={day}
                  type="button"
                  className={[
                    'dt-day',
                    'range-day',
                    isStart && 'range-start',
                    isEnd && 'range-end',
                    inRange && 'in-range',
                    iso === TODAY && 'today',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onMouseEnter={() => selectingEnd && setHovered(iso)}
                  onClick={() => chooseDay(iso)}
                >
                  {day}
                </button>
              )
            })}
          </div>

          <div className="date-range-presets">
            <button type="button" className="btn ghost sm" onClick={() => applyPreset(1)}>今天</button>
            <button type="button" className="btn ghost sm" onClick={() => applyPreset(7)}>7 天</button>
            <button type="button" className="btn ghost sm" onClick={() => applyPreset(14)}>14 天</button>
            <button type="button" className="btn ghost sm" onClick={() => applyPreset(30)}>30 天</button>
          </div>
          <div className="dt-pop-foot">
            <span className="date-range-hint">{selectingEnd ? '再选结束日' : '点击日期重新选择'}</span>
            <button type="button" className="btn primary sm" onClick={() => setOpen(false)}>
              完成
            </button>
          </div>
        </div>,
        document.querySelector('.qp-root') ?? document.body,
      )
    : null

  return (
    <div className={`date-range-field${compact ? ' compact' : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        className={`date-range-trigger${open ? ' open' : ''}`}
        onClick={() => (open ? setOpen(false) : openPicker())}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="选择开展时间段"
      >
        <CalendarBlank size={compact ? 10 : 13} />
        <span className="date-range-value">{compact ? displayDate(startDate).slice(5) : displayDate(startDate)}</span>
        <span className="date-range-sep">→</span>
        <span className="date-range-value">{compact ? displayDate(endDate).slice(5) : displayDate(endDate)}</span>
        {!compact ? <span className="date-range-total">{rangeDays(startDate, endDate)} 天</span> : null}
      </button>
      {popover}
    </div>
  )
}
