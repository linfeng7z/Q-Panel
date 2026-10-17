import { chromium } from 'playwright'
import fs from 'node:fs'

const base = 'http://127.0.0.1:5178/'
const outDir = new URL('../screenshots/', import.meta.url).pathname
fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({
  viewport: { width: 1728, height: 1117 },
  deviceScaleFactor: 2,
})
const page = await context.newPage()
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`)
})
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))

async function shot(name) {
  await page.waitForTimeout(650)
  await page.screenshot({ path: `${outDir}${name}.png` })
  console.log('shot', name)
}

async function goto(query) {
  await page.goto(base + query, { waitUntil: 'networkidle' })
  await page.waitForTimeout(450)
}

await goto('?view=quarter&theme=noir&noreminder=1')
await shot('01-home-noir')

await goto('?view=quarter&theme=ops&noreminder=1')
await shot('02-home-ops')

await goto('?view=week&theme=noir&noreminder=1')
await shot('03-week')

await goto('?view=week&theme=noir&noreminder=1')
await page.getByRole('button', { name: '下一周' }).click()
await shot('04-week-43')

await goto('?view=projects&theme=noir&noreminder=1')
await shot('05-projects')

await goto('?view=projects&theme=noir&noreminder=1')
await page.locator('.project-overview-row').first().click()
await shot('06-project-detail')

await goto('?view=quarter&theme=noir&settings=1&noreminder=1')
await page.locator('.settings-tab:has-text("分类")').click()
await page.waitForTimeout(250)
await shot('07-category-manager')

await goto('?view=quarter&theme=noir&ai=1&noreminder=1')
await shot('08-ai')

await goto('?view=quarter&theme=noir&settings=1&noreminder=1')
await shot('09-settings')

await goto('?view=quarter&theme=noir&reminder=1')
await page.waitForTimeout(700)
await shot('10-reminder')

await goto('?collapsed=1&noreminder=1')
await shot('11-collapsed')

await goto('?view=stats&theme=noir&noreminder=1')
await shot('12-stats')

await browser.close()
fs.writeFileSync(`${outDir}errors.json`, JSON.stringify(errors, null, 2))
console.log('errors:', errors.length)
