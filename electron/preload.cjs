const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('qpanel', {
  isElectron: true,
  platform: process.platform,
  workspace: {
    load: () => ipcRenderer.invoke('workspace:load'),
    save: (payload) => ipcRenderer.invoke('workspace:save', payload),
  },
  window: {
    hide: () => ipcRenderer.invoke('window:hide'),
    show: () => ipcRenderer.invoke('window:show'),
    toggle: () => ipcRenderer.invoke('window:toggle'),
  },
  notch: {
    expand: () => ipcRenderer.invoke('notch:expand'),
    onWorkspaceSaved: (callback) => {
      const listener = () => callback()
      ipcRenderer.on('workspace:saved', listener)
      return () => ipcRenderer.removeListener('workspace:saved', listener)
    },
  },
  app: {
    version: () => ipcRenderer.invoke('app:version'),
  },
})
