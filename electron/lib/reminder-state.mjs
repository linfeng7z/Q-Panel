import { promises as fs } from 'node:fs'
import path from 'node:path'

const EMPTY_STATE = () => ({
  schemaVersion: 1,
  lastRunAt: null,
  fired: {},
  snoozed: {},
})

export class ReminderStateStore {
  constructor(userDataDir) {
    this.filePath = path.join(userDataDir, 'reminder-state.json')
    this.data = EMPTY_STATE()
  }

  async load() {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8')
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') return { ...EMPTY_STATE() }
      this.data = {
        schemaVersion: 1,
        lastRunAt: typeof parsed.lastRunAt === 'string' ? parsed.lastRunAt : null,
        fired: parsed.fired && typeof parsed.fired === 'object' ? parsed.fired : {},
        snoozed: parsed.snoozed && typeof parsed.snoozed === 'object' ? parsed.snoozed : {},
      }
    } catch {
      this.data = EMPTY_STATE()
    }
    return this.data
  }

  async save() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true })
    const serialized = JSON.stringify(this.data, null, 2)
    const temp = `${this.filePath}.${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`
    const handle = await fs.open(temp, 'w')
    try {
      await handle.writeFile(serialized, 'utf8')
      await handle.sync()
    } finally {
      await handle.close()
    }
    await fs.rename(temp, this.filePath)
  }

  markFired(key, at = new Date()) {
    this.data.fired[key] = at.toISOString()
    delete this.data.snoozed[key]
    const cutoff = at.getTime() - 30 * 24 * 60 * 60 * 1000
    for (const [firedKey, value] of Object.entries(this.data.fired)) {
      if (Date.parse(value) < cutoff) delete this.data.fired[firedKey]
    }
  }

  snooze(key, until) {
    this.data.snoozed[key] = until.toISOString()
    delete this.data.fired[key]
  }

  setLastRunAt(at = new Date()) {
    this.data.lastRunAt = at.toISOString()
  }
}
