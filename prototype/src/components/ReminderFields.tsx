import type { ReminderDefaults } from '../types'
import { cn, formatReminder } from '../utils'
import { DateField } from './DateField'
import { HourSelect } from './HourSelect'

interface ReminderFieldsProps {
  mode: 'default' | 'custom'
  date: string
  time: string
  defaults: ReminderDefaults
  onChange: (next: { mode: 'default' | 'custom'; date: string; time: string }) => void
  hideMode?: boolean
  compact?: boolean
}

/** Shared reminder editor: one mode row, then a clean offset + whole-hour row. */
export function ReminderFields({
  mode,
  date,
  time,
  defaults,
  onChange,
  hideMode = false,
  compact = false,
}: ReminderFieldsProps) {
  return (
    <div className={cn('reminder-fields', compact && 'compact')}>
      {!hideMode ? (
        <div className="reminder-segmented" role="group" aria-label="提醒规则">
          <button
            type="button"
            className={mode === 'default' ? 'active' : ''}
            onClick={() => onChange({ mode: 'default', date, time: defaults.time })}
            aria-pressed={mode === 'default'}
          >
            跟随全局
          </button>
          <button
            type="button"
            className={mode === 'custom' ? 'active' : ''}
            onClick={() => onChange({ mode: 'custom', date, time })}
            aria-pressed={mode === 'custom'}
          >
            自定义
          </button>
        </div>
      ) : null}

      {mode === 'custom' || hideMode ? (
        <div className="reminder-rule-row reminder-date-row">
          <label className="reminder-choice reminder-choice-date">
            <span>日期</span>
            <DateField
              value={date}
              onChange={(nextDate) => onChange({ mode: 'custom', date: nextDate, time })}
              label="提醒日期"
            />
          </label>
          <label className="reminder-choice reminder-choice-time">
            <span>时刻</span>
            <HourSelect
              value={time}
              onChange={(nextTime) => onChange({ mode: 'custom', date, time: nextTime })}
              label="提醒小时"
            />
          </label>
        </div>
      ) : (
        <div className="reminder-follow-note">
          当前使用全局提醒 · {formatReminder(defaults.offsetDays, defaults.time)}
        </div>
      )}
    </div>
  )
}
