import { Clock } from '@phosphor-icons/react'

interface HourSelectProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

/** Reminder hour is a whole 24-hour clock hour, not a minute-of-day picker. */
export function HourSelect({ value, onChange, label = '提醒小时' }: HourSelectProps) {
  const hour = String(Math.min(23, Math.max(0, Number((value || '09:00').split(':')[0]) || 0))).padStart(2, '0')
  return (
    <label className="hour-select">
      <Clock size={11} />
      <span>{label}</span>
      <select value={hour} onChange={(event) => onChange(`${event.target.value}:00`)} aria-label={label}>
        {Array.from({ length: 24 }, (_, index) => {
          const item = String(index).padStart(2, '0')
          return <option key={item} value={item}>{item}:00</option>
        })}
      </select>
      <span className="hour-select-unit">24H</span>
    </label>
  )
}
