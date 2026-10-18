import { Clock } from '@phosphor-icons/react'
import { SelectMenu } from './SelectMenu'

interface HourSelectProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

/** Reminder hour is a whole 24-hour clock hour, not a minute-of-day picker. */
export function HourSelect({ value, onChange, label = '提醒小时' }: HourSelectProps) {
  const hour = String(Math.min(23, Math.max(0, Number((value || '09:00').split(':')[0]) || 0))).padStart(2, '0')
  return (
    <SelectMenu
      className="hour-select"
      value={`${hour}:00`}
      onChange={(next) => onChange(next)}
      options={Array.from({ length: 24 }, (_, index) => {
        const item = String(index).padStart(2, '0')
        return { value: `${item}:00`, label: `${item}:00` }
      })}
      label={label}
      prefix={<Clock size={10} />}
      compact
      menuWidth={112}
    />
  )
}
