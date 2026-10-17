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
  reminders: {
    test: () => Promise<{ ok: boolean; entry?: QPanelReminderEntry }>
    onDue: (callback: (entry: QPanelReminderEntry) => void) => () => void
  }
}

interface Window {
  qpanel?: QPanelBridge
}
