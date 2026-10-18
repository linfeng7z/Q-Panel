import { useEffect, useState } from 'react'

const DEFAULT_SHORTCUT = 'CommandOrControl+Shift+Space'

const MODIFIER_KEYS = new Set(['Meta', 'Control', 'Alt', 'Shift', 'CapsLock'])

function displayKey(key: string): string {
  const map: Record<string, string> = {
    CommandOrControl: '⌘',
    Command: '⌘',
    Control: '⌃',
    Alt: '⌥',
    Shift: '⇧',
    Space: 'Space',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Escape: 'Esc',
    Enter: '↩',
    Backspace: '⌫',
    Delete: '⌦',
    Tab: '⇥',
  }
  return map[key] ?? (key.length === 1 ? key.toUpperCase() : key)
}

function formatAccelerator(value: string): string {
  return value.split('+').map(displayKey).join(' ')
}

function eventKeyToAccelerator(event: KeyboardEvent): string {
  const keyMap: Record<string, string> = {
    ' ': 'Space',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Escape: 'Escape',
    Enter: 'Return',
    Backspace: 'Backspace',
    Delete: 'Delete',
    Tab: 'Tab',
  }
  const key = keyMap[event.key] ?? (event.key.length === 1 ? event.key.toUpperCase() : event.key)
  const parts: string[] = []
  if (event.metaKey) parts.push('CommandOrControl')
  else if (event.ctrlKey) parts.push('Control')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')
  parts.push(key)
  return parts.join('+')
}

interface GlobalShortcutFieldProps {
  value: string
  onChange: (accelerator: string) => Promise<{ ok: boolean; error?: string }>
}

export function GlobalShortcutField({ value, onChange }: GlobalShortcutFieldProps) {
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!recording) return
    const handler = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.key === 'Escape') {
        setRecording(false)
        setError('')
        return
      }
      if (MODIFIER_KEYS.has(event.key)) return
      const modifierCount = Number(event.metaKey || event.ctrlKey) + Number(event.altKey) + Number(event.shiftKey)
      if (modifierCount === 0) {
        setError('至少需要一个 ⌘ / ⌃ / ⌥ / ⇧ 修饰键')
        return
      }
      const next = eventKeyToAccelerator(event)
      void onChange(next).then((result) => {
        if (result.ok) {
          setRecording(false)
          setError('')
        } else {
          setError(result.error === 'shortcut_unavailable' ? '该快捷键已被占用，请换一个' : '快捷键保存失败')
        }
      })
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [recording, onChange])

  return (
    <div className="global-shortcut-field">
      <button
        type="button"
        className={`settings-code global-shortcut-record${recording ? ' recording' : ''}`}
        onClick={() => {
          setRecording((current) => !current)
          setError('')
        }}
        aria-label="自定义全局快捷键"
      >
        {recording ? '请按下组合键…' : formatAccelerator(value || DEFAULT_SHORTCUT)}
      </button>
      <button
        type="button"
        className="global-shortcut-reset"
        onClick={() => {
          setRecording(false)
          setError('')
          void onChange(DEFAULT_SHORTCUT)
        }}
        title="恢复默认"
      >
        重置
      </button>
      {recording ? <span className="global-shortcut-hint">Esc 取消</span> : null}
      {error ? <span className="global-shortcut-error">{error}</span> : null}
    </div>
  )
}
