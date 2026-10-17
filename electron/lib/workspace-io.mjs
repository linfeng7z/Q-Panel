import { promises as fs } from 'node:fs'

export const CURRENT_SCHEMA_VERSION = 2
const MAX_WORKSPACE_BYTES = 8 * 1024 * 1024

export function normalizeWorkspace(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'invalid_workspace' }
  }
  const version = Number.isInteger(value.schemaVersion) ? value.schemaVersion : 1
  if (version > CURRENT_SCHEMA_VERSION) {
    return { ok: false, error: 'unsupported_version', version }
  }
  if (!Array.isArray(value.tasks) || !Array.isArray(value.projects) || !Array.isArray(value.links)) {
    return { ok: false, error: 'invalid_workspace' }
  }
  if (!value.objectives || typeof value.objectives !== 'object' || Array.isArray(value.objectives)) {
    return { ok: false, error: 'invalid_workspace' }
  }
  const data = { ...value, schemaVersion: CURRENT_SCHEMA_VERSION }
  return { ok: true, data, fromVersion: version, migrated: version < CURRENT_SCHEMA_VERSION }
}

export async function exportWorkspaceFile(destination, payload) {
  const normalized = normalizeWorkspace(payload)
  if (!normalized.ok) return normalized
  const serialized = JSON.stringify(normalized.data, null, 2)
  if (Buffer.byteLength(serialized, 'utf8') > MAX_WORKSPACE_BYTES) {
    return { ok: false, error: 'workspace_too_large' }
  }
  await fs.writeFile(destination, `${serialized}\n`, 'utf8')
  return { ok: true, path: destination, bytes: Buffer.byteLength(serialized, 'utf8') }
}

export async function importWorkspaceFile(source) {
  try {
    const stat = await fs.stat(source)
    if (!stat.isFile()) return { ok: false, error: 'not_a_file' }
    if (stat.size > MAX_WORKSPACE_BYTES) return { ok: false, error: 'workspace_too_large' }
    const raw = await fs.readFile(source, 'utf8')
    const parsed = JSON.parse(raw)
    return normalizeWorkspace(parsed)
  } catch (error) {
    if (error?.code === 'ENOENT') return { ok: false, error: 'not_found' }
    return { ok: false, error: 'invalid_json' }
  }
}
