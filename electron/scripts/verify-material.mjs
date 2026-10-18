import { _electron as electron } from 'playwright'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'

const output = path.resolve('screenshots/material-verification')
await fs.mkdir(output, { recursive: true })
const userData = await fs.mkdtemp(path.join(os.tmpdir(), 'qpanel-material-native-'))
assert.ok(userData.startsWith(path.join(os.tmpdir(), 'qpanel-material-native-')))
const executable = process.env.Q_PANEL_VERIFY_EXECUTABLE || path.resolve('node_modules/electron/dist/Electron.app/Contents/MacOS/Electron')
const packaged = Boolean(process.env.Q_PANEL_VERIFY_EXECUTABLE)
const app = await electron.launch({ executablePath: executable, args: packaged ? [] : ['.'], cwd: process.cwd(), env: {
  ...process.env, ELECTRON_RUN_AS_NODE: '', Q_PANEL_USER_DATA: userData,
  Q_PANEL_START_EXPANDED: '0', Q_PANEL_DISABLE_SCREEN_CAPTURE: '0', Q_PANEL_NO_NOTIFICATIONS: '1',
  Q_PANEL_DISABLE_AUTO_LAUNCH: '1', Q_PANEL_NOW: '2026-10-18T11:00:00+08:00',
}, timeout: 60000 })
const pointer = process.env.Q_PANEL_POINTER_HELPER ? path.resolve(process.env.Q_PANEL_POINTER_HELPER) : path.join(userData, 'move-pointer')
let originalPointer
const movePointer = (x, y) => execFileSync(pointer, [String(x), String(y)])
try {
  const pointerSource = path.join(userData, 'move-pointer.swift')
  await fs.writeFile(pointerSource, `import AppKit
let x = Double(CommandLine.arguments[1])!
let y = Double(CommandLine.arguments[2])!
let source = CGEventSource(stateID: .hidSystemState)
CGEvent(mouseEventSource: source, mouseType: .mouseMoved, mouseCursorPosition: CGPoint(x: x, y: y), mouseButton: .left)?.post(tap: .cghidEventTap)
`)
  if (!process.env.Q_PANEL_POINTER_HELPER) execFileSync('swiftc', [pointerSource, '-o', pointer])
  await app.firstWindow()
  originalPointer = await app.evaluate(({ screen }) => screen.getCursorScreenPoint())
  const primary = await app.evaluate(({ screen }) => screen.getPrimaryDisplay().bounds)
  movePointer(primary.x + primary.width / 2, primary.y + 37)
  const panel = app.windows().find((p) => !p.url().includes('notch=1') && p.url().includes('index.html'))
  const notch = app.windows().find((p) => p.url().includes('notch=1'))
  await panel.waitForSelector('[data-hydrated="true"]')
  await app.evaluate(async ({ BrowserWindow, screen }) => {
    const display = screen.getPrimaryDisplay()
    const fixture = new BrowserWindow({ frame: false, x: display.workArea.x, y: display.workArea.y,
      width: display.workArea.width, height: display.workArea.height, show: false, backgroundColor: '#ffffff' })
    fixture.setTitle('Q-Panel controlled desktop fixture')
    fixture.setAlwaysOnTop(true, 'floating')
    await fixture.loadURL('data:text/html,' + encodeURIComponent(`<html><body style="margin:0;background:#fff;color:#000;font:bold 38px sans-serif;line-height:1.3;overflow:hidden"><div style="background:repeating-linear-gradient(90deg,#fff 0 70px,#ff0099 70px 140px,#00ccff 140px 210px);height:160px"></div>${'<div>DESKTOP TEXT 桌面文字 WINDOW CONTENT 0123456789</div>'.repeat(30)}</body></html>`))
    fixture.showInactive()
  })
  await panel.waitForTimeout(300)
  // Exercise the same contour through renderer hover + keyboard focus. Keeping
  // focus-visible during the native capture makes it deterministic even if a
  // physical mouse is being used concurrently on the host.
  await notch.locator('.notch').hover()
  await notch.locator('.notch').focus()
  await notch.keyboard.press('Shift')
  for (const [name, wait] of [['enter', 100], ['scan', 220], ['settled', 650]]) {
    await panel.waitForTimeout(wait)
    execFileSync('screencapture', ['-x', '-R', `${primary.x + primary.width / 2 - 100},${primary.y + 25},200,22`, path.join(output, `notch-${name}.png`)])
  }
  const motion = await notch.locator('.notch').evaluate((n) => {
    const style = getComputedStyle(n, '::after')
    return { hovered: n.matches(':hover'), focused: n.matches(':focus-visible'), animation: style.animationName, iterations: style.animationIterationCount, clipPath: style.clipPath, opacity: style.opacity }
  })
  assert.ok(motion.hovered || motion.focused, 'contour must be active during the native screen capture')
  assert.equal(motion.animation, 'notch-optical-scan')
  assert.equal(motion.iterations, '1')
  assert.equal(motion.clipPath, 'none')
  await panel.evaluate(() => window.qpanel.notch.expand())
  await panel.waitForTimeout(700)
  movePointer(primary.x + 80, primary.y + 200)
  await panel.waitForTimeout(250)
  assert.equal(await panel.locator('.panel-backdrop').count(), 1, 'real screen capture must exist')
  await panel.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; } .toast { display:none !important; }' })
  const bounds = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('index.html') && !w.webContents.getURL().includes('notch=1')).getBounds())
  for (const value of [0, 20, 40, 60, 80]) {
    await panel.locator('.icon-btn[title="设置"]').click()
    await panel.locator('input[aria-label="背景模糊度"]').fill(String(value))
    await panel.mouse.click(20, 20)
    await panel.waitForTimeout(220)
    await panel.screenshot({ path: path.join(output, `renderer-${value}.png`), omitBackground: true })
    execFileSync('screencapture', ['-x', '-R', `${bounds.x},${bounds.y},${bounds.width},${bounds.height}`, path.join(output, `native-${value}.png`)])
  }
  await app.evaluate(({ BrowserWindow }) => {
    const fixture = BrowserWindow.getAllWindows().find((w) => w.getTitle() === 'Q-Panel controlled desktop fixture')
    return fixture.webContents.executeJavaScript("document.body.style.background='#000';document.body.style.color='#fff';document.body.style.filter='invert(1)'")
  })
  await panel.waitForTimeout(180)
  execFileSync('screencapture', ['-x', '-R', `${bounds.x},${bounds.y},${bounds.width},${bounds.height}`, path.join(output, 'native-80-live-changed.png')])
  const nativeDifference = await app.evaluate(({ nativeImage }, [left, right]) => {
    const image = nativeImage.createFromPath(left)
    const size = image.getSize()
    const crop = { x: 50, y: 50, width: size.width - 100, height: size.height - 100 }
    const a = image.crop(crop).toBitmap()
    const b = nativeImage.createFromPath(right).crop(crop).toBitmap()
    let difference = 0
    for (let i = 0; i < a.length; i += 4) for (let j = 0; j < 3; j++) difference += Math.abs(a[i + j] - b[i + j])
    return difference / (a.length / 4 * 3)
  }, [path.join(output, 'native-80.png'), path.join(output, 'native-80-live-changed.png')])
  assert.ok(nativeDifference < 0.15, `unfiltered live desktop leaked: ${nativeDifference}`)
  await panel.locator('.icon-btn[title="设置"]').click()
  const latency = await panel.locator('input[aria-label="背景模糊度"]').evaluate(async (input) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    const times = []
    for (let value = 0; value <= 80; value += 2) {
      const start = performance.now()
      set.call(input, String(value)); input.dispatchEvent(new Event('input', { bubbles: true }))
      await new Promise(requestAnimationFrame)
      times.push(performance.now() - start)
    }
    times.sort((a,b) => a-b)
    return { samples: times.length, median: times[Math.floor(times.length/2)], p95: times[Math.floor(times.length*0.95)], max: times.at(-1) }
  })
  await panel.mouse.click(20, 20)
  const material = await panel.locator('.panel').evaluate((n) => ({ base: getComputedStyle(n).backgroundColor, filter: getComputedStyle(n).backdropFilter, tint: getComputedStyle(n).getPropertyValue('--material-tint') }))
  const report = { packaged, version: await app.evaluate(({ app }) => app.getVersion()), bounds, motion, material, latency, nativeMeanDifferenceAfterLiveDesktopChange: nativeDifference }
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally {
  if (originalPointer) movePointer(originalPointer.x, originalPointer.y)
  await app.close()
  await fs.rm(userData, { recursive: true, force: true })
}
