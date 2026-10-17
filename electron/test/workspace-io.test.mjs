import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  CURRENT_SCHEMA_VERSION,
  exportWorkspaceFile,
  importWorkspaceFile,
  normalizeWorkspace,
} from '../lib/workspace-io.mjs'

const V1_WORKSPACE = {
  schemaVersion: 1,
  theme: 'noir',
  view: 'quarter',
  year: 2026,
  quarter: 4,
  weekKey: '2026-W42',
  tasks: [],
  objectives: { '2026-Q4': [] },
  projects: [],
  notes: [],
  links: [],
}

test('normalizes an old workspace to the current schema', () => {
  const result = normalizeWorkspace(V1_WORKSPACE)
  assert.equal(result.ok, true)
  assert.equal(result.fromVersion, 1)
  assert.equal(result.migrated, true)
  assert.equal(result.data.schemaVersion, CURRENT_SCHEMA_VERSION)
  assert.deepEqual(result.data.tasks, [])
})

test('rejects future schemas and malformed workspaces', () => {
  assert.equal(normalizeWorkspace({ ...V1_WORKSPACE, schemaVersion: 99 }).error, 'unsupported_version')
  assert.equal(normalizeWorkspace({ schemaVersion: 2, tasks: [] }).error, 'invalid_workspace')
})

test('exports and imports a workspace file', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'qpanel-workspace-io-'))
  const file = path.join(dir, 'workspace.json')
  try {
    const exported = await exportWorkspaceFile(file, V1_WORKSPACE)
    assert.equal(exported.ok, true)
    const imported = await importWorkspaceFile(file)
    assert.equal(imported.ok, true)
    assert.equal(imported.data.schemaVersion, CURRENT_SCHEMA_VERSION)
    assert.equal(imported.data.year, 2026)
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})
