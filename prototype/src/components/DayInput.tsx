import { useEffect, useRef, useState } from 'react'

interface DayInputProps {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  min?: number
  fallback?: number
  className?: string
  label?: string
}

/**
 * Person-day input that keeps an in-progress empty value as an empty field.
 * A native numeric input cannot reliably be cleared while its value is stored
 * as a number; this keeps the visible draft separate from the committed number.
 */
export function DayInput({
  value,
  onChange,
  placeholder = '0.5',
  min = 0,
  fallback = 0.5,
  className,
  label,
}: DayInputProps) {
  const [text, setText] = useState(Number.isFinite(value) ? String(value) : '')
  const editing = useRef(false)

  useEffect(() => {
    if (!editing.current) setText(Number.isFinite(value) ? String(value) : '')
  }, [value])

  const commit = () => {
    const parsed = Number(text)
    const next = text.trim() !== '' && Number.isFinite(parsed) ? Math.max(min, parsed) : fallback
    setText(String(next))
    onChange(next)
  }

  return (
    <input
      className={className}
      type="text"
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      aria-label={label}
      onFocus={() => {
        editing.current = true
      }}
      onChange={(event) => {
        const next = event.target.value.replace(/[^0-9.]/g, '')
        setText(next)
        if (next.trim() !== '') {
          const parsed = Number(next)
          if (Number.isFinite(parsed)) onChange(Math.max(min, parsed))
        }
      }}
      onBlur={() => {
        editing.current = false
        commit()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') {
          editing.current = false
          setText(Number.isFinite(value) ? String(value) : '')
          event.currentTarget.blur()
        }
      }}
    />
  )
}
