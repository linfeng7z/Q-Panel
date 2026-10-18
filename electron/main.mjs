import { app, BrowserWindow, Menu, Notification, Tray, desktopCapturer, dialog, globalShortcut, ipcMain, nativeImage, safeStorage, screen, shell, systemPreferences } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { callAiGeneration, createAiConfigStore, testAiConnection } from './lib/ai.mjs'
import { fetchPageMetadata } from './lib/metadata.mjs'
import { ReminderScheduler } from './lib/reminders.mjs'
import { ReminderStateStore } from './lib/reminder-state.mjs'
import { exportWorkspaceFile, importWorkspaceFile, normalizeWorkspace } from './lib/workspace-io.mjs'
import { WorkspaceStore } from './lib/store.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = Boolean(process.env.Q_PANEL_DEV_URL)

if (process.env.Q_PANEL_USER_DATA) {
  app.setPath('userData', path.resolve(process.env.Q_PANEL_USER_DATA))
}

app.setName('Q-Panel')
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

let mainWindow = null
let notchWindow = null
let tray = null
let store = null
let reminderScheduler = null
let reminderStateStore = null
let lastWorkspace = null
let lastBackdrop = null
let aiConfigStore = null

// Matches the physical MacBook notch / menu-bar height; the collapsed window
// is a transparent click target so it does not add a second visible pill.
const NOTCH_WIDTH = 200
// The physical notch is exactly the menu-bar strip; fall back to 38pt on
// displays where the work area does not expose a menu bar.
const NOTCH_HEIGHT_FALLBACK = 38
const PANEL_WIDTH = 1280
const PANEL_HEIGHT = 760
let activeNativeDialogs = 0
let blurHideTimer = null


function rendererUrl() {
  if (isDev) {
    const url = new URL(process.env.Q_PANEL_DEV_URL)
    url.searchParams.set('electron', '1')
    url.searchParams.set('noreminder', '1')
    if (process.env.Q_PANEL_NOW) url.searchParams.set('now', process.env.Q_PANEL_NOW)
    return url.toString()
  }
  return null
}

function rendererFile() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'renderer', 'index.html')
  }
  return path.resolve(__dirname, '..', 'prototype', 'dist', 'index.html')
}

function notchBounds() {
  const display = screen.getPrimaryDisplay()
  const menuBarHeight = Math.max(0, display.workArea.y - display.bounds.y)
  if (menuBarHeight === 0) {
    return {
      x: Math.round(display.bounds.x + (display.bounds.width - NOTCH_WIDTH) / 2),
      y: display.bounds.y,
      width: NOTCH_WIDTH,
      height: NOTCH_HEIGHT_FALLBACK,
    }
  }
  // macOS constrains visible windows below the menu bar. With
  // enableLargerThanScreen we can start the transparent window one menu-bar
  // height above the screen: its lower half then covers the physical notch and
  // receives clicks even though macOS would otherwise route them to the menu
  // bar. Nothing is painted, so the user only sees the notch itself.
  return {
    x: Math.round(display.bounds.x + (display.bounds.width - NOTCH_WIDTH) / 2),
    y: display.bounds.y - menuBarHeight,
    width: NOTCH_WIDTH,
    // 10px below the menu bar so the hover glow is actually visible;
    // the camera cutout itself has no display pixels.
    height: menuBarHeight * 2 + 10,
  }
}

function showNotch() {
  if (!notchWindow) return
  notchWindow.setBounds(notchBounds())
  if (!notchWindow.isVisible()) notchWindow.showInactive()
  setTimeout(() => {
    if (!notchWindow || notchWindow.isDestroyed()) return
    notchWindow.setBounds(notchBounds())
  }, 30)
}

function hideNotch() {
  notchWindow?.hide()
}

async function captureBackdrop() {
  if (process.env.Q_PANEL_DISABLE_SCREEN_CAPTURE === '1') return null
  try {
    const bounds = mainWindow?.getBounds()
    if (!bounds) return null
    const display = screen.getDisplayMatching(bounds)
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        // This is ambience, not screen content. A smaller capture keeps the
        // IPC payload and slider-time GPU surface independent of Retina scale.
        width: Math.ceil(display.size.width / 2),
        height: Math.ceil(display.size.height / 2),
      },
    })
    const source = sources.find((item) => item.display_id === String(display.id))
      ?? (sources.length === 1 ? sources[0] : null)
    if (!source?.thumbnail || source.thumbnail.isEmpty()) return null
    const jpeg = source.thumbnail.toJPEG(82)
    if (!jpeg.length) return null
    return {
      image: `data:image/jpeg;base64,${jpeg.toString('base64')}`,
      screen: { x: display.bounds.x, y: display.bounds.y, width: display.size.width, height: display.size.height },
      window: bounds,
    }
  } catch {
    return null
  }
}

async function showWindow() {
  if (!mainWindow) {
    createWindow()
    mainWindow?.once('ready-to-show', showWindow)
    return
  }
  if (mainWindow.isVisible()) {
    mainWindow.focus()
    showNotch()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  placePanelOnDisplay()
  // Capture the desktop before the panel is on screen; a temporary notch hide
  // keeps the hit target out of the background image.
  hideNotch()
  await new Promise((resolve) => setTimeout(resolve, 40))
  const backdrop = await captureBackdrop()
  mainWindow.setAlwaysOnTop(true, 'screen-saver')
  try {
    // No native material fallback: denied capture must remain a readable solid
    // surface, not reintroduce a translucent live desktop behind the text.
    mainWindow.setVibrancy(null)
  } catch {
    // The renderer has an opaque, theme-aware fallback on every platform.
  }
  lastBackdrop = backdrop
  if (!mainWindow.webContents.isLoading()) mainWindow.webContents.send('app:backdrop', backdrop)
  mainWindow.show()
  mainWindow.focus()
  showNotch()
}

function hideWindow() {
  mainWindow?.hide()
  showNotch()
}

async function toggleWindow() {
  if (!mainWindow) return
  if (mainWindow.isVisible()) hideWindow()
  else await showWindow()
}

function targetDisplay() {
  return screen.getDisplayNearestPoint(screen.getCursorScreenPoint()) ?? screen.getPrimaryDisplay()
}

function placePanelOnDisplay() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const display = targetDisplay()
  const width = Math.min(PANEL_WIDTH, Math.max(980, display.workArea.width - 80))
  const height = Math.min(PANEL_HEIGHT, Math.max(620, display.workArea.height - 48))
  const x = Math.round(display.workArea.x + (display.workArea.width - width) / 2)
  const y = Math.round(display.workArea.y)
  mainWindow.setBounds({ x, y, width, height })
}

async function withNativeDialog(task) {
  activeNativeDialogs += 1
  try {
    return await task()
  } finally {
    activeNativeDialogs -= 1
    if (activeNativeDialogs === 0) {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) mainWindow.focus()
      }, 30)
    }
  }
}

function screenCapturePermission() {
  if (process.platform !== 'darwin') return 'granted'
  return systemPreferences.getMediaAccessStatus('screen')
}

function reminderPreferences() {
  return lastWorkspace?.preferences && typeof lastWorkspace.preferences === 'object'
    ? lastWorkspace.preferences
    : {}
}

function isWithinDnd(preferences, now = new Date()) {
  if (!preferences.dndEnabled) return false
  const [startHour, startMinute] = String(preferences.dndStart ?? '22:30').split(':').map(Number)
  const [endHour, endMinute] = String(preferences.dndEnd ?? '08:30').split(':').map(Number)
  const current = now.getHours() * 60 + now.getMinutes()
  const start = startHour * 60 + startMinute
  const end = endHour * 60 + endMinute
  if (start === end) return false
  return start < end ? current >= start && current < end : current >= start || current < end
}

function nativeRemindersEnabled() {
  if (process.env.Q_PANEL_NO_NOTIFICATIONS === '1') return false
  const preferences = reminderPreferences()
  if (preferences.nativeNotifications === false) return false
  if (isWithinDnd(preferences)) return false
  return Notification.isSupported()
}

function sendReminderToPanel(entry) {
  if (reminderPreferences().reminderPopup === false) return
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('reminders:due', entry)
  }
}

function showReminderNotification(entry) {
  if (!nativeRemindersEnabled()) return false
  const kindLabel =
    entry.kind === 'task' ? '本周事项' : entry.kind === 'project' ? '长期项目' : '季度任务'
  const notification = new Notification({
    title: `Q-Panel · ${entry.title}`,
    subtitle: `${kindLabel} · ${entry.categoryId ?? '未分类'}`,
    body: `结束 ${entry.dueDate} · ${entry.reminder ?? '按默认提醒'}`,
    silent: false,
  })
  notification.on('click', () => {
    showWindow()
    sendReminderToPanel(entry)
  })
  notification.show()
  return true
}

function markReminderFired(entry) {
  if (!reminderStateStore) return
  reminderStateStore.markFired(entry.key)
  void reminderStateStore.save()
}

function handleReminderDue(entry) {
  markReminderFired(entry)
  // Desktop notification is the primary delivery path. The in-app card is
  // only a fallback for an explicitly disabled/unavailable system channel.
  const delivered = showReminderNotification(entry)
  if (!delivered) sendReminderToPanel(entry)
}

function handleMissedReminders(entries) {
  if (entries.length === 0) return
  for (const entry of entries) markReminderFired(entry)
  const preferences = reminderPreferences()
  let delivered = false
  if (nativeRemindersEnabled()) {
    const notification = new Notification({
      title: `Q-Panel · ${entries.length} 条错过的提醒`,
      subtitle: '错过的事项提醒',
      body: entries.slice(0, 3).map((entry) => entry.title).join('\n'),
    })
    notification.on('click', () => showWindow())
    notification.show()
    delivered = true
  }
  if (!delivered && preferences.reminderPopup !== false) {
    mainWindow?.webContents.send('reminders:missed', { entries })
  }
}

let reminderSyncQueue = Promise.resolve()

async function syncRemindersNow(workspace) {
  if (!workspace || !reminderScheduler || !reminderStateStore) return
  lastWorkspace = workspace
  await reminderStateStore.load()
  const result = reminderScheduler.sync(workspace, reminderStateStore.data)
  if (result.missed.length > 0) handleMissedReminders(result.missed)
  reminderStateStore.setLastRunAt()
  await reminderStateStore.save()
}

function syncReminders(workspace) {
  // The panel and notch windows both load the workspace at startup; serialize
  // reminder-state writes so a load can never fail because of a write race.
  reminderSyncQueue = reminderSyncQueue
    .then(() => syncRemindersNow(workspace))
    .catch((error) => {
      console.error('reminder sync failed', error)
    })
  return reminderSyncQueue
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    minWidth: 980,
    minHeight: 620,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    roundedCorners: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hiddenInMissionControl: true,
    acceptFirstMouse: true,
    fullscreenable: false,
    title: 'Q-Panel',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  })

  mainWindow.setBackgroundColor('#00000000')
  mainWindow.setAlwaysOnTop(true, 'screen-saver')
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  mainWindow.once('ready-to-show', () => {
    if (process.env.Q_PANEL_START_EXPANDED === '1') showWindow()
  })

  mainWindow.on('blur', () => {
    if (blurHideTimer) clearTimeout(blurHideTimer)
    blurHideTimer = setTimeout(() => {
      if (
        mainWindow &&
        !mainWindow.isDestroyed() &&
        mainWindow.isVisible() &&
        !mainWindow.isFocused() &&
        activeNativeDialogs === 0 &&
        !mainWindow.webContents.isDevToolsOpened()
      ) {
        hideWindow()
      }
    }, 180)
  })

  mainWindow.on('focus', () => {
    if (blurHideTimer) {
      clearTimeout(blurHideTimer)
      blurHideTimer = null
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = isDev
      ? url.startsWith(process.env.Q_PANEL_DEV_URL)
      : url.startsWith('file://')
    if (!allowed) {
      event.preventDefault()
      if (/^https?:\/\//i.test(url)) shell.openExternal(url)
    }
  })

  mainWindow.on('close', () => {
    showNotch()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  placePanelOnDisplay()

  const devUrl = rendererUrl()
  if (devUrl) mainWindow.loadURL(devUrl)
  else {
    mainWindow.loadFile(rendererFile(), {
      query: {
        electron: '1',
        noreminder: '1',
        ...(process.env.Q_PANEL_NOW ? { now: process.env.Q_PANEL_NOW } : {}),
      },
    })
  }
}

function createNotchWindow() {
  const bounds = notchBounds()
  notchWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    acceptFirstMouse: true,
    roundedCorners: true,
    focusable: false,
    enableLargerThanScreen: true,
    title: 'Q-Panel',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  })

  notchWindow.setBackgroundColor('#00000000')
  notchWindow.setAlwaysOnTop(true, 'screen-saver', 1)
  notchWindow.setIgnoreMouseEvents(false)
  notchWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  notchWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  notchWindow.once('ready-to-show', () => {
    if (process.env.Q_PANEL_START_EXPANDED !== '1') showNotch()
  })

  notchWindow.on('closed', () => {
    notchWindow = null
  })

  const devUrl = rendererUrl()
  if (devUrl) {
    const url = new URL(devUrl)
    url.searchParams.set('notch', '1')
    notchWindow.loadURL(url.toString())
  } else {
    notchWindow.loadFile(rendererFile(), {
      query: {
        electron: '1',
        notch: '1',
        noreminder: '1',
        ...(process.env.Q_PANEL_NOW ? { now: process.env.Q_PANEL_NOW } : {}),
      },
    })
  }
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'trayTemplate.png')
  const icon = nativeImage.createFromPath(iconPath)
  if (process.platform === 'darwin') icon.setTemplateImage(true)
  tray = new Tray(icon.resize({ width: 18, height: 18 }))
  tray.setToolTip('Q-Panel · 点击刘海或 ⌥ Space 打开')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '显示 Q-Panel', click: showWindow },
      { label: '隐藏 Q-Panel', click: hideWindow },
      { type: 'separator' },
      { label: '退出', role: 'quit' },
    ]),
  )
  tray.on('click', toggleWindow)
}

function registerIpc() {
  ipcMain.handle('workspace:load', async () => {
    if (!store) store = new WorkspaceStore(app.getPath('userData'))
    const result = await store.load()
    if (!result.ok || !result.data) return result
    const normalized = normalizeWorkspace(result.data)
    if (!normalized.ok) return { ok: false, error: normalized.error }
    if (normalized.migrated) await store.backupNow('before-migration')
    await syncReminders(normalized.data)
    if (
      app.isPackaged &&
      process.env.Q_PANEL_DISABLE_AUTO_LAUNCH !== '1' &&
      normalized.data.preferences &&
      typeof normalized.data.preferences.autoLaunch === 'boolean'
    ) {
      app.setLoginItemSettings({ openAtLogin: normalized.data.preferences.autoLaunch })
    }
    return { ...result, data: normalized.data, migrated: normalized.migrated }
  })
  ipcMain.handle('workspace:save', async (_event, payload) => {
    if (!store) store = new WorkspaceStore(app.getPath('userData'))
    const result = await store.save(payload)
    if (result.ok) {
      await syncReminders(payload)
      notchWindow?.webContents.send('workspace:saved')
    }
    return result
  })
  ipcMain.handle('workspace:export', async (_event, payload) => {
    if (!store) store = new WorkspaceStore(app.getPath('userData'))
    const testPath = process.env.Q_PANEL_TEST_EXPORT_PATH
    let destination = testPath
    if (!destination) {
      const result = await withNativeDialog(() => dialog.showSaveDialog(mainWindow ?? undefined, {
        title: '导出 Q-Panel 工作区',
        defaultPath: path.join(app.getPath('documents'), `q-panel-workspace-${new Date().toISOString().slice(0, 10)}.json`),
        filters: [{ name: 'Q-Panel workspace', extensions: ['json'] }],
      }))
      if (result.canceled || !result.filePath) return { ok: false, canceled: true }
      destination = result.filePath
    }
    return exportWorkspaceFile(destination, payload)
  })

  ipcMain.handle('workspace:import', async () => {
    if (!store) store = new WorkspaceStore(app.getPath('userData'))
    const testPath = process.env.Q_PANEL_TEST_IMPORT_PATH
    let source = testPath
    if (!source) {
      const result = await withNativeDialog(() => dialog.showOpenDialog(mainWindow ?? undefined, {
        title: '导入 Q-Panel 工作区',
        properties: ['openFile'],
        filters: [{ name: 'Q-Panel workspace', extensions: ['json'] }],
      }))
      if (result.canceled || result.filePaths.length === 0) return { ok: false, canceled: true }
      source = result.filePaths[0]
    }
    await store.backupNow('before-import')
    return importWorkspaceFile(source)
  })

  ipcMain.handle('window:hide', () => {
    hideWindow()
    return { ok: true }
  })
  ipcMain.handle('window:show', () => {
    showWindow()
    return { ok: true }
  })
  ipcMain.handle('window:toggle', () => {
    toggleWindow()
    return { ok: true }
  })
  ipcMain.handle('notch:expand', async () => {
    await showWindow()
    return { ok: true, visible: true }
  })
  ipcMain.handle('notch:toggle', async () => {
    await toggleWindow()
    return { ok: true, visible: Boolean(mainWindow?.isVisible()) }
  })
  ipcMain.handle('app:get-backdrop', () => lastBackdrop)
  ipcMain.handle('ai:config:get', async () => {
    if (!aiConfigStore) return { ok: false, error: 'not_ready' }
    return { ok: true, config: (await aiConfigStore.load()).config }
  })
  ipcMain.handle('ai:config:save', async (_event, payload) => {
    if (!aiConfigStore) return { ok: false, error: 'not_ready' }
    const result = await aiConfigStore.save(payload ?? {})
    if (!result.ok) return result
    return { ok: true, config: result.config }
  })
  ipcMain.handle('ai:config:test', async () => {
    if (!aiConfigStore) return { ok: false, error: 'not_ready' }
    const { config } = await aiConfigStore.load()
    const apiKey = await aiConfigStore.getApiKey()
    return testAiConnection({ config, apiKey })
  })
  ipcMain.handle('ai:propose', async (_event, payload) => {
    if (!aiConfigStore) return { ok: false, error: 'not_ready' }
    const prompt = typeof payload?.prompt === 'string' ? payload.prompt.trim().slice(0, 2000) : ''
    if (!prompt) return { ok: false, error: 'empty_prompt' }
    const context = payload?.context && typeof payload.context === 'object' ? payload.context : {}
    const { config } = await aiConfigStore.load()
    const apiKey = await aiConfigStore.getApiKey()
    return callAiGeneration({ config, apiKey, prompt, context })
  })

  ipcMain.handle('metadata:fetch', async (_event, url) => {
    if (typeof url !== 'string' || url.length > 2048) return { ok: false, error: 'invalid_url' }
    return fetchPageMetadata(url, {
      allowLoopback: process.env.Q_PANEL_METADATA_ALLOW_LOOPBACK === '1',
    })
  })

  ipcMain.handle('reminders:test', () => {
    const entry = reminderScheduler?.triggerTest()
    return { ok: true, entry }
  })
  ipcMain.handle('reminders:snooze', async (_event, entry) => {
    if (!reminderStateStore || !entry || typeof entry.key !== 'string') {
      return { ok: false, error: 'invalid_reminder' }
    }
    const until = new Date(Date.now() + 10 * 60 * 1000)
    await reminderStateStore.load()
    reminderStateStore.snooze(entry.key, until)
    await reminderStateStore.save()
    if (lastWorkspace) await syncReminders(lastWorkspace)
    return { ok: true, until: until.toISOString() }
  })
  ipcMain.handle('app:version', () => app.getVersion())
  ipcMain.handle('app:screen-permission', () => ({ status: screenCapturePermission() }))
  ipcMain.handle('app:open-screen-settings', async () => {
    if (process.platform !== 'darwin') return { ok: false, error: 'unsupported' }
    await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture')
    return { ok: true }
  })
  ipcMain.handle('app:set-auto-launch', (_event, enabled) => {

    if (process.env.Q_PANEL_DISABLE_AUTO_LAUNCH === '1') return { ok: true, skipped: 'disabled-by-env' }
    if (!app.isPackaged) return { ok: true, skipped: 'development' }
    app.setLoginItemSettings({ openAtLogin: Boolean(enabled) })
    return { ok: true, openAtLogin: app.getLoginItemSettings().openAtLogin }
  })
}

function installApplicationMenu() {
  const template = [
    ...(process.platform === 'darwin'
      ? [
          {
            label: 'Q-Panel',
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { label: '显示面板', accelerator: 'Command+Shift+Space', click: toggleWindow },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    // Accessory apps live in the menu bar only: no Dock icon and no Cmd-Tab
    // entry. The LSUIElement Info.plist entry is the packaged equivalent.
    app.setActivationPolicy('accessory')
    if (process.env.Q_PANEL_HIDE_DOCK !== '0') app.dock?.hide()
  }
  installApplicationMenu()
  aiConfigStore = createAiConfigStore(path.join(app.getPath('userData'), 'ai-config.json'), safeStorage)
  reminderStateStore = new ReminderStateStore(app.getPath('userData'))
  reminderScheduler = new ReminderScheduler({
    onDue: handleReminderDue,
    now: () => (process.env.Q_PANEL_NOW ? new Date(process.env.Q_PANEL_NOW) : new Date()),
  })
  registerIpc()
  createWindow()
  createNotchWindow()
  createTray()
  globalShortcut.register('CommandOrControl+Shift+Space', toggleWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else showWindow()
  })
})

app.on('second-instance', showWindow)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
app.on('will-quit', () => {
  reminderScheduler?.clear()
  globalShortcut.unregisterAll()
})
