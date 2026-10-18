import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { backdropMaterial, backdropVariables } from '../backdrop'

/** Local preview keeps a slider drag out of the workbench's React render path.
 * CSS variables update on the next frame; persistence follows a short idle or
 * release/keyboard/blur, not an animated transition that trails the pointer. */
export function BlurStrengthControl({ value, onCommit }: {
  value: number
  onCommit: (value: number) => void
}) {
  const [preview, setPreview] = useState(value)
  const latest = useRef(value)
  const commitCallback = useRef(onCommit)
  useLayoutEffect(() => { commitCallback.current = onCommit }, [onCommit])
  const pending = useRef(false)
  const frame = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const flush = () => {
    clearTimeout(timer.current)
    if (!pending.current) return
    pending.current = false
    commitCallback.current(latest.current)
  }

  useEffect(() => {
    if (!pending.current) {
      latest.current = value
      setPreview(value)
    }
  }, [value])

  useEffect(() => () => {
    cancelAnimationFrame(frame.current)
    clearTimeout(timer.current)
    if (pending.current) commitCallback.current(latest.current)
  }, [])

  const update = (value: number, input: HTMLInputElement) => {
    latest.current = value
    pending.current = true
    setPreview(value)
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const root = input.closest('.qp-root') as HTMLElement | null
      if (root) {
        for (const [name, content] of Object.entries(backdropVariables(latest.current))) {
          root.style.setProperty(name, content)
        }
      }
    })
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, 180)
  }

  return (
    <div className="settings-range-control">
      <input
        className="settings-range"
        type="range"
        min="0"
        max="80"
        step="1"
        value={preview}
        onChange={(event) => update(Number(event.target.value), event.target)}
        onPointerUp={flush}
        onKeyUp={flush}
        onBlur={flush}
        aria-label="背景模糊度"
        aria-valuetext={`${backdropMaterial(preview).percent}%${preview === 80 ? '，完全隔离桌面' : ''}`}
      />
      <span className="settings-range-value">{backdropMaterial(preview).percent}%</span>
    </div>
  )
}
