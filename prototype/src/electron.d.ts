interface QPanelWorkspaceLoadResult {
  ok: boolean
  data?: unknown
  path?: string
  error?: string
  message?: string
  migrated?: boolean
}

interface QPanelWorkspaceSaveResult {
  ok: boolean
  savedAt?: string
  path?: string
  error?: string
}

interface QPanelReminderEntry {
  key: string
  id: string
  kind: 'task' | 'objective' | 'project'
  title: string
  dueDate: string
  dueTime: string
  reminder: string
  categoryId?: string | null
  dueAt: string
  remindAt: string
}

interface QPanelBridge {
  isElectron: true
  platform: string
  workspace: {
    load: () => Promise<QPanelWorkspaceLoadResult>
    save: (payload: unknown) => Promise<QPanelWorkspaceSaveResult>
    export: (payload: unknown) => Promise<{ ok: boolean; canceled?: boolean; path?: string; error?: string }>
    import: () => Promise<{ ok: boolean; canceled?: boolean; data?: unknown; error?: string; migrated?: boolean }>
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
  ai: {
    getConfig: () => Promise<{ ok: boolean; config?: { baseUrl: string; model: string; hasKey: boolean }; error?: string }>
    saveConfig: (payload: { baseUrl: string; model: string; apiKey?: string }) => Promise<{
      ok: boolean
      config?: { baseUrl: string; model: string; hasKey: boolean }
      error?: string
    }>
    testConfig: () => Promise<{ ok: boolean; error?: string; status?: number; model?: string }>
    propose: (payload: { prompt: string; context: unknown }) => Promise<{
      ok: boolean
      message?: string
      tasks?: unknown[]
      error?: string
      status?: number
    }>
  }
  metadata: {
    fetch: (url: string) => Promise<{
      ok: boolean
      title?: string
      description?: string
      url?: string
      error?: string
    }>
  }
  reminders: {
    test: () => Promise<{ ok: boolean; entry?: QPanelReminderEntry }>
    snooze: (entry: { key: string }) => Promise<{ ok: boolean; until?: string; error?: string }>
    onDue: (callback: (entry: QPanelReminderEntry) => void) => () => void
    onMissed: (callback: (payload: { entries: QPanelReminderEntry[] }) => void) => () => void
  }
}

interface Window {
  qpanel?: QPanelBridge
}
