import { chromium } from 'playwright'
import fs from 'node:fs'

const outDir = new URL('../screenshots/interactions/', import.meta.url).pathname
fs.mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1728, height: 1117 }, deviceScaleFactor: 2 })
const page = await context.newPage()
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(e.message))
const results = []
const check = (name, ok) => { results.push({ name, ok }); console.log(ok ? 'OK ' : 'FAIL', name) }
const shot = async (name) => { await page.screenshot({ path: `${outDir}${name}.png` }); console.log('shot', name) }

await page.goto('http://127.0.0.1:5178/?view=quarter&theme=noir&noreminder=1', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
check('sidebar reduced to 3 items', await page.locator('.sidebar .nav-item').count() === 3)
check('home is quarter tasks', (await page.locator('.page-title').innerText()).includes('季度任务'))

// period popover + 2027 warning
await page.click('.period-btn')
await page.waitForSelector('.period-pop')
await shot('13-period-popover')
await page.click('.year-strip .year-btn:has-text("2027")')
await page.click('.period-pop .q-card:has-text("Q1")')
await page.waitForTimeout(400)
check('2027 Q1 warning visible', await page.locator('.warn-banner').isVisible().catch(() => false))
await shot('14-2027-warning')

// back to 2026 Q4
await page.click('.period-btn')
await page.click('.year-strip .year-btn:has-text("2026")')
await page.click('.period-pop .q-card:has-text("Q4")')
await page.waitForTimeout(300)

// year overview
await page.getByRole('button', { name: '年度总览' }).click()
await page.waitForTimeout(300)
check('year overview visible', await page.locator('.year-overview').isVisible())
await shot('15-year-overview')
await page.getByRole('button', { name: '返回季度' }).click()

// project planning + auto schedule
await page.locator('.nav-item:has-text("项目")').click()
await page.waitForTimeout(300)
await page.locator('.proj-featured .proj-card').click()
await page.waitForTimeout(300)
check('project detail visible', await page.locator('.project-detail-view').isVisible())
await page.locator('.project-summary .hours-input').first().fill('140')
await page.locator('.workitem-week').first().selectOption('2026-W44')
await page.getByRole('button', { name: /打开周计划/ }).click()
await page.waitForTimeout(400)
check('project week sync', (await page.locator('.page-title').innerText()).includes('第 44 周'))
check('auto schedule items visible', (await page.locator('.auto-row').count()) > 0)
await shot('15b-project-week-sync')

// AI flow
await page.click('.ai-pill')
await page.waitForTimeout(300)
check('AI drawer open', await page.locator('.ai-drawer').isVisible())
await page.locator('.ai-suggest').first().click()
await page.waitForTimeout(1200)
check('AI proposal visible', await page.locator('.ai-proposal').isVisible())
await shot('16-ai-proposal')
await page.locator('.ai-proposal-actions .btn.primary').click()
await page.waitForTimeout(400)
check('AI toast visible', await page.locator('.toast').isVisible().catch(() => false))
await shot('17-ai-confirmed')
await page.locator('.ai-close').click()

// create task
await page.locator('.nav-item:has-text("周计划")').click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: '新建事项' }).click()
await page.waitForTimeout(300)
await shot('18-create-modal')
await page.locator('.create-modal .input').first().fill('验证新的本周事项')
await page.locator('.create-modal .modal-foot .btn.primary').click()
await page.waitForTimeout(400)
check('new task appears', await page.getByText('验证新的本周事项').first().isVisible().catch(() => false))

// reminder
await page.locator('.topbar-right .icon-btn[title="提醒演示"]').click()
await page.waitForTimeout(500)
check('reminder popup visible', await page.locator('.reminder').isVisible())
await shot('19-reminder-popup')
await page.locator('.reminder-actions .btn.primary').click()
await page.waitForTimeout(300)
check('reminder toast', await page.locator('.toast').isVisible().catch(() => false))

// theme switch
await page.locator('.icon-btn[title="切换皮肤"]').click()
await page.waitForTimeout(350)
check('theme ops', await page.locator('.qp-root[data-theme="ops"]').count() === 1)
await shot('20-ops-week')

// command palette
await page.keyboard.press('Meta+k')
await page.waitForTimeout(300)
check('command palette open', await page.locator('.cmd-panel').isVisible())
await shot('21-command-palette')
await page.keyboard.press('Escape')

// collapse / expand
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
check('collapsed notch visible', await page.locator('.notch').isVisible())
await shot('22-collapsed')
await page.locator('.notch').click()
await page.waitForTimeout(500)
check('expanded again', await page.locator('.panel').isVisible())

fs.writeFileSync(`${outDir}results.json`, JSON.stringify({ results, errors }, null, 2))
console.log('ERRORS', errors)
await browser.close()
