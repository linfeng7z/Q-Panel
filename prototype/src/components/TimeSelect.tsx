import { Clock } from '@phosphor-icons/react'
import { SelectMenu } from './SelectMenu'

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
  const hours = Array.from({ length: 24 }, (_, index) => ({
    value: pad(index),
    label: pad(index),
  }))
  const minutes = Array.from({ length: 60 }, (_, index) => ({
    value: pad(index),
    label: pad(index),
  }))

  return (
    <div className={`time-select${compact ? ' compact' : ''}`}>
      <Clock size={11} />
      <SelectMenu
        className="time-select-menu"
        value={safeHour}
        options={hours}
        onChange={(nextHour) => onChange(`${nextHour}:${safeMinute}`)}
        label="小时（24 小时制）"
        compact={compact}
        menuWidth={96}
      />
      <span className="time-colon">:</span>
      <SelectMenu
        className="time-select-menu"
        value={safeMinute}
        options={minutes}
        onChange={(nextMinute) => onChange(`${safeHour}:${nextMinute}`)}
        label="分钟"
        compact={compact}
        menuWidth={96}
      />
      <span className="time-unit">24H</span>
    </div>
  )
}
