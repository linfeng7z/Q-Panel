import test from 'node:test'
import assert from 'node:assert/strict'
import { collectReminderEntries, parseReminderRule } from '../lib/reminders.mjs'

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
