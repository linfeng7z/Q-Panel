import { chromium } from 'playwright'
import fs from 'node:fs'

const base = 'http://127.0.0.1:5178/'
const outDir = new URL('../screenshots/', import.meta.url).pathname
fs.mkdirSync(outDir, { recursive: true })

const shots = [
  ['01-quarter-noir', '?view=quarter&theme=noir&noreminder=1'],
  ['02-quarter-ops', '?view=quarter&theme=ops&noreminder=1'],
  ['03-week', '?view=week&theme=noir&noreminder=1'],
  ['04-today', '?view=today&theme=noir&noreminder=1'],
  ['05-projects', '?view=projects&theme=noir&noreminder=1'],
  ['06-stats', '?view=stats&theme=noir&noreminder=1'],
  ['07-notes', '?view=notes&theme=noir&noreminder=1'],
  ['08-links', '?view=links&theme=noir&noreminder=1'],
  ['09-ai', '?view=quarter&theme=noir&ai=1&noreminder=1'],
  ['10-settings', '?view=quarter&theme=noir&settings=1&noreminder=1'],
  ['11-reminder', '?view=quarter&theme=noir&reminder=1'],
  ['12-collapsed', '?collapsed=1&noreminder=1'],
]

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

for (const [name, query] of shots) {
  await page.goto(base + query, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${outDir}${name}.png` })
  console.log('shot', name)
}

await browser.close()
fs.writeFileSync(`${outDir}errors.json`, JSON.stringify(errors, null, 2))
console.log('errors:', errors.length)
