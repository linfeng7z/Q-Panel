import { app, BrowserWindow, Menu, Notification, Tray, dialog, globalShortcut, ipcMain, nativeImage, screen, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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

const NOTCH_WIDTH = 210
const NOTCH_HEIGHT = 38

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

function showNotch() {
  if (!notchWindow) return
  notchWindow.showInactive()
}

function hideNotch() {
  notchWindow?.hide()
}

function showWindow() {
  hideNotch()
  if (!mainWindow) {
    createWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function hideWindow() {
  mainWindow?.hide()
  showNotch()
}

function toggleWindow() {
  if (!mainWindow) return
  if (mainWindow.isVisible()) hideWindow()
  else showWindow()
}

function sendReminderToPanel(entry) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('reminders:due', entry)
  }
}

function showReminderNotification(entry) {
  if (process.env.Q_PANEL_NO_NOTIFICATIONS === '1') return
  if (!Notification.isSupported()) return
  const notification = new Notification({
    title: 'Q-Panel 提醒',
    body: `${entry.title}\n截止 ${entry.dueDate} ${entry.dueTime}`,
    silent: false,
  })
  notification.on('click', () => {
    showWindow()
    sendReminderToPanel(entry)
  })
  notification.show()
}

function markReminderFired(entry) {
  if (!reminderStateStore) return
  reminderStateStore.markFired(entry.key)
  void reminderStateStore.save()
}

function handleReminderDue(entry) {
  markReminderFired(entry)
  showReminderNotification(entry)
  sendReminderToPanel(entry)
}

function handleMissedReminders(entries) {
  if (entries.length === 0) return
  for (const entry of entries) markReminderFired(entry)
  if (process.env.Q_PANEL_NO_NOTIFICATIONS !== '1' && Notification.isSupported()) {
    const notification = new Notification({
      title: `Q-Panel · ${entries.length} 条错过的提醒`,
      body: entries.slice(0, 3).map((entry) => entry.title).join('\n'),
    })
    notification.on('click', () => showWindow())
    notification.show()
  }
  mainWindow?.webContents.send('reminders:missed', { entries })
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
    width: 1280,
    height: 760,
    minWidth: 980,
    minHeight: 620,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    resizable: true,
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

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
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
  const display = screen.getPrimaryDisplay()
  const { x, y, width } = display.bounds
  notchWindow = new BrowserWindow({
    x: Math.round(x + (width - NOTCH_WIDTH) / 2),
    y,
    width: NOTCH_WIDTH,
    height: NOTCH_HEIGHT,
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
    focusable: true,
    title: 'Q-Panel',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  })

  notchWindow.setAlwaysOnTop(true, 'floating')
  notchWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  notchWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
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
  tray = new Tray(icon.resize({ width: 18, height: 18 }))
  tray.setToolTip('Q-Panel')
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
      const result = await dialog.showSaveDialog(mainWindow ?? undefined, {
        title: '导出 Q-Panel 工作区',
        defaultPath: path.join(app.getPath('documents'), `q-panel-workspace-${new Date().toISOString().slice(0, 10)}.json`),
        filters: [{ name: 'Q-Panel workspace', extensions: ['json'] }],
      })
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
      const result = await dialog.showOpenDialog(mainWindow ?? undefined, {
        title: '导入 Q-Panel 工作区',
        properties: ['openFile'],
        filters: [{ name: 'Q-Panel workspace', extensions: ['json'] }],
      })
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
  ipcMain.handle('notch:expand', () => {
    showWindow()
    return { ok: true }
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
  if (process.platform === 'darwin' && process.env.Q_PANEL_HIDE_DOCK !== '0') {
    app.dock?.hide()
  }
  installApplicationMenu()
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
