import { test, expect } from '@playwright/test'
import { closeApp, createUserData, launchApp } from './helpers.mjs'
import fs from 'node:fs/promises'

test.describe('Q-Panel Electron shell', () => {
  test('launches as a native panel without the simulated desktop', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    try {
      await expect(page).toHaveTitle('Q-Panel')
      await expect(page.locator('.qp-root.electron-mode')).toHaveCount(1)
      await expect(page.locator('.wallpaper')).toHaveCount(0)
      await expect(page.locator('.menubar')).toHaveCount(0)
      await expect(page.locator('.panel')).toBeVisible()
      await expect(page.locator('.page-title')).toHaveText(/Q4\s*季度规划/)
      await expect(page.locator('.qp-root')).toHaveAttribute('data-save-state', /saved/)
    } finally {
      await closeApp(app, userData)
    }
  })

  test('persists a new bookmark across an app restart', async () => {
    const userData = await createUserData()
    let app
    try {
      const first = await launchApp(userData)
      app = first.app
      const page = first.page
      await page.locator('.nav-item:has-text("收藏链接")').click()
      await page.locator('.links-head .btn.primary').click()
      await page.locator('.link-url-field input').fill('https://example.com/electron-persist')
      await page.locator('#link-title').fill('Electron 持久化验证')
      await page.locator('#link-desc').fill('关闭应用再打开后仍然存在。')
      const savedBefore = Number(await page.getAttribute('.qp-root', 'data-save-seq') ?? 0)
      await page.locator('.link-editor-modal .modal-foot .btn.primary').click()
      await expect(page.locator('.library-row').filter({ hasText: 'Electron 持久化验证' })).toHaveCount(1)
      await expect.poll(async () => Number(await page.getAttribute('.qp-root', 'data-save-seq'))).toBeGreaterThan(savedBefore)
      await expect(page.locator('.qp-root')).toHaveAttribute('data-save-state', 'saved')
      await closeApp(app, null)
      app = undefined

      const second = await launchApp(userData)
      app = second.app
      await second.page.locator('.nav-item:has-text("收藏链接")').click()
      await expect(second.page.locator('.library-row').filter({ hasText: 'Electron 持久化验证' })).toHaveCount(1)
    } finally {
      if (app) await closeApp(app, null)
      await fs.rm(userData, { recursive: true, force: true })
    }
  })

  test('collapses to the native notch and expands from it', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    try {
      await page.keyboard.press('Escape')
      const notchPage = await expect
        .poll(() => app.windows().find((candidate) => candidate.url().includes('notch=1')))
        .not.toBeUndefined()
        .then(() => app.windows().find((candidate) => candidate.url().includes('notch=1')))
      expect(notchPage).toBeTruthy()
      await notchPage.waitForSelector('[data-notch="true"]', { timeout: 10_000 })
      await expect(notchPage.locator('.notch')).toBeVisible()
      await expect.poll(async () => {
        return app.evaluate(({ BrowserWindow }) => {
          const panel = BrowserWindow.getAllWindows().find((window) => !window.webContents.getURL().includes('notch=1'))
          return panel?.isVisible() ?? false
        })
      }).toBe(false)
      await notchPage.locator('.notch').click()
      await expect.poll(async () => {
        return app.evaluate(({ BrowserWindow }) => {
          const panel = BrowserWindow.getAllWindows().find((window) => !window.webContents.getURL().includes('notch=1'))
          return panel?.isVisible() ?? false
        })
      }).toBe(true)
      await expect(page.locator('.panel')).toBeVisible()
    } finally {
      await closeApp(app, userData)
    }
  })
})
