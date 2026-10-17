import { test, expect } from '@playwright/test'
import { closeApp, createUserData, launchApp } from './helpers.mjs'

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
