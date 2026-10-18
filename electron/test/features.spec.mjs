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

async function chooseSingleDate(page, container, iso) {
  await container.locator('.date-field-trigger').click()
  const pop = page.locator('.date-field-pop')
  await expect(pop).toBeVisible()
  const [year, month] = iso.split('-').map(Number)
  for (let i = 0; i < 36; i += 1) {
    const text = await pop.locator('.dt-month').innerText()
    const match = text.match(/(\d+) 年 (\d+) 月/)
    const current = match ? [Number(match[1]), Number(match[2])] : [0, 0]
    if (current[0] === year && current[1] === month) break
    await pop.locator('.dt-nav').nth(current[0] === year && current[1] > month ? 0 : 1).click()
  }
  await pop.locator('.dt-day').filter({ hasText: new RegExp(`^${Number(iso.slice(8, 10))}$`) }).click()
  await pop.locator('.dt-pop-foot .btn.primary').click()
}

async function chooseDateRange(page, container, startISO, endISO) {
  await container.locator('.date-range-cell').first().click()
  const pop = page.locator('.date-range-pop')
  await expect(pop).toBeVisible()
  const goToMonth = async (iso) => {
    const [year, month] = iso.split('-').map(Number)
    for (let i = 0; i < 36; i += 1) {
      const text = await pop.locator('.dt-month').innerText()
      const match = text.match(/(\d+) 年 (\d+) 月/)
      const current = match ? [Number(match[1]), Number(match[2])] : [0, 0]
      if (current[0] === year && current[1] === month) return
      await pop.locator('.dt-nav').nth(current[0] === year && current[1] > month ? 0 : 1).click()
    }
    throw new Error(`could not navigate to ${iso}`)
  }
  const chooseDay = async (iso) => {
    await goToMonth(iso)
    const day = String(Number(iso.slice(8, 10)))
    await pop.locator('.range-day').filter({ hasText: new RegExp(`^${day}$`) }).click()
  }
  await chooseDay(startISO)
  await chooseDay(endISO)
  await pop.locator('.dt-pop-foot .btn.primary').click()
}

test.describe('Q-Panel feature regression', () => {
  test('navigates all five views, all skins and the command palette', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    const errors = collectPageErrors(page)
    try {
      const expected = [
        ['本周安排', '第 42 周'],
        ['项目', '全局项目'],
        ['临时笔记', '临时笔记'],
        ['收藏链接', '收藏链接'],
        ['季度规划', '季度规划'],
      ]
      for (const [nav, title] of expected) {
        await page.locator(`.nav-item:has-text("${nav}")`).click()
        await expect(page.locator('.page-title')).toContainText(title)
      }

      await expect(page.locator('.capacity-stat .stat-value').nth(0)).toContainText('60')
      await expect(page.locator('.capacity-stat .stat-value').nth(1)).toContainText('48.5')
      await expect(page.locator('.capacity-stat .stat-value').nth(2)).toContainText('11.5')

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
      await expect(page.locator('.create-modal .date-range-cell')).toHaveCount(2)
      await expect(page.locator('.create-modal .date-range-control .date-range-total')).toContainText('1 天')
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
      await expect(modal.locator('.date-range-cell')).toHaveCount(2)
      await expect(modal.locator('.date-range-control .date-range-total')).toContainText('1 天')
      await modal.locator('.input').first().fill('时间段编辑验证事项')
      await chooseDateRange(page, modal, '2026-10-17', '2026-10-18')
      await expect(modal.locator('.date-range-control .date-range-total')).toContainText('2 天')
      await modal.getByRole('button', { name: '自定义', exact: true }).click()
      await chooseSingleDate(page, modal, '2026-10-16')
      await modal.locator('[aria-label="提醒小时"]').click()
      await page.locator('.select-menu-pop [role="option"]').filter({ hasText: '14:00' }).click()
      await modal.locator('.modal-foot .btn.primary').click()
      const row = page.locator('.task-row').filter({ hasText: '时间段编辑验证事项' })
      await expect(row).toBeVisible()
      await expect(row).toContainText('10/17 – 10/18')
      await expect(row).toContainText('2026-10-16 · 14:00')
      await row.hover()
      await row.locator('.task-edit-btn[title="编辑事项"]').click()
      const edit = page.locator('.modal-layer').filter({ hasText: '编辑本周事项' })
      await expect(edit.locator('.date-range-cell')).toHaveCount(2)
      await chooseDateRange(page, edit, '2026-10-17', '2026-10-19')
      await edit.locator('.modal-foot .btn.primary').click()
      await expect(page.locator('.task-row').filter({ hasText: '时间段编辑验证事项' })).toContainText('10/17 – 10/19')
      await expect(page.locator('.task-row').filter({ hasText: '时间段编辑验证事项' })).toContainText('2026-10-16 · 14:00')
    } finally {
      await closeApp(app, userData)
    }
  })

  test('deletes a task, an objective and a project from their own views', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    try {
      await page.locator('.nav-item:has-text("本周安排")').click()
      const taskCount = await page.locator('.task-row').count()
      const firstTask = page.locator('.task-row').first()
      const taskTitle = await firstTask.locator('.task-title').innerText()
      await firstTask.hover()
      await firstTask.locator('.task-delete-btn').click()
      await expect(page.locator('.task-row')).toHaveCount(taskCount - 1)
      await expect(page.locator('.task-title').filter({ hasText: taskTitle })).toHaveCount(0)

      await page.locator('.nav-item:has-text("季度规划")').click()
      const objectiveCount = await page.locator('.obj-row').count()
      await page.locator('.obj-row').first().click()
      const objectiveTitle = await page.locator('.modal-title').innerText()
      await page.locator('.modal-foot .btn.danger-text').click()
      await expect(page.locator('.obj-row')).toHaveCount(objectiveCount - 1)
      await expect(page.locator('.obj-row').filter({ hasText: objectiveTitle })).toHaveCount(0)

      await page.locator('.nav-item:has-text("项目")').click()
      const projectCount = await page.locator('.project-overview-row').count()
      await page.locator('.project-overview-row').first().click()
      const projectTitle = await page.locator('.page-title').innerText()
      await page.locator('.head-actions .btn.danger-text').click()
      await expect(page.locator('.project-overview-row')).toHaveCount(projectCount - 1)
      await expect(page.locator('.project-overview-row').filter({ hasText: projectTitle })).toHaveCount(0)
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
      await expect(edit.locator('.date-range-cell')).toHaveCount(2)
      await chooseDateRange(page, edit, '2026-10-01', '2026-10-31')
      await edit.locator('.modal-foot .btn.primary').click()
      await expect(page.locator('.obj-row').first()).toContainText('10/1 – 10/31')

      await page.locator('.nav-item:has-text("项目")').click()
      await page.locator('.project-overview-row').first().click()
      const range = page.locator('.project-plan-strip')
      await expect(range.locator('.date-range-cell')).toHaveCount(2)
      await chooseDateRange(page, range, '2026-09-01', '2026-12-30')
      await expect(range.locator('.date-range-control')).toContainText('12.30')
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
      await expect(modal.locator('.date-range-cell')).toHaveCount(2)
      await modal.locator('.input').first().fill('时间段验证项目')
      await chooseDateRange(page, modal, '2026-11-01', '2026-12-31')
      await expect(modal.locator('.date-range-control .date-range-total')).toContainText('61 天')
      await modal.locator('.modal-foot .btn.primary').click()
      await expect(page.locator('.project-overview-row').filter({ hasText: '时间段验证项目' })).toHaveCount(1)
    } finally {
      await closeApp(app, userData)
    }
  })

  test('counts linked project work once in quarter capacity', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    try {
      await page.locator('.nav-item:has-text("季度规划")').click()
      const used = page.locator('.capacity-stat').nth(1)
      await expect(used).toContainText('48.5')
      await expect(used).toContainText('季度任务 48 + 独立项目 0.5')
      await expect(used).not.toContainText('项目本季')
    } finally {
      await closeApp(app, userData)
    }
  })

  test('keeps quarter category filters contained when categories grow', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    try {
      await page.locator('.icon-btn[title="设置"]').click()
      await page.locator('.settings-tab:has-text("分类")').click()
      for (const name of ['合规审计', '数据治理', '云安全', '供应链安全', '安全意识', '漏洞管理']) {
        await page.locator('.category-add-row .input').fill(name)
        await page.locator('.category-add-row .btn').click()
      }
      await page.locator('.settings-modal .modal-close').click()
      await page.locator('.nav-item:has-text("季度规划")').click()
      const layout = await page.evaluate(() => {
        const head = document.querySelector('.quarter-list-head')
        const card = head?.closest('.bezel')
        const title = head?.querySelector('.list-title')
        if (!head || !card || !title) return null
        const headBox = head.getBoundingClientRect()
        const titleBox = title.getBoundingClientRect()
        return {
          contained: head.scrollWidth <= head.clientWidth + 1,
          headLeft: headBox.left,
          titleLeft: titleBox.left,
          cardRight: card.getBoundingClientRect().right,
          headRight: headBox.right,
        }
      })
      expect(layout).not.toBeNull()
      expect(layout?.contained).toBe(true)
      expect(Math.abs((layout?.titleLeft ?? 0) - (layout?.headLeft ?? 0))).toBeLessThan(20)
      expect((layout?.headRight ?? 0) <= (layout?.cardRight ?? 0) + 1).toBe(true)
    } finally {
      await closeApp(app, userData)
    }
  })

  test('keeps week category filters contained when categories grow', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    try {
      await page.locator('.icon-btn[title="设置"]').click()
      await page.locator('.settings-tab:has-text("分类")').click()
      for (const name of ['合规审计', '数据治理', '云安全', '供应链安全', '安全意识', '漏洞管理']) {
        await page.locator('.category-add-row .input').fill(name)
        await page.locator('.category-add-row .btn').click()
      }
      await page.locator('.settings-modal .modal-close').click()
      await page.locator('.nav-item:has-text("本周安排")').click()
      const layout = await page.evaluate(() => {
        const head = document.querySelector('.week-list-head')
        const card = head?.closest('.bezel')
        const title = head?.querySelector('.list-title')
        if (!head || !card || !title) return null
        const headBox = head.getBoundingClientRect()
        const titleBox = title.getBoundingClientRect()
        return {
          contained: head.scrollWidth <= head.clientWidth + 1,
          headLeft: headBox.left,
          titleLeft: titleBox.left,
          cardRight: card.getBoundingClientRect().right,
          headRight: headBox.right,
        }
      })
      expect(layout).not.toBeNull()
      expect(layout?.contained).toBe(true)
      expect(Math.abs((layout?.titleLeft ?? 0) - (layout?.headLeft ?? 0))).toBeLessThan(20)
      expect((layout?.headRight ?? 0) <= (layout?.cardRight ?? 0) + 1).toBe(true)
    } finally {
      await closeApp(app, userData)
    }
  })

  test('splits a project work item across every overlapping week and respects manual removal', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    try {
      await page.locator('.nav-item:has-text("项目")').click()
      await page.locator('.project-overview-row').first().click()
      const workItem = page.locator('.workplan-row').nth(1)
      await chooseDateRange(page, workItem.locator('.workitem-calendar'), '2026-10-12', '2026-10-31')
      await expect(workItem.locator('.workitem-week-tag')).toHaveCount(3)
      await expect(workItem.locator('.workitem-week-tag').nth(0)).toContainText('W42')
      await expect(page.locator('.week-plan-row').filter({ hasText: '第 42 周' })).toHaveCount(1)
      await expect(page.locator('.week-plan-row').filter({ hasText: '第 43 周' })).toHaveCount(1)
      await expect(page.locator('.week-plan-row').filter({ hasText: '第 44 周' })).toHaveCount(1)

      await page.locator('.nav-item:has-text("本周安排")').click()
      const w42Row = page.locator('.auto-row').filter({ hasText: '差距分析证据清单' })
      await expect(w42Row).toHaveCount(1)
      await expect(w42Row).toContainText('总 0.5 人日')

      await page.locator('[aria-label="下一周"]').click()
      await expect(page.locator('.list-title')).toContainText('本周必做')
      await expect(page.locator('.section-label').first()).toContainText('待完成')
      await expect(page.locator('.auto-section-label')).toHaveCount(0)
      const w43Row = page.locator('.auto-row').filter({ hasText: '差距分析证据清单' })
      await expect(w43Row).toHaveCount(1)
      await w43Row.hover()
      await w43Row.locator('.auto-remove-btn').click()
      await expect(page.locator('.auto-row').filter({ hasText: '差距分析证据清单' })).toHaveCount(0)

      await page.locator('.nav-item:has-text("项目")').click()
      await page.locator('.project-overview-row').first().click()
      await expect(page.locator('.workplan-row').nth(1).locator('.workitem-week-tag')).toHaveCount(2)
      await expect(page.locator('.workplan-row').nth(1).locator('.workitem-week-tag').nth(0)).toContainText('W42')
      await expect(page.locator('.workplan-row').nth(1).locator('.workitem-week-tag').nth(1)).toContainText('W44')
      await page.locator('.workitem-title').first().fill('差距分析证据清单 v2')
      await page.locator('.nav-item:has-text("本周安排")').click()
      await page.locator('[aria-label="下一周"]').click()
      await expect(page.locator('.auto-row').filter({ hasText: '差距分析证据清单 v2' })).toHaveCount(1)
    } finally {
      await closeApp(app, userData)
    }
  })

  test('keeps an empty person-day field empty while typing', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    try {
      await page.locator('.nav-item:has-text("项目")').click()
      await page.getByRole('button', { name: '新建项目' }).click()
      const field = page.locator('.create-modal input[aria-label="总规划人日"]')
      await expect(field).toHaveValue('15')
      await field.fill('')
      await expect(field).toHaveValue('')
      await expect(field).toHaveAttribute('placeholder', '15')
      await field.fill('20')
      await expect(field).toHaveValue('20')
    } finally {
      await closeApp(app, userData)
    }
  })

  test('edits a milestone name and date inline', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    try {
      await page.locator('.nav-item:has-text("项目")').click()
      await page.locator('.project-overview-row').first().click()
      const milestone = page.locator('.timeline-item').first()
      await milestone.scrollIntoViewIfNeeded()
      const title = milestone.locator('.tl-title-input')
      await title.fill('资产盘点完成')
      await expect(title).toHaveValue('资产盘点完成')
      await chooseSingleDate(page, milestone.locator('.milestone-date-edit'), '2026-12-15')
      await expect(milestone.locator('.date-field-trigger')).toContainText('2026.12.15')
    } finally {
      await closeApp(app, userData)
    }
  })

  test('creates a project linked to a quarter objective', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    try {
      await page.locator('.nav-item:has-text("项目")').click()
      await page.getByRole('button', { name: '新建项目' }).click()
      const modal = page.locator('.create-modal')
      await modal.locator('.input').first().fill('关联季度项目验证')
      await modal.locator('[aria-label="关联季度规划"]').click()
      await page.locator('.select-menu-pop [role="option"]').filter({ hasText: 'SOC 告警降噪专项' }).click()
      await modal.locator('.modal-foot .btn.primary').click()
      await page.waitForTimeout(900)
      const workspace = await page.evaluate(() => window.qpanel?.workspace.load())
      const project = workspace?.data?.projects?.find((item) => item.title === '关联季度项目验证')
      expect(project?.objectiveId).toBe('o2')
      const objective = workspace?.data?.objectives?.['2026-Q4']?.find((item) => item.id === 'o2')
      expect(objective?.projectId).toBe(project?.id)
    } finally {
      await closeApp(app, userData)
    }
  })

  test('creates a quarter objective linked to a project', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    try {
      await page.locator('.nav-item:has-text("季度规划")').click()
      await page.getByRole('button', { name: '新建任务' }).click()
      const modal = page.locator('.create-modal')
      await modal.locator('.input').first().fill('关联项目规划验证')
      await modal.locator('[aria-label="关联项目"]').click()
      await page.locator('.select-menu-pop [role="option"]').filter({ hasText: '漏洞管理流程升级' }).click()
      await modal.locator('.modal-foot .btn.primary').click()
      await page.waitForTimeout(900)
      const workspace = await page.evaluate(() => window.qpanel?.workspace.load())
      const objective = workspace?.data?.objectives?.['2026-Q4']?.find((item) => item.title === '关联项目规划验证')
      expect(objective?.projectId).toBe('p5')
      const project = workspace?.data?.projects?.find((item) => item.id === 'p5')
      expect(project?.objectiveId).toBe(objective?.id)
    } finally {
      await closeApp(app, userData)
    }
  })

  test('edits a quarter objective project association', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    try {
      await page.locator('.nav-item:has-text("季度规划")').click()
      await page.locator('.obj-row').first().click()
      await page.locator('.modal-foot .btn.primary').click()
      const edit = page.locator('.modal-layer').filter({ hasText: '编辑季度任务' })
      await edit.locator('[aria-label="关联项目"]').click()
      await page.locator('.select-menu-pop [role="option"]').filter({ hasText: '漏洞管理流程升级' }).click()
      await edit.locator('.modal-foot .btn.primary').click()
      await page.waitForTimeout(900)
      const workspace = await page.evaluate(() => window.qpanel?.workspace.load())
      const objective = workspace?.data?.objectives?.['2026-Q4']?.find((item) => item.title === '等保 2.0 差距分析闭环')
      expect(objective?.projectId).toBe('p5')
      const project = workspace?.data?.projects?.find((item) => item.id === 'p5')
      expect(project?.objectiveId).toBe(objective?.id)
    } finally {
      await closeApp(app, userData)
    }
  })

  test('does not submit a new item on an IME composing Enter', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    try {
      await page.locator('.nav-item:has-text("本周安排")').click()
      await page.getByRole('button', { name: '新建事项' }).click()
      const modal = page.locator('.create-modal')
      const title = modal.locator('.input').first()
      await title.fill('输入法组合测试')
      await title.evaluate((element) => {
        element.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter', code: 'Enter', bubbles: true, cancelable: true, isComposing: true,
        }))
      })
      await expect(modal).toBeVisible()
    } finally {
      await closeApp(app, userData)
    }
  })

  test('marks a project at risk only when work exceeds the plan', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    try {
      await page.locator('.nav-item:has-text("项目")').click()
      await page.locator('.project-overview-row').first().click()
      const total = page.locator('.project-summary .hours-input').first()
      await total.fill('1')
      await total.press('Tab')
      await expect(page.locator('.project-title-row').getByText('有延期风险')).toBeVisible()
      await total.fill('20')
      await total.press('Tab')
      await expect(page.locator('.project-title-row').getByText('有延期风险')).toHaveCount(0)
    } finally {
      await closeApp(app, userData)
    }
  })

  test('records a custom global shortcut', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    try {
      await page.locator('.icon-btn[title="设置"]').click()
      const shortcut = page.locator('.global-shortcut-record')
      await expect(shortcut).toContainText('⌘ ⇧ Space')
      await shortcut.click()
      await page.keyboard.press('Control+Shift+K')
      await expect(shortcut).toContainText('⌃ ⇧ K')
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

  test('creates a note directly in edit mode and keeps typed content', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    try {
      await page.locator('.nav-item:has-text("临时笔记")').click()
      await page.getByRole('button', { name: '新建笔记' }).click()
      const editor = page.locator('.note-textarea')
      await expect(editor).toBeVisible()
      await expect(editor).toBeFocused()
      await editor.fill('# 可编辑笔记\n\n这是直接输入的内容')
      await expect(page.locator('.note-editor-meta')).toContainText('Markdown')
      await page.locator('.note-mode-toggle').click()
      await expect(page.locator('.md')).toContainText('这是直接输入的内容')
    } finally {
      await closeApp(app, userData)
    }
  })

  test('renames a note title and keeps the first markdown heading in sync', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    try {
      await page.locator('.nav-item:has-text("临时笔记")').click()
      await page.getByRole('button', { name: '新建笔记' }).click()
      const title = page.locator('.note-editor-title-input')
      await title.fill('周会纪要')
      await expect(page.locator('.note-item-title').first()).toHaveText('周会纪要')
      await page.locator('.note-mode-toggle').click()
      await expect(page.locator('.md')).toContainText('周会纪要')
    } finally {
      await closeApp(app, userData)
    }
  })

  test('keeps an empty note title as placeholder instead of rewriting it', async () => {
    const userData = await createUserData()
    const { app, page } = await launchApp(userData)
    try {
      await page.locator('.nav-item:has-text("临时笔记")').click()
      await page.getByRole('button', { name: '新建笔记' }).click()
      const title = page.locator('.note-editor-title-input')
      await title.fill('')
      await expect(title).toHaveValue('')
      await expect(title).toHaveAttribute('placeholder', '未命名笔记')
      await expect(page.locator('.note-item-title').first()).toHaveText('未命名笔记')
      await expect(page.locator('.note-item-title').first()).toHaveClass(/placeholder/)
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

      await page.locator('.note-editor-pane .note-mode-toggle').click()
      const long = Array.from({ length: 90 }, (_, i) => `- 第 ${i + 1} 条长内容，用于验证编辑器和预览只在卡片内部滚动。`).join('\n')
      await page.locator('.note-textarea').fill(`# 长笔记\n\n${long}`)
      await page.locator('.note-editor-pane .note-mode-toggle').click()
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
      await expect(page.locator('.note-editor-title-input')).not.toHaveValue(firstName)
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
      await expect(page.locator('.project-subline')).toContainText('本季')

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
