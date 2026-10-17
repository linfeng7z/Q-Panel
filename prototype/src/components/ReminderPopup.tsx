import { useEffect } from 'react'
import { BellRinging, Check, Clock, X } from '@phosphor-icons/react'
import { fmtDateTime } from '../utils'

interface ReminderPopupProps {
  title: string
  categoryName: string
  kindLabel?: string
  dueDate: string
  dueTime?: string
  reminder?: string
  onClose: () => void
  onComplete: () => void
  onSnooze: () => void
  onOpen: () => void
}

export function ReminderPopup({
  title,
  categoryName,
  kindLabel = '季度任务',
  dueDate,
  dueTime,
  reminder,
  onClose,
  onComplete,
  onSnooze,
  onOpen,
}: ReminderPopupProps) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 12000)
    return () => window.clearTimeout(timer)
  }, [onClose])

  return (
    <div className="reminder-layer">
      <div className="reminder" role="alert">
        <div className="reminder-inner">
          <div className="reminder-top">
            <span className="reminder-icon">
              <BellRinging size={17} />
            </span>
            <div className="reminder-copy">
              <div className="reminder-kicker">
                <Clock size={10} />
                系统通知 · 24 小时制
              </div>
              <div className="reminder-title">{title}</div>
              <div className="reminder-meta">
                <span>{kindLabel} · {categoryName}</span>
                <span className="sep" />
                <span className="num">截止 {fmtDateTime(dueDate, dueTime)}</span>
              </div>
              <div className="reminder-rule">
                提醒规则 {reminder ?? '提前 2 天 · 09:30'} · 精确到分钟
              </div>
            </div>
            <button type="button" className="reminder-close" onClick={onClose} aria-label="关闭提醒">
              <X size={14} />
            </button>
          </div>
          <div className="reminder-actions">
            <button
              type="button"
              className="btn primary sm"
              onClick={() => {
                onComplete()
                onClose()
              }}
            >
              <span className="icon-circle">
                <Check size={10} weight="bold" />
              </span>
              完成
            </button>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => {
                onSnooze()
                onClose()
              }}
            >
              稍后 10 分钟
            </button>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => {
                onOpen()
                onClose()
              }}
            >
              打开
            </button>
          </div>
          <div className="reminder-timer">
            <i />
          </div>
        </div>
      </div>
    </div>
  )
}
