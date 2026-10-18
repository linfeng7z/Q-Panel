import { test, expect } from '@playwright/test'
import { closeApp, createUserData, launchApp } from './helpers.mjs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'

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
      await expect(page.locator('.create-modal .date-input')).toHaveCount(2)
      await expect(page.locator('.create-modal .date-range-days')).toContainText('共 1 天')
      await page.locator('.create-modal .input').first().fill('Electron 全功能验证事项')
      await page.locator('.create-modal .modal-foot .btn.primary').click()
      await expect(page.getByText('Electron 全功能验证事项').first()).toBeVisible()

      await page.locator('.topbar-right .icon-btn[title="提醒演示"]').click()
      await expect(page.locator('.reminder')).toBeVisible()
      await expect(page.locator('.reminder')).toContainText('结束 10/31')
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

  test('creates and edits a task with a day range and an hour-only reminder', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    try {
      await page.locator('.nav-item:has-text("本周安排")').click()
      await page.getByRole('button', { name: '新建事项' }).click()
      const modal = page.locator('.create-modal')
      await expect(modal.locator('.date-input')).toHaveCount(2)
      await expect(modal.locator('.date-range-days')).toContainText('共 1 天')
      await modal.locator('.input').first().fill('时间段编辑验证事项')
      await modal.locator('.date-input').nth(0).fill('2026-10-17')
      await modal.locator('.date-input').nth(1).fill('2026-10-18')
      await expect(modal.locator('.date-range-days')).toContainText('共 2 天')
      await modal.locator('select[aria-label="提醒规则"]').selectOption('custom')
      await modal.locator('select[aria-label="提前量"]').selectOption('2')
      await modal.locator('select[aria-label="提醒小时"]').selectOption('14')
      await modal.locator('.modal-foot .btn.primary').click()
      const row = page.locator('.task-row').filter({ hasText: '时间段编辑验证事项' })
      await expect(row).toBeVisible()
      await expect(row).toContainText('10/17 – 10/18')
      await expect(row).toContainText('提前 2 天 · 14:00')
      await row.hover()
      await row.locator('.task-edit-btn').click()
      const edit = page.locator('.modal-layer').filter({ hasText: '编辑本周事项' })
      await expect(edit.locator('.date-input')).toHaveCount(2)
      await edit.locator('.date-input').nth(1).fill('2026-10-19')
      await edit.locator('.modal-foot .btn.primary').click()
      await expect(page.locator('.task-row').filter({ hasText: '时间段编辑验证事项' })).toContainText('10/17 – 10/19')
      await expect(page.locator('.task-row').filter({ hasText: '时间段编辑验证事项' })).toContainText('提前 2 天 · 14:00')
    } finally {
      await closeApp(app, userData)
    }
  })

  test('edits an objective range and a project range in place', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    try {
      await page.locator('.nav-item:has-text("季度规划")').click()
      await page.locator('.obj-row').first().click()
      await page.locator('.modal-foot .btn.primary').click()
      const edit = page.locator('.modal-layer').filter({ hasText: '编辑季度任务' })
      await expect(edit.locator('.date-input')).toHaveCount(2)
      await edit.locator('.date-input').nth(0).fill('2026-10-01')
      await edit.locator('.date-input').nth(1).fill('2026-10-31')
      await edit.locator('.modal-foot .btn.primary').click()
      await expect(page.locator('.obj-row').first()).toContainText('10/1 – 10/31')

      await page.locator('.nav-item:has-text("项目")').click()
      await page.locator('.project-overview-row').first().click()
      const range = page.locator('.project-date-editor .date-input')
      await expect(range).toHaveCount(2)
      const oldEnd = await range.nth(1).inputValue()
      const newEnd = oldEnd === '2026-12-31' ? '2026-12-30' : '2026-12-31'
      await range.nth(1).fill(newEnd)
      await expect(page.locator('.project-date-editor .date-range-days')).toBeVisible()
      await expect(page.locator('.page-sub')).toContainText(newEnd.slice(5).replace('-', '/'))
    } finally {
      await closeApp(app, userData)
    }
  })

  test('creates a project with an explicit day range', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    try {
      await page.locator('.nav-item:has-text("项目")').click()
      await page.getByRole('button', { name: '新建项目' }).click()
      const modal = page.locator('.create-modal')
      await expect(modal.locator('.date-input')).toHaveCount(2)
      await modal.locator('.input').first().fill('时间段验证项目')
      await modal.locator('.date-input').nth(0).fill('2026-11-01')
      await modal.locator('.date-input').nth(1).fill('2026-12-31')
      await expect(modal.locator('.date-range-days')).toContainText('共 61 天')
      await modal.locator('.modal-foot .btn.primary').click()
      await expect(page.locator('.project-overview-row').filter({ hasText: '时间段验证项目' })).toHaveCount(1)
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

  test('auto-fills link metadata through the native fetch bridge', async () => {
    const server = http.createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      response.end('<html><head><title>本地安全指南</title><meta name="description" content="来自本地 fixture 的简介"></head></html>')
    })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const port = server.address().port
    const userData = await createUserData()
    const { app, page } = await launchApp(userData, { Q_PANEL_METADATA_ALLOW_LOOPBACK: '1' })
    const errors = collectPageErrors(page)
    try {
      await page.locator('.nav-item:has-text("收藏链接")').click()
      await page.locator('.links-head .btn.primary').click()
      await page.locator('.link-url-field input').fill(`http://127.0.0.1:${port}/guide`)
      await expect(page.locator('#link-title')).toHaveValue('本地安全指南')
      await expect(page.locator('#link-desc')).toHaveValue('来自本地 fixture 的简介')
      await expect(page.locator('.link-meta-status.success')).toBeVisible()
      expect(errors).toEqual([])
    } finally {
      await closeApp(app, userData)
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('configures an OpenAI-compatible endpoint and generates a real proposal', async () => {
    const server = http.createServer((request, response) => {
      if (request.method === 'POST' && request.url === '/v1/chat/completions') {
        response.writeHead(200, { 'content-type': 'application/json' })
        response.end(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                message: '已根据当前季度生成一条建议。',
                tasks: [{
                  title: 'AI 真实生成事项',
                  categoryId: 'appsec',
                  dueDate: '2026-10-20',
                  dueTime: '18:00',
                  estimateDays: 0.5,
                }],
              }),
            },
          }],
        }))
        return
      }
      response.writeHead(404)
      response.end()
    })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const port = server.address().port
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    const errors = collectPageErrors(page)
    try {
      await page.locator('.icon-btn[title="设置"]').click()
      await page.locator('.settings-tab:has-text("AI 助手")').click()
      await page.locator('input[aria-label="AI Base URL"]').fill(`http://127.0.0.1:${port}/v1`)
      await page.locator('input[aria-label="API Key"]').fill('sk-local-test-key')
      await page.getByRole('button', { name: '保存配置' }).click()
      await expect(page.locator('.settings-ai-status')).toHaveText('已保存')
      await page.getByRole('button', { name: '测试连接' }).click()
      await expect(page.locator('.settings-ai-status')).toHaveText('连接成功', { timeout: 10000 })
      const saved = await fs.readFile(path.join(userData, 'ai-config.json'), 'utf8')
      expect(saved).not.toContain('sk-local-test-key')
      await page.locator('.settings-modal .modal-close').click()

      await page.locator('.ai-pill').click()
      await page.locator('.ai-suggest').filter({ hasText: '拆成本周' }).click()
      await expect(page.locator('.ai-proposal-item')).toContainText('AI 真实生成事项', { timeout: 10000 })
      await expect(page.locator('.ai-msg.bot').filter({ has: page.locator('.ai-proposal') }).last()).toContainText('已根据当前季度生成一条建议')
      await page.getByRole('button', { name: '确认写入' }).click()
      await expect(page.locator('.ai-proposal')).toContainText('已处理')
      expect(errors).toEqual([])
    } finally {
      await closeApp(app, userData)
      await new Promise((resolve) => server.close(resolve))
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
      await expect(page.locator('.reminder')).toContainText('结束 10/31')
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

  test('keeps both note cards equal height and scrolls long content inside the editor', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    try {
      await page.locator('.nav-item:has-text("临时笔记")').click()
      await expect(page.locator('.page-title')).toContainText('临时笔记')
      const cards = page.locator('.note-list-pane, .note-editor-pane')
      await expect(cards).toHaveCount(2)
      const before = await page.evaluate(() => {
        const list = document.querySelector('.note-list-pane').getBoundingClientRect()
        const editor = document.querySelector('.note-editor-pane').getBoundingClientRect()
        return { list: list.height, editor: editor.height }
      })
      expect(before.list).toBeCloseTo(before.editor, 1)

      await page.locator('.note-editor-pane .icon-btn[title="编辑"]').click()
      const long = Array.from({ length: 90 }, (_, i) => `- 第 ${i + 1} 条长内容，用于验证编辑器和预览只在卡片内部滚动。`).join('\n')
      await page.locator('.note-textarea').fill(`# 长笔记\n\n${long}`)
      await page.locator('.note-editor-pane .icon-btn[title="预览"]').click()
      const after = await page.evaluate(() => {
        const list = document.querySelector('.note-list-pane').getBoundingClientRect()
        const editor = document.querySelector('.note-editor-pane').getBoundingClientRect()
        const md = document.querySelector('.md')
        const outer = document.querySelector('.view-scroll')
        return {
          list: list.height,
          editor: editor.height,
          mdClient: md.clientHeight,
          mdScroll: md.scrollHeight,
          outerClient: outer.clientHeight,
          outerScroll: outer.scrollHeight,
        }
      })
      expect(after.list).toBeCloseTo(after.editor, 1)
      expect(after.mdScroll).toBeGreaterThan(after.mdClient)
      expect(after.outerScroll).toBeLessThanOrEqual(after.outerClient + 1)
    } finally {
      await closeApp(app, userData)
    }
  })

  test('deletes a note from the toolbar and selects the next one', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    try {
      await page.locator('.nav-item:has-text("临时笔记")').click()
      await expect(page.locator('.note-item')).toHaveCount(3)
      const firstName = await page.locator('.note-item-title').first().innerText()
      await page.locator('.note-delete-btn').click()
      await expect(page.locator('.note-item')).toHaveCount(2)
      await expect(page.locator('.page-sub')).toContainText('2 条笔记')
      await expect(page.locator('.note-item-title').filter({ hasText: firstName })).toHaveCount(0)
      await expect(page.locator('.note-editor-title')).not.toHaveText(firstName)
      await expect(page.locator('.note-item.active')).toHaveCount(1)
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
