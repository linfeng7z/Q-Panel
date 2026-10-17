/**
 * App clock. Tests and screenshots can freeze time with `?now=...`; the
 * packaged app always uses the real system clock (Asia/Shanghai calendar day).
 */

const DEFAULT_TIME_ZONE = 'Asia/Shanghai'

function parseQueryNow(): Date {
  if (typeof window === 'undefined') return new Date()
  const raw = new URLSearchParams(window.location.search).get('now')
  if (!raw) return new Date()
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

export const APP_NOW = parseQueryNow()

export function chinaDateISO(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

export const APP_TODAY = chinaDateISO(APP_NOW)

export function chinaYear(date: Date): number {
  return Number(new Intl.DateTimeFormat('en-CA', { timeZone: DEFAULT_TIME_ZONE, year: 'numeric' }).format(date))
}

export function chinaQuarter(date: Date): number {
  return Math.floor((Number(new Intl.DateTimeFormat('en-CA', { timeZone: DEFAULT_TIME_ZONE, month: 'numeric' }).format(date)) - 1) / 3) + 1
}
