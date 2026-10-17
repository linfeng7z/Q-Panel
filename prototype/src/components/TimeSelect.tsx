import { CaretDown, Clock } from '@phosphor-icons/react'

interface TimeSelectProps {
  value: string
  onChange: (value: string) => void
  compact?: boolean
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function TimeSelect({ value, onChange, compact = false }: TimeSelectProps) {
  const [hour = '18', minute = '00'] = (value || '18:00').split(':')
  const safeHour = String(Math.min(23, Math.max(0, Number(hour) || 0))).padStart(2, '0')
  const safeMinute = String(Math.min(59, Math.max(0, Number(minute) || 0))).padStart(2, '0')

  return (
    <div className={`time-select${compact ? ' compact' : ''}`}>
      <Clock size={11} />
      <select
        aria-label="小时（24 小时制）"
        value={safeHour}
        onChange={(event) => onChange(`${event.target.value}:${safeMinute}`)}
      >
        {Array.from({ length: 24 }, (_, index) => (
          <option key={index} value={pad(index)}>
            {pad(index)}
          </option>
        ))}
      </select>
      <span className="time-colon">:</span>
      <select
        aria-label="分钟"
        value={safeMinute}
        onChange={(event) => onChange(`${safeHour}:${event.target.value}`)}
      >
        {Array.from({ length: 60 }, (_, index) => (
          <option key={index} value={pad(index)}>
            {pad(index)}
          </option>
        ))}
      </select>
      <span className="time-unit">24H</span>
      <CaretDown size={8} className="time-caret" />
    </div>
  )
}
