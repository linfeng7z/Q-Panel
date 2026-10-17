import test from 'node:test'
import assert from 'node:assert/strict'
import { ReminderScheduler, collectReminderEntries, parseReminderRule } from '../lib/reminders.mjs'

test('parses supported reminder rules', () => {
  assert.deepEqual(parseReminderRule('提前 2 天 · 09:30'), { daysBefore: 2, time: '09:30' })
  assert.deepEqual(parseReminderRule('提前 1 周 · 08:15'), { daysBefore: 7, time: '08:15' })
  assert.deepEqual(parseReminderRule('当天 · 18:00'), { daysBefore: 0, time: '18:00' })
  assert.equal(parseReminderRule('无提醒'), null)
  assert.equal(parseReminderRule(''), null)
})

test('collects task, objective and project reminders and skips done items', () => {
  const workspace = {
    tasks: [
      { id: 't1', title: 'Task', dueDate: '2026-10-31', dueTime: '18:00', reminder: '提前 2 天 · 09:30', categoryId: 'appsec' },
      { id: 't2', title: 'Done task', done: true, dueDate: '2026-10-31', reminder: '提前 2 天 · 09:30' },
    ],
    objectives: {
      '2026-Q4': [
        { id: 'o1', title: 'Objective', dueDate: '2026-11-02', dueTime: '18:00', reminder: '提前 1 周 · 08:15', status: 'in_progress', categoryId: 'secops' },
      ],
    },
    projects: [
      { id: 'p1', title: 'Project', endDate: '2026-12-31', endTime: '18:00', reminder: '提前 3 天 · 09:00', status: 'risk', categoryId: 'team' },
    ],
  }
  const entries = collectReminderEntries(workspace)
  assert.equal(entries.length, 3)
  assert.equal(entries.find((entry) => entry.id === 't1').remindAt, '2026-10-29T01:30:00.000Z')
  assert.equal(entries.find((entry) => entry.id === 'o1').remindAt, '2026-10-26T00:15:00.000Z')
  assert.equal(entries.some((entry) => entry.id === 't2'), false)
})

test('scheduler catches up missed reminders and respects fired/snoozed state', () => {
  const workspace = {
    tasks: [
      {
        id: 't1',
        title: 'Task',
        dueDate: '2026-10-31',
        dueTime: '18:00',
        reminder: '提前 2 天 · 09:30',
        categoryId: 'appsec',
      },
    ],
    objectives: {},
    projects: [],
  }
  const scheduler = new ReminderScheduler({
    now: () => new Date('2026-10-29T10:00:00+08:00'),
    onDue: () => {},
  })
  const key = 'task:t1'
  const missedResult = scheduler.sync(workspace, {
    lastRunAt: '2026-10-29T08:00:00+08:00',
    fired: {},
    snoozed: {},
  })
  assert.equal(missedResult.missed.length, 1)
  const firedResult = scheduler.sync(workspace, {
    lastRunAt: '2026-10-29T08:00:00+08:00',
    fired: { [key]: '2026-10-29T09:30:00+08:00' },
    snoozed: {},
  })
  assert.equal(firedResult.missed.length, 0)
  assert.equal(firedResult.scheduled, 0)
  const snoozedResult = scheduler.sync(workspace, {
    lastRunAt: '2026-10-29T08:00:00+08:00',
    fired: {},
    snoozed: { [key]: '2026-10-29T10:10:00+08:00' },
  })
  assert.equal(snoozedResult.scheduled, 1)
  scheduler.clear()
})
