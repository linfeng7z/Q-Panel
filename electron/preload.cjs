const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('qpanel', {
  isElectron: true,
  platform: process.platform,
  workspace: {
    load: () => ipcRenderer.invoke('workspace:load'),
    save: (payload) => ipcRenderer.invoke('workspace:save', payload),
    export: (payload) => ipcRenderer.invoke('workspace:export', payload),
    import: () => ipcRenderer.invoke('workspace:import'),
  },
  window: {
    hide: () => ipcRenderer.invoke('window:hide'),
    show: () => ipcRenderer.invoke('window:show'),
    toggle: () => ipcRenderer.invoke('window:toggle'),
  },
  notch: {
    expand: () => ipcRenderer.invoke('notch:expand'),
    toggle: () => ipcRenderer.invoke('notch:toggle'),
    onWorkspaceSaved: (callback) => {
      const listener = () => callback()
      ipcRenderer.on('workspace:saved', listener)
      return () => ipcRenderer.removeListener('workspace:saved', listener)
    },
  },
  ai: {
    getConfig: () => ipcRenderer.invoke('ai:config:get'),
    saveConfig: (payload) => ipcRenderer.invoke('ai:config:save', payload),
    testConfig: () => ipcRenderer.invoke('ai:config:test'),
    propose: (payload) => ipcRenderer.invoke('ai:propose', payload),
  },
  metadata: {
    fetch: (url) => ipcRenderer.invoke('metadata:fetch', url),
  },
  reminders: {
    test: () => ipcRenderer.invoke('reminders:test'),
    snooze: (entry) => ipcRenderer.invoke('reminders:snooze', entry),
    onDue: (callback) => {
      const listener = (_event, entry) => callback(entry)
      ipcRenderer.on('reminders:due', listener)
      return () => ipcRenderer.removeListener('reminders:due', listener)
    },
    onMissed: (callback) => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('reminders:missed', listener)
      return () => ipcRenderer.removeListener('reminders:missed', listener)
    },
  },
  app: {
    version: () => ipcRenderer.invoke('app:version'),
    setAutoLaunch: (enabled) => ipcRenderer.invoke('app:set-auto-launch', enabled),
    getBackdrop: () => ipcRenderer.invoke('app:get-backdrop'),
    onBackdrop: (callback) => {
      const listener = (_event, backdrop) => callback(backdrop)
      ipcRenderer.on('app:backdrop', listener)
      return () => ipcRenderer.removeListener('app:backdrop', listener)
    },
  },
})
