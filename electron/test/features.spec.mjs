import { test, expect } from '@playwright/test'
import { closeApp, createUserData, launchApp } from './helpers.mjs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

function collectPageErrors(page) {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return errors
}

test.describe('Q-Panel feature regression', () => {
  test('navigates all six views, all skins and the command palette', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    const errors = collectPageErrors(page)
    try {
      const expected = [
        ['本周安排', '第 42 周'],
        ['项目', '全局项目'],
        ['容量与复盘', '容量与复盘'],
        ['临时笔记', '临时笔记'],
        ['收藏链接', '收藏链接'],
        ['季度规划', '季度规划'],
      ]
      for (const [nav, title] of expected) {
        await page.locator(`.nav-item:has-text("${nav}")`).click()
        await expect(page.locator('.page-title')).toContainText(title)
      }

      await expect(page.locator('.capacity-stat .stat-value').nth(0)).toContainText('60')
      await expect(page.locator('.capacity-stat .stat-value').nth(1)).toContainText('58.5')
      await expect(page.locator('.capacity-stat .stat-value').nth(2)).toContainText('1.5')

      await page.locator('.icon-btn[title="切换皮肤"]').click()
      await expect(page.locator('.qp-root')).toHaveAttribute('data-theme', 'ops')
      await page.locator('.icon-btn[title="切换皮肤"]').click()
      await expect(page.locator('.qp-root')).toHaveAttribute('data-theme', 'aurora')
      await page.locator('.icon-btn[title="切换皮肤"]').click()
      await expect(page.locator('.qp-root')).toHaveAttribute('data-theme', 'ember')
      await page.locator('.icon-btn[title="切换皮肤"]').click()
      await expect(page.locator('.qp-root')).toHaveAttribute('data-theme', 'noir')

      await page.keyboard.press('Meta+k')
      await expect(page.locator('.cmd-panel')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.locator('.cmd-panel')).toHaveCount(0)
      expect(errors).toEqual([])
    } finally {
      await closeApp(app, userData)
    }
  })

  test('creates a week task, opens the reminder popup and confirms an AI proposal', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    const errors = collectPageErrors(page)
    try {
      await page.locator('.nav-item:has-text("本周安排")').click()
      await page.getByRole('button', { name: '新建事项' }).click()
      await expect(page.locator('.create-modal .dt-trigger')).toContainText('24H')
      await page.locator('.create-modal .input').first().fill('Electron 全功能验证事项')
      await page.locator('.create-modal .modal-foot .btn.primary').click()
      await expect(page.getByText('Electron 全功能验证事项').first()).toBeVisible()

      await page.locator('.topbar-right .icon-btn[title="提醒演示"]').click()
      await expect(page.locator('.reminder')).toBeVisible()
      await expect(page.locator('.reminder')).toContainText('2026-10-31 18:00')
      await page.locator('.reminder-actions .btn.primary').click()
      await expect(page.locator('.toast')).toBeVisible()

      await page.locator('.ai-pill').click()
      await expect(page.locator('.ai-drawer')).toBeVisible()
      await page.locator('.ai-suggest').first().click()
      await expect(page.locator('.ai-proposal')).toBeVisible({ timeout: 8_000 })
      await page.locator('.ai-proposal-actions .btn.primary').click()
      await expect(page.locator('.toast')).toBeVisible()
      await page.locator('.ai-close').click()
      expect(errors).toEqual([])
    } finally {
      await closeApp(app, userData)
    }
  })

  test('adds and removes a leave day, recomputing Q4 capacity', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    const errors = collectPageErrors(page)
    try {
      await page.locator('.icon-btn[title="设置"]').click()
      await page.locator('.settings-tab:has-text("人日与日历")').click()
      await page.locator('input[aria-label="请假日期"]').fill('2026-11-05')
      await page.locator('input[aria-label="请假说明"]').fill('培训')
      await page.locator('.calendar-adjust-form .btn').click()
      await expect(page.locator('.calendar-adjust-row').filter({ hasText: '2026-11-05' })).toHaveCount(1)
      await page.locator('.settings-modal .modal-close').click()
      await expect
        .poll(async () => page.locator('.capacity-stat .stat-value').nth(0).innerText())
        .toContain('59')

      await page.locator('.icon-btn[title="设置"]').click()
      await page.locator('.settings-tab:has-text("人日与日历")').click()
      const leaveRow = page.locator('.calendar-adjust-row').filter({ hasText: '2026-11-05' })
      await leaveRow.locator('.icon-btn').click()
      await page.locator('.settings-modal .modal-close').click()
      await expect
        .poll(async () => page.locator('.capacity-stat .stat-value').nth(0).innerText())
        .toContain('60')
      expect(errors).toEqual([])
    } finally {
      await closeApp(app, userData)
    }
  })

  test('exports and imports the full workspace through native file IO', async () => {
    const ioDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qpanel-native-io-'))
    const exportPath = path.join(ioDir, 'workspace-export.json')
    const firstUserData = await createUserData()
    let app
    try {
      const first = await launchApp(firstUserData, { Q_PANEL_TEST_EXPORT_PATH: exportPath })
      app = first.app
      const page = first.page
      await page.locator('.nav-item:has-text("收藏链接")').click()
      await page.locator('.links-head .btn.primary').click()
      await page.locator('.link-url-field input').fill('https://example.com/native-export')
      await page.locator('#link-title').fill('原生导入导出验证')
      await page.locator('.link-editor-modal .modal-foot .btn.primary').click()
      await expect(page.locator('.library-row').filter({ hasText: '原生导入导出验证' })).toHaveCount(1)

      await page.locator('.icon-btn[title="设置"]').click()
      await page.locator('.settings-tab:has-text("数据")').click()
      await page.getByRole('button', { name: '导出 JSON' }).click()
      await expect.poll(async () => {
        const raw = await fs.readFile(exportPath, 'utf8').catch(() => '')
        return raw.includes('原生导入导出验证')
      }).toBe(true)
      const exported = JSON.parse(await fs.readFile(exportPath, 'utf8'))
      expect(exported.schemaVersion).toBe(2)
      await closeApp(app, null)
      app = undefined

      const secondUserData = await createUserData()
      const second = await launchApp(secondUserData, { Q_PANEL_TEST_IMPORT_PATH: exportPath })
      app = second.app
      const secondPage = second.page
      await secondPage.locator('.icon-btn[title="设置"]').click()
      await secondPage.locator('.settings-tab:has-text("数据")').click()
      await secondPage.getByRole('button', { name: '导入 JSON' }).click()
      await expect(secondPage.locator('.toast')).toBeVisible()
      await secondPage.locator('.settings-modal .modal-close').click()
      await secondPage.locator('.nav-item:has-text("收藏链接")').click()
      await expect(secondPage.locator('.library-row').filter({ hasText: '原生导入导出验证' })).toHaveCount(1)
      await fs.rm(secondUserData, { recursive: true, force: true })
    } finally {
      if (app) await closeApp(app, null)
      await fs.rm(firstUserData, { recursive: true, force: true })
      await fs.rm(ioDir, { recursive: true, force: true })
    }
  })

  test('receives a native reminder through IPC', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    const errors = collectPageErrors(page)
    try {
      await page.locator('.icon-btn[title="设置"]').click()
      await expect(page.locator('.settings-modal')).toBeVisible()
      await page.locator('.settings-tab:has-text("提醒")').click()
      await page.getByRole('button', { name: '测试' }).click()
      await expect(page.locator('.reminder')).toBeVisible()
      await expect(page.locator('.reminder')).toContainText('提醒链路验证')
      await expect(page.locator('.reminder')).toContainText('2026-10-31 18:00')
      await page.getByRole('button', { name: '稍后 10 分钟' }).click()
      await expect(page.locator('.reminder')).toHaveCount(0)
      await expect.poll(async () => {
        const raw = await fs.readFile(path.join(userData, 'reminder-state.json'), 'utf8').catch(() => '{}')
        return Boolean(JSON.parse(raw).snoozed?.['test:reminder'])
      }).toBe(true)
      expect(errors).toEqual([])
    } finally {
      await closeApp(app, userData)
    }
  })

  test('opens project detail, settings and notes without errors', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    const errors = collectPageErrors(page)
    try {
      await page.locator('.nav-item:has-text("项目")').click()
      await page.locator('.project-overview-row').first().click()
      await expect(page.locator('.project-detail-view')).toBeVisible()
      await expect(page.locator('.project-scope-line')).toContainText('本季度')

      await page.locator('.icon-btn[title="设置"]').click()
      await expect(page.locator('.settings-modal')).toBeVisible()
      await page.locator('.settings-tab:has-text("分类")').click()
      await page.locator('.settings-tab:has-text("数据")').click()
      await page.locator('.settings-modal .modal-close').click()

      await page.locator('.nav-item:has-text("临时笔记")').click()
      await expect(page.locator('.page-title')).toContainText('临时笔记')
      expect(errors).toEqual([])
    } finally {
      await closeApp(app, userData)
    }
  })
})
