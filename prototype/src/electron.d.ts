interface QPanelWorkspaceLoadResult {
  ok: boolean
  data?: unknown
  path?: string
  error?: string
  message?: string
}

interface QPanelWorkspaceSaveResult {
  ok: boolean
  savedAt?: string
  path?: string
  error?: string
}

interface QPanelBridge {
  isElectron: true
  platform: string
  workspace: {
    load: () => Promise<QPanelWorkspaceLoadResult>
    save: (payload: unknown) => Promise<QPanelWorkspaceSaveResult>
  }
  window: {
    hide: () => Promise<{ ok: boolean }>
    show: () => Promise<{ ok: boolean }>
    toggle: () => Promise<{ ok: boolean }>
  }
  notch: {
    expand: () => Promise<{ ok: boolean }>
    onWorkspaceSaved: (callback: () => void) => () => void
  }
  app: {
    version: () => Promise<string>
  }
}

interface Window {
  qpanel?: QPanelBridge
}
