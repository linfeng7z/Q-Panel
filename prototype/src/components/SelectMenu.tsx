import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CaretDown, Check } from '@phosphor-icons/react'

export interface SelectOption {
  value: string
  label: string
  description?: string
  swatch?: string
  group?: string
  disabled?: boolean
}

interface SelectMenuProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  className?: string
  style?: CSSProperties
  menuWidth?: number
  prefix?: ReactNode
  compact?: boolean
}

export function SelectMenu({
  value,
  options,
  onChange,
  label,
  placeholder = '请选择',
  className,
  style,
  menuWidth,
  prefix,
  compact = false,
}: SelectMenuProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 220 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const selected = options.find((option) => option.value === value)
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = Math.min(Math.max(rect.width, menuWidth ?? 200), 340)
    const estimatedHeight = Math.min(300, options.length * 32 + 10)
    const below = rect.bottom + 6
    const top = below + estimatedHeight > window.innerHeight - 12 ? Math.max(12, rect.top - estimatedHeight - 6) : below
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))
    setCoords({ top, left, width })
    setActive(selectedIndex)
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
        return
      }
      const enabled = options.map((option, index) => ({ option, index })).filter(({ option }) => !option.disabled)
      if (enabled.length === 0) return
      const currentEnabled = enabled.findIndex(({ index }) => index === active)
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        const next = enabled[(Math.max(currentEnabled, 0) + 1) % enabled.length]
        setActive(next.index)
        menuRef.current?.querySelector<HTMLElement>(`[data-option-index="${next.index}"]`)?.scrollIntoView({ block: 'nearest' })
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        const prev = enabled[(currentEnabled <= 0 ? enabled.length : currentEnabled) - 1]
        setActive(prev.index)
        menuRef.current?.querySelector<HTMLElement>(`[data-option-index="${prev.index}"]`)?.scrollIntoView({ block: 'nearest' })
      } else if (event.key === 'Enter') {
        event.preventDefault()
        const target = options[active]
        if (target && !target.disabled) {
          onChange(target.value)
          setOpen(false)
          triggerRef.current?.focus()
        }
      }
    }
    const onResize = () => setOpen(false)
    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, active, options, onChange])

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          className="select-menu-pop"
          style={{ top: coords.top, left: coords.left, width: coords.width }}
          role="listbox"
          aria-label={label}
        >
          {options.map((option, index) => {
            const group = option.group && (index === 0 || option.group !== options[index - 1]?.group) ? option.group : null
            return (
              <div key={`${option.group ?? ''}-${option.value}`} className="select-menu-option-wrap">
                {group ? <div className="select-menu-group">{group}</div> : null}
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  data-option-index={index}
                  disabled={option.disabled}
                  className={`select-menu-option${option.value === value ? ' selected' : ''}${index === active ? ' active' : ''}${option.disabled ? ' disabled' : ''}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                    triggerRef.current?.focus()
                  }}
                >
                  {option.swatch ? <span className="select-menu-swatch" style={{ background: option.swatch }} /> : null}
                  <span className="select-menu-option-copy">
                    <span className="select-menu-option-label">{option.label}</span>
                    {option.description ? <span className="select-menu-option-desc">{option.description}</span> : null}
                  </span>
                  {option.value === value ? <Check size={13} weight="bold" className="select-menu-check" /> : null}
                </button>
              </div>
            )
          })}
          {options.length === 0 ? <div className="select-menu-empty">暂无可选项</div> : null}
        </div>,
        document.querySelector('.qp-root') ?? document.body,
      )
    : null

  return (
    <div className={`select-menu${compact ? ' compact' : ''}${open ? ' open' : ''}${className ? ` ${className}` : ''}`} style={style}>
      <button
        ref={triggerRef}
        type="button"
        className="select-menu-trigger"
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(event) => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            openMenu()
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
      >
        {prefix ? <span className="select-menu-prefix">{prefix}</span> : null}
        <span className={`select-menu-value${selected ? '' : ' placeholder'}`}>
          {selected?.label ?? placeholder}
        </span>
        <CaretDown size={11} className="select-menu-caret" />
      </button>
      {menu}
    </div>
  )
}
