import { _electron as electron } from '@playwright/test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export const electronPath = path.resolve(
  'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
)

export async function createUserData() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'qpanel-e2e-'))
}

export async function launchApp(userData, extraEnv = {}) {
  const app = await electron.launch({
    executablePath: electronPath,
    args: ['.'],
    cwd: process.cwd(),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '',
      Q_PANEL_USER_DATA: userData,
      Q_PANEL_NO_NOTIFICATIONS: '1',
      Q_PANEL_NOW: '2026-10-17T19:22:00+08:00',
      ...extraEnv,
    },
    timeout: 60_000,
  })
  await app.firstWindow()
  const deadline = Date.now() + 30_000
  let page
  while (Date.now() < deadline) {
    page = app.windows().find((candidate) => !candidate.url().includes('notch=1') && candidate.url().includes('index.html'))
    if (page) break
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  if (!page) throw new Error('panel window did not appear')
  await page.waitForSelector('.qp-root.electron-mode:not(.notch-mode)', { timeout: 30_000 })
  await page.waitForSelector('[data-hydrated="true"]', { timeout: 30_000 })
  return { app, page }
}

export async function closeApp(app, userData) {
  await app.close()
  if (userData) await fs.rm(userData, { recursive: true, force: true })
}
