import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CALENDAR_ADJUSTMENTS,
  calendarDay,
  setCalendarAdjustments,
  monthStats,
  periodStats,
  quarterStats,
  weekStats,
} from '../src/calendar.ts'

test('2026 Q4 capacity matches the accepted plan', () => {
  const stats = quarterStats(2026, 4)
  assert.equal(stats.workdays, 62)
  assert.equal(stats.leaveDays, 2)
  assert.equal(stats.available, 60)
})

test('holiday, makeup day and personal leave are classified correctly', () => {
  assert.deepEqual(calendarDay('2026-10-01'), {
    date: '2026-10-01',
    kind: 'holiday',
    label: '国庆',
    isWorkday: false,
  })
  assert.equal(calendarDay('2026-10-10').kind, 'makeup')
  assert.equal(calendarDay('2026-10-10').isWorkday, true)
  assert.equal(calendarDay('2026-10-20').kind, 'leave')
  assert.equal(calendarDay('2026-10-20').isWorkday, false)
  assert.equal(calendarDay('2026-10-18').kind, 'weekend')
})

test('week and month capacity are derived from the same calendar', () => {
  assert.deepEqual(weekStats('2026-10-12', '2026-10-18'), {
    workdays: 5,
    leaveDays: 0,
    available: 5,
  })
  assert.deepEqual(weekStats('2026-10-19', '2026-10-25'), {
    workdays: 5,
    leaveDays: 2,
    available: 3,
  })
  assert.deepEqual(monthStats(2026, 10), { workdays: 18, leaveDays: 2, available: 16 })
})

test('2026 annual capacity and 2027 estimate are explicit', () => {
  const year = periodStats('2026-01-01', '2026-12-31')
  assert.equal(year.workdays, 247)
  assert.equal(year.leaveDays, 2)
  assert.equal(year.available, 245)
  const estimate = quarterStats(2027, 1)
  assert.equal(estimate.estimated, true)
  assert.match(estimate.note ?? '', /官方放假安排尚未发布/)
})


test('custom leave adjustments recompute capacity', () => {
  const defaults = CALENDAR_ADJUSTMENTS
  try {
    setCalendarAdjustments([
      ...defaults,
      { date: '2026-11-05', kind: 'leave', days: 1, label: '培训' },
    ])
    const withLeave = quarterStats(2026, 4)
    assert.equal(withLeave.workdays, 62)
    assert.equal(withLeave.leaveDays, 3)
    assert.equal(withLeave.available, 59)
  } finally {
    setCalendarAdjustments(defaults)
  }
  assert.equal(quarterStats(2026, 4).available, 60)
})
