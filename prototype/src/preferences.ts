import type { UserPreferences } from './types'

export const DEFAULT_PREFERENCES: UserPreferences = {
  autoLaunch: true,
  nativeNotifications: true,
  reminderPopup: true,
  dndEnabled: false,
  dndStart: '22:30',
  dndEnd: '08:30',
  defaultView: 'quarter',
  bufferPercent: 0,
  confirmAiWrites: true,
  aiScope: 'summary',
  backupDays: 14,
  blurStrength: 56,
  panelTint: 18,
}
