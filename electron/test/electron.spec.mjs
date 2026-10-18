import { test, expect } from '@playwright/test'
import { closeApp, createUserData, launchApp } from './helpers.mjs'
import fs from 'node:fs/promises'
import path from 'node:path'

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

test('loads and migrates a schema-v1 workspace', async () => {
  const userData = await createUserData()
  await fs.mkdir(userData, { recursive: true })
  await fs.writeFile(
    path.join(userData, 'workspace.json'),
    JSON.stringify({
      schemaVersion: 1,
      theme: 'aurora',
      view: 'links',
      year: 2026,
      quarter: 4,
      weekKey: '2026-W42',
      tasks: [],
      objectives: { '2026-Q4': [] },
      projects: [],
      notes: [],
      links: [
        {
          id: 'legacy-link',
          title: '旧版迁移链接',
          url: 'https://example.com/legacy',
          domain: 'example.com',
          categoryId: 'standards',
          description: '来自 schema v1 工作区。',
          letter: '旧',
        },
      ],
    }),
    'utf8',
  )
  const { app, page } = await launchApp(userData)
  try {
    await expect(page.locator('.qp-root')).toHaveAttribute('data-theme', 'aurora')
    await expect(page.locator('.page-title')).toHaveText('收藏链接')
    await expect(page.locator('.library-row').filter({ hasText: '旧版迁移链接' })).toHaveCount(1)
    await expect.poll(async () => {
      const raw = await fs.readFile(path.join(userData, 'workspace.json'), 'utf8')
      return JSON.parse(raw).schemaVersion
    }).toBe(2)
  } finally {
    await closeApp(app, userData)
  }
})

test('persists user preferences across an app restart', async () => {
  const userData = await createUserData()
  let app
  try {
    const first = await launchApp(userData)
    app = first.app
    const page = first.page
    const startSeq = Number(await page.locator('.qp-root').getAttribute('data-save-seq'))
    await page.locator('.icon-btn[title="设置"]').click()
    const autoLaunch = page.locator('.settings-row', { hasText: '开机自动启动' }).locator('.toggle')
    await expect(autoLaunch).toHaveAttribute('aria-checked', 'true')
    await autoLaunch.click()
    await expect(autoLaunch).toHaveAttribute('aria-checked', 'false')
    const defaultView = page.locator('.settings-row', { hasText: '默认展开页' }).locator('.select-menu-trigger')
    await defaultView.click()
    await page.locator('.select-menu-pop [role="option"]').filter({ hasText: '本周安排' }).click()
    await page.locator('input[aria-label="背景模糊度"]').fill('72')
    await expect(page.locator('.settings-modal .modal-foot')).toHaveCount(0)
    await expect(page.locator('input[aria-label="背景遮罩"]')).toHaveCount(0)
    await page.mouse.click(20, 20)
    await expect(page.locator('.settings-modal')).toHaveCount(0)
    await expect.poll(async () => Number(await page.locator('.qp-root').getAttribute('data-save-seq'))).toBeGreaterThan(startSeq)
    await expect.poll(async () => {
      const raw = await fs.readFile(path.join(userData, 'workspace.json'), 'utf8')
      return JSON.parse(raw).view
    }).toBe('week')
    await closeApp(app, null)
    app = undefined

    const second = await launchApp(userData)
    app = second.app
    const secondPage = second.page
    await expect(secondPage.locator('.page-title')).toContainText('第 42 周')
    await secondPage.locator('.icon-btn[title="设置"]').click()
    await expect(secondPage.locator('.settings-row', { hasText: '开机自动启动' }).locator('.toggle')).toHaveAttribute('aria-checked', 'false')
    await expect(secondPage.locator('.settings-row', { hasText: '默认展开页' }).locator('.select-menu-trigger')).toContainText('本周安排')
    await expect(secondPage.locator('input[aria-label="背景模糊度"]')).toHaveValue('72')
    await expect(secondPage.locator('.qp-root')).toHaveAttribute('style', /--panel-blur: 72px/)
  } finally {
    if (app) await closeApp(app, userData)
    else await fs.rm(userData, { recursive: true, force: true })
  }
})

test('manages years explicitly instead of preloading future years', async () => {
  const userData = await createUserData()
  const { app, page } = await launchApp(userData)
  try {
    await page.locator('.period-btn').click()
    const years = page.locator('.year-btn')
    await expect(years).toHaveText(['2026'])
    await expect(page.locator('.year-delete')).toHaveCount(0)
    await page.locator('.year-add').click()
    await expect(years).toHaveText(['2026', '2027'])
    await expect(years.filter({ hasText: '2029' })).toHaveCount(0)
    await page.locator('.year-delete').click()
    await expect(years).toHaveText(['2026'])
    await expect(years.filter({ hasText: '2026' })).toHaveClass(/active/)
  } finally {
    await closeApp(app, userData)
  }
})

test('starts collapsed on the notch, expands on click and hides on blur', async () => {
  const userData = await createUserData()
  const { app } = await launchApp(userData, { Q_PANEL_START_EXPANDED: '0' })
  try {
    await expect.poll(async () => {
      return app.evaluate(({ BrowserWindow }) => {
        const windows = BrowserWindow.getAllWindows()
        const main = windows.find((window) => !window.webContents.getURL().includes('notch=1'))
        const notch = windows.find((window) => window.webContents.getURL().includes('notch=1'))
        return {
          mainVisible: Boolean(main?.isVisible()),
          notchVisible: Boolean(notch?.isVisible()),
          notchBounds: notch?.getBounds(),
          notchTop: notch?.isAlwaysOnTop(),
        }
      })
    }).toMatchObject({
      mainVisible: false,
      notchVisible: true,
      notchBounds: { y: -33, width: 200, height: 76 },
      notchTop: true,
    })

    const notchPage = app.windows().find((page) => page.url().includes('notch=1'))
    expect(notchPage).toBeTruthy()
    await notchPage.locator('.notch').hover()
    await expect
      .poll(async () => Number(await notchPage.locator('.notch').evaluate((node) => getComputedStyle(node, '::after').opacity)))
      .toBeGreaterThan(0.2)
    const motion = await notchPage.locator('.notch').evaluate((node) => {
      const style = getComputedStyle(node, '::after')
      return { clip: style.clipPath, animation: style.animationName, iterations: style.animationIterationCount }
    })
    expect(motion).toEqual({ clip: 'none', animation: 'notch-optical-scan', iterations: '1' })
    await notchPage.locator('.notch').click()
    await expect.poll(async () => {
      return app.evaluate(({ BrowserWindow }) => {
        const main = BrowserWindow.getAllWindows().find((window) => !window.webContents.getURL().includes('notch=1'))
        return { visible: Boolean(main?.isVisible()), top: main?.isAlwaysOnTop() }
      })
    }).toMatchObject({ visible: true, top: true })

    // Clicking the notch while expanded must collapse the panel again.
    await notchPage.locator('.notch').click()
    await expect.poll(async () => {
      return app.evaluate(({ BrowserWindow }) => {
        const windows = BrowserWindow.getAllWindows()
        const main = windows.find((window) => !window.webContents.getURL().includes('notch=1'))
        const notch = windows.find((window) => window.webContents.getURL().includes('notch=1'))
        return { mainVisible: Boolean(main?.isVisible()), notchVisible: Boolean(notch?.isVisible()) }
      })
    }).toMatchObject({ mainVisible: false, notchVisible: true })

    // ...and clicking it again re-opens the panel.
    await notchPage.locator('.notch').click()
    await expect.poll(async () => {
      return app.evaluate(({ BrowserWindow }) => {
        const main = BrowserWindow.getAllWindows().find((window) => !window.webContents.getURL().includes('notch=1'))
        return Boolean(main?.isVisible())
      })
    }).toBe(true)

    // Clicking outside (blur) also collapses the panel.
    await app.evaluate(({ BrowserWindow }) => {
      const main = BrowserWindow.getAllWindows().find((window) => !window.webContents.getURL().includes('notch=1'))
      main?.blur()
    })
    await expect.poll(async () => {
      return app.evaluate(({ BrowserWindow }) => {
        const windows = BrowserWindow.getAllWindows()
        const main = windows.find((window) => !window.webContents.getURL().includes('notch=1'))
        const notch = windows.find((window) => window.webContents.getURL().includes('notch=1'))
        return { mainVisible: Boolean(main?.isVisible()), notchVisible: Boolean(notch?.isVisible()) }
      })
    }).toMatchObject({ mainVisible: false, notchVisible: true })
  } finally {
    await closeApp(app, userData)
  }
})

test('dismisses a create modal when clicking outside it', async () => {
  const userData = await createUserData()
  const { app, page } = await launchApp(userData)
  try {
    await page.locator('.nav-item:has-text("本周安排")').click()
    await page.getByRole('button', { name: '新建事项' }).click()
    await expect(page.locator('.create-modal')).toBeVisible()
    await page.mouse.click(20, 20)
    await expect(page.locator('.create-modal')).toHaveCount(0)
  } finally {
    await closeApp(app, userData)
  }
})
