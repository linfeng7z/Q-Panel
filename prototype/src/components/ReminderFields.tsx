import type { ReminderDefaults } from '../types'
import { cn, formatReminder } from '../utils'
import { HourSelect } from './HourSelect'

interface ReminderFieldsProps {
  mode: 'default' | 'custom'
  offsetDays: number
  time: string
  defaults: ReminderDefaults
  onChange: (next: { mode: 'default' | 'custom'; offsetDays: number; time: string }) => void
  hideMode?: boolean
  compact?: boolean
}

/** Shared reminder editor: one mode row, then a clean offset + whole-hour row. */
export function ReminderFields({
  mode,
  offsetDays,
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
            onClick={() => onChange({ mode: 'default', offsetDays: defaults.offsetDays, time: defaults.time })}
            aria-pressed={mode === 'default'}
          >
            跟随全局
          </button>
          <button
            type="button"
            className={mode === 'custom' ? 'active' : ''}
            onClick={() => onChange({ mode: 'custom', offsetDays, time })}
            aria-pressed={mode === 'custom'}
          >
            自定义
          </button>
        </div>
      ) : null}

      {mode === 'custom' || hideMode ? (
        <div className="reminder-rule-row">
          <label className="reminder-choice">
            <span>提前</span>
            <select
              className="select"
              value={offsetDays}
              onChange={(event) =>
                onChange({ mode, offsetDays: Number(event.target.value), time })
              }
              aria-label="提前量"
            >
              <option value={0}>当天</option>
              <option value={1}>提前 1 天</option>
              <option value={2}>提前 2 天</option>
              <option value={3}>提前 3 天</option>
              <option value={7}>提前 1 周</option>
            </select>
          </label>
          <label className="reminder-choice reminder-choice-time">
            <span>时刻</span>
            <HourSelect
              value={time}
              onChange={(nextTime) => onChange({ mode, offsetDays, time: nextTime })}
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
