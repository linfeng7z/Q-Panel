import { rangeDays } from '../utils'

interface DateRangeFieldProps {
  startDate: string
  endDate: string
  onChange: (startDate: string, endDate: string) => void
  label?: string
}

/** Activity periods are whole natural days; no hour/minute is involved here. */
export function DateRangeField({ startDate, endDate, onChange, label = '开展时间段' }: DateRangeFieldProps) {
  const days = rangeDays(startDate, endDate)
  return (
    <div className="date-range-field">
      <div className="date-range-inputs">
        <label>
          <span>开始</span>
          <input
            type="date"
            className="date-input"
            value={startDate}
            onChange={(event) => {
              const nextStart = event.target.value
              onChange(nextStart, endDate && endDate >= nextStart ? endDate : nextStart)
            }}
            aria-label={`${label}开始日期`}
          />
        </label>
        <span className="date-range-arrow">→</span>
        <label>
          <span>结束</span>
          <input
            type="date"
            className="date-input"
            value={endDate}
            min={startDate}
            onChange={(event) => {
              const nextEnd = event.target.value
              onChange(startDate && startDate <= nextEnd ? startDate : nextEnd, nextEnd)
            }}
            aria-label={`${label}结束日期`}
          />
        </label>
      </div>
      <span className="date-range-days">共 {days} 天</span>
    </div>
  )
}
