const DAY_MS = 24 * 60 * 60 * 1000

export function parseReminderRule(text) {
  if (typeof text !== 'string') return null
  const value = text.trim()
  if (!value || value.includes('无提醒')) return null
  const absolute = value.match(/^(?:指定\s*)?(\d{4}-\d{2}-\d{2})\s*·\s*(\d{1,2}):(\d{2})/)
  if (absolute) {
    return { date: absolute[1], time: `${absolute[2].padStart(2, '0')}:${absolute[3]}` }
  }
  const sameDay = value.match(/当天\s*·\s*(\d{1,2}):(\d{2})/)
  if (sameDay) return { daysBefore: 0, time: `${sameDay[1].padStart(2, '0')}:${sameDay[2]}` }
  const match = value.match(/提前\s*(\d+)\s*(天|周)\s*·\s*(\d{1,2}):(\d{2})/)
  if (!match) return null
  const amount = Number(match[1])
  const daysBefore = match[2] === '周' ? amount * 7 : amount
  return { daysBefore, time: `${match[3].padStart(2, '0')}:${match[4]}` }
}

function parseChinaDateTime(dateISO, time = '18:00') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO ?? '')) return null
  if (!/^\d{2}:\d{2}$/.test(time)) return null
  const date = new Date(`${dateISO}T${time}:00+08:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function collectReminderEntries(workspace) {
  if (!workspace || typeof workspace !== 'object') return []
  const entries = []
  const add = (item, kind, title, dueDate, dueTime, reminder, categoryId) => {
    if (!reminder || !title || !dueDate) return
    const rule = parseReminderRule(reminder)
    const dueAt = parseChinaDateTime(dueDate, dueTime ?? '18:00')
    if (!rule || !dueAt) return
    let remindAt
    if (rule.date) {
      remindAt = parseChinaDateTime(rule.date, rule.time)
    } else {
      remindAt = new Date(dueAt.getTime())
      remindAt.setDate(remindAt.getDate() - rule.daysBefore)
      const [hours, minutes] = rule.time.split(':').map(Number)
      remindAt.setHours(hours, minutes, 0, 0)
    }
    if (!remindAt || Number.isNaN(remindAt.getTime())) return
    entries.push({
      key: `${kind}:${item.id}`,
      id: item.id,
      kind,
      title,
      dueDate,
      dueTime: dueTime ?? '18:00',
      reminder,
      categoryId: categoryId ?? null,
      dueAt: dueAt.toISOString(),
      remindAt: remindAt.toISOString(),
    })
  }

  for (const task of Array.isArray(workspace.tasks) ? workspace.tasks : []) {
    if (!task || task.done) continue
    add(task, 'task', task.title, task.endDate ?? task.dueDate, task.dueTime, task.reminder, task.categoryId)
  }
  for (const objectives of Object.values(workspace.objectives ?? {})) {
    if (!Array.isArray(objectives)) continue
    for (const objective of objectives) {
      if (!objective || objective.status === 'done') continue
      add(objective, 'objective', objective.title, objective.endDate ?? objective.dueDate, objective.dueTime, objective.reminder, objective.categoryId)
    }
  }
  for (const project of Array.isArray(workspace.projects) ? workspace.projects : []) {
    if (!project || project.status === 'done') continue
    add(project, 'project', project.title, project.endDate, project.endTime, project.reminder, project.categoryId)
  }
  return entries.sort((a, b) => a.remindAt.localeCompare(b.remindAt))
}

export class ReminderScheduler {
  constructor({ onDue, now = () => new Date(), horizonMs = 20 * DAY_MS } = {}) {
    this.onDue = onDue
    this.now = now
    this.horizonMs = horizonMs
    this.timers = new Map()
  }

  sync(workspace, state = {}) {
    this.clear()
    const now = this.now().getTime()
    const lastRunAt = state.lastRunAt ? Date.parse(state.lastRunAt) : null
    const fired = state.fired && typeof state.fired === 'object' ? state.fired : {}
    const snoozed = state.snoozed && typeof state.snoozed === 'object' ? state.snoozed : {}
    const missed = []
    for (const entry of collectReminderEntries(workspace)) {
      const snoozedAt = snoozed[entry.key] ? Date.parse(snoozed[entry.key]) : null
      if (fired[entry.key] && !snoozedAt) continue
      const targetAt = snoozedAt ?? Date.parse(entry.remindAt)
      const delay = targetAt - now
      if (delay <= 0) {
        const wasSnoozed = snoozedAt !== null
        const inCatchUpWindow = lastRunAt !== null && targetAt > lastRunAt && now - targetAt <= 24 * 60 * 60 * 1000
        if (wasSnoozed || inCatchUpWindow) missed.push(entry)
        continue
      }
      if (delay > this.horizonMs) continue
      const timer = setTimeout(() => {
        this.timers.delete(entry.key)
        this.onDue?.(entry)
      }, delay)
      this.timers.set(entry.key, timer)
    }
    return { missed, scheduled: this.timers.size }
  }

  triggerTest() {
    const entry = {
      key: 'test:reminder',
      id: 'test-reminder',
      kind: 'objective',
      title: '提醒链路验证',
      dueDate: '2026-10-31',
      dueTime: '18:00',
      reminder: '提前 2 天 · 09:30',
      categoryId: 'appsec',
      dueAt: new Date('2026-10-31T18:00:00+08:00').toISOString(),
      remindAt: new Date().toISOString(),
    }
    this.onDue?.(entry)
    return entry
  }

  clear() {
    for (const timer of this.timers.values()) clearTimeout(timer)
    this.timers.clear()
  }
}

export const __test = { parseChinaDateTime }
