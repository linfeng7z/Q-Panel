import { test, expect } from '@playwright/test'
import { closeApp, createUserData, launchApp } from './helpers.mjs'

async function sendBackdrop(app, image) {
  await app.evaluate(({ BrowserWindow }, image) => {
    const main = BrowserWindow.getAllWindows().find((w) => !w.webContents.getURL().includes('notch=1'))
    main.webContents.send('app:backdrop', image ? {
      image,
      screen: { x: 0, y: 0, width: 1512, height: 982 },
      window: { x: 116, y: 33, width: 1280, height: 760 },
    } : null)
  }, image)
}

async function fixtureImage(page, inverse) {
  return page.evaluate((inverse) => {
    const canvas = document.createElement('canvas')
    canvas.width = 1512
    canvas.height = 982
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = inverse ? '#000000' : '#ffffff'
    ctx.fillRect(0, 0, 1512, 982)
    ctx.font = 'bold 36px sans-serif'
    for (let row = 0; row < 982; row += 48) {
      ctx.fillStyle = inverse ? '#ffffff' : '#000000'
      ctx.fillText('DESKTOP TEXT 桌面文字 0123456789 '.repeat(5), 0, row + 38)
    }
    return canvas.toDataURL()
  }, inverse)
}

async function bitmapDiff(app, left, right) {
  return app.evaluate(({ nativeImage }, [left, right]) => {
    const a = nativeImage.createFromBuffer(Buffer.from(left, 'base64')).toBitmap()
    const b = nativeImage.createFromBuffer(Buffer.from(right, 'base64')).toBitmap()
    let delta = 0
    let minAlpha = 255
    for (let i = 0; i < a.length; i += 4) {
      for (let j = 0; j < 3; j++) delta += Math.abs(a[i + j] - b[i + j])
      minAlpha = Math.min(minAlpha, a[i + 3], b[i + 3])
    }
    return { meanChannelDifference: delta / (a.length / 4 * 3), minAlpha }
  }, [left.toString('base64'), right.toString('base64')])
}

test('highest material setting excludes desktop letterforms and keeps native output opaque', async () => {
  const userData = await createUserData()
  const { app, page } = await launchApp(userData)
  try {
    await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; } .toast { display: none !important; }' })
    await page.locator('.icon-btn[title="设置"]').click()
    await page.locator('input[aria-label="背景模糊度"]').fill('80')
    await page.mouse.click(20, 20)
    await expect.poll(() => page.locator('.qp-root').evaluate((n) => getComputedStyle(n).getPropertyValue('--material-tint'))).toBe('1')
    const bright = await fixtureImage(page, false)
    const dark = await fixtureImage(page, true)
    await sendBackdrop(app, bright)
    await expect(page.locator('.panel-backdrop')).toHaveCount(1)
    await page.waitForTimeout(100)
    const a = await page.screenshot({ omitBackground: true })
    await sendBackdrop(app, dark)
    await page.waitForTimeout(100)
    const b = await page.screenshot({ omitBackground: true })
    const result = await bitmapDiff(app, a, b)
    expect(result.meanChannelDifference).toBeLessThan(0.1)
    expect(result.minAlpha).toBe(255)
    // Verify an actual image change, not only a changed slider/CSS number.
    await sendBackdrop(app, bright)
    await page.locator('.icon-btn[title="设置"]').click()
    await page.locator('input[aria-label="背景模糊度"]').fill('0')
    await page.mouse.click(20, 20)
    await page.waitForTimeout(100)
    const low = await page.screenshot({ omitBackground: true })
    const visibleChange = await bitmapDiff(app, a, low)
    expect(visibleChange.meanChannelDifference).toBeGreaterThan(1)
    expect(visibleChange.minAlpha).toBe(255)
    await sendBackdrop(app, null)
    await expect(page.locator('.panel-backdrop')).toHaveCount(0)
    await expect(page.locator('.panel')).toHaveCSS('background-color', 'rgb(13, 15, 20)')
    await expect(page.locator('.panel')).toHaveCSS('backdrop-filter', 'none')
    // The no-permission path must also remain opaque/readable in every skin.
    for (const theme of ['noir', 'ops', 'aurora', 'ember']) {
      await expect(page.locator('.qp-root')).toHaveAttribute('data-theme', theme)
      const contrast = await page.locator('.panel').evaluate((panel) => {
        const rgb = (value) => value.match(/[\d.]+/g).map(Number)
        const luminance = (channels) => channels.slice(0, 3).map((v) => v / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
        const swatch = document.createElement('span')
        swatch.style.color = 'var(--text-3)'
        panel.append(swatch)
        const text = luminance(rgb(getComputedStyle(swatch).color))
        swatch.remove()
        const background = rgb(getComputedStyle(panel).backgroundColor)
        return { alpha: background[3] ?? 1, ratio: (text + 0.05) / (luminance(background) + 0.05) }
      })
      expect(contrast.alpha).toBe(1)
      expect(contrast.ratio).toBeGreaterThan(4.5)
      if (theme !== 'ember') await page.locator('.icon-btn[title="切换皮肤"]').click()
    }
  } finally {
    await closeApp(app, userData)
  }
})

test('slider previews within a frame and visibly changes the material before saving', async () => {
  const userData = await createUserData()
  const { app, page } = await launchApp(userData)
  try {
    await sendBackdrop(app, await fixtureImage(page, false))
    await expect(page.locator('.panel-backdrop')).toHaveCount(1)
    await page.locator('.icon-btn[title="设置"]').click()
    const result = await page.locator('input[aria-label="背景模糊度"]').evaluate(async (input) => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      const root = input.closest('.qp-root')
      const values = []
      for (const value of [0, 20, 40, 60, 80]) {
        const start = performance.now()
        set.call(input, String(value))
        input.dispatchEvent(new Event('input', { bubbles: true }))
        await new Promise(requestAnimationFrame)
        values.push({ value, tint: Number(getComputedStyle(root).getPropertyValue('--material-tint')), elapsed: performance.now() - start })
      }
      return values
    })
    expect(result.map((x) => x.tint)).toEqual(result.map((x) => x.value === 80 ? 1 : 0.34 + 0.66 * Math.pow(x.value / 80, 1.25)))
    expect(Math.max(...result.map((x) => x.elapsed))).toBeLessThan(150)
    await expect(page.locator('.settings-range-value')).toHaveText('100%')
    await page.mouse.click(20, 20)
    await expect(page.locator('.qp-root')).toHaveAttribute('style', /--panel-blur: 80px/)
  } finally {
    await closeApp(app, userData)
  }
})
