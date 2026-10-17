import type { CSSProperties, ReactNode } from 'react'
import { Check } from '@phosphor-icons/react'
import type { CategoryId, ObjectiveStatus } from '../types'
import { STATUS_LABEL, getCategory } from '../data/mock'
import { cn } from '../utils'

export function catStyle(catId: CategoryId): CSSProperties {
  const cat = getCategory(catId)
  return { '--cat': `var(${cat.colorVar})` } as CSSProperties
}

export function Card({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode
  className?: string
  innerClassName?: string
}) {
  return (
    <div className={cn('bezel', className)}>
      <div className={cn('bezel-inner', innerClassName)}>{children}</div>
    </div>
  )
}

export function Dot({ catId, className }: { catId: CategoryId; className?: string }) {
  return <span className={cn('dot', className)} style={catStyle(catId)} />
}

export function CheckBox({
  on,
  onToggle,
  label,
}: {
  on: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button
      type="button"
      className={cn('check', on && 'on')}
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
      aria-label={label}
      aria-pressed={on}
    >
      <Check size={11} weight="bold" />
    </button>
  )
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      className={cn('toggle', on && 'on')}
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
    />
  )
}

export function Progress({
  value,
  catId,
  className,
}: {
  value: number
  catId?: CategoryId
  className?: string
}) {
  return (
    <div className={cn('bar', className)} style={catId ? catStyle(catId) : undefined}>
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function StatusChip({ status }: { status: ObjectiveStatus }) {
  const cls = status === 'in_progress' ? 'in_progress' : status
  return (
    <span className={cn('status', cls)}>
      <span className="mini-dot" />
      {STATUS_LABEL[status]}
    </span>
  )
}

export function Ring({
  value,
  size = 74,
  stroke = 6,
  catId,
}: {
  value: number
  size?: number
  stroke?: number
  catId?: CategoryId
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const length = Math.max(0, Math.min(1, value / 100)) * circumference
  return (
    <div
      className="week-ring"
      style={{ width: size, height: size, ...(catId ? catStyle(catId) : {}) }}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--cat, var(--text-1))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${length} ${circumference - length}`}
          style={{ transition: 'stroke-dasharray 0.7s var(--ease)' }}
        />
      </svg>
      <div className="ring-center">
        <b>{Math.round(value)}%</b>
        <span>完成</span>
      </div>
    </div>
  )
}

export function Donut({
  segments,
  centerValue,
  centerLabel,
  size = 88,
  stroke = 9,
}: {
  segments: Array<{ value: number; color: string }>
  centerValue: string
  centerLabel: string
  size?: number
  stroke?: number
}) {
  const total = Math.max(
    1,
    segments.reduce((sum, item) => sum + item.value, 0),
  )
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const arcs = segments.map((segment, index) => {
    const length = (segment.value / total) * circumference
    const visible = Math.max(0, length - 2.5)
    const prefix = segments
      .slice(0, index)
      .reduce((sum, item) => sum + (item.value / total) * circumference, 0)
    return (
      <circle
        key={index}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={segment.color}
        strokeWidth={stroke}
        strokeDasharray={`${visible} ${circumference - visible}`}
        strokeDashoffset={-prefix}
        style={{ transition: 'stroke-dasharray 0.6s var(--ease)' }}
      />
    )
  })
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={stroke}
        />
        {arcs}
      </svg>
      <div className="ring-center">
        <b>{centerValue}</b>
        <span>{centerLabel}</span>
      </div>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  sub,
  action,
}: {
  icon: ReactNode
  title: string
  sub?: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {sub ? <div className="empty-sub">{sub}</div> : null}
      {action}
    </div>
  )
}
