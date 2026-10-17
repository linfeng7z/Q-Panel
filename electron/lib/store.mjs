import { promises as fs } from 'node:fs'
import path from 'node:path'

const MAX_WORKSPACE_BYTES = 8 * 1024 * 1024
const BACKUP_KEEP_DAYS = 14

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export class WorkspaceStore {
  constructor(userDataDir) {
    this.dir = userDataDir
    this.filePath = path.join(userDataDir, 'workspace.json')
    this.backupDir = path.join(userDataDir, 'backups')
  }

  async load() {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8')
      if (Buffer.byteLength(raw, 'utf8') > MAX_WORKSPACE_BYTES) {
        return { ok: false, error: 'workspace_too_large' }
      }
      const data = JSON.parse(raw)
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { ok: false, error: 'invalid_workspace' }
      }
      return { ok: true, data, path: this.filePath }
    } catch (error) {
      if (error?.code === 'ENOENT') return { ok: true, data: null, path: this.filePath }
      return { ok: false, error: 'read_failed', message: error instanceof Error ? error.message : String(error) }
    }
  }

  async save(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return { ok: false, error: 'invalid_workspace' }
    }
    const serialized = JSON.stringify(payload, null, 2)
    if (Buffer.byteLength(serialized, 'utf8') > MAX_WORKSPACE_BYTES) {
      return { ok: false, error: 'workspace_too_large' }
    }

    await fs.mkdir(this.dir, { recursive: true })
    await this.#backupIfNeeded()
    const tmpPath = `${this.filePath}.${process.pid}.tmp`
    const handle = await fs.open(tmpPath, 'w')
    try {
      await handle.writeFile(serialized, 'utf8')
      await handle.sync()
    } finally {
      await handle.close()
    }
    await fs.rename(tmpPath, this.filePath)
    return { ok: true, savedAt: new Date().toISOString(), path: this.filePath }
  }

  async #backupIfNeeded() {
    try {
      const existing = await fs.readFile(this.filePath)
      await fs.mkdir(this.backupDir, { recursive: true })
      const backupPath = path.join(this.backupDir, `workspace-${dateKey()}.json`)
      try {
        await fs.access(backupPath)
      } catch {
        await fs.writeFile(backupPath, existing)
      }
      const entries = await fs.readdir(this.backupDir)
      const backups = entries
        .filter((entry) => /^workspace-\d{4}-\d{2}-\d{2}\.json$/.test(entry))
        .sort()
      for (const stale of backups.slice(0, Math.max(0, backups.length - BACKUP_KEEP_DAYS))) {
        await fs.rm(path.join(this.backupDir, stale), { force: true })
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
  }
}
