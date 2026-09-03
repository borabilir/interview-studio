import { Children, Fragment, isValidElement, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode, type SelectHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

type NativeOptionProps = {
  value?: string | number
  disabled?: boolean
  children?: ReactNode
}

type NativeOptgroupProps = {
  label?: ReactNode
  disabled?: boolean
  children?: ReactNode
}

type SelectOption = {
  value: string
  label: string
  disabled: boolean
  group?: string
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'multiple' | 'size'> & {
  children: ReactNode
}

function optionLabel(value: ReactNode): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(optionLabel).join('')
  return ''
}

export function Select({ value, defaultValue, onChange, children, className, disabled, 'aria-label': ariaLabel }: SelectProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0, width: 0 })
  const [internalValue, setInternalValue] = useState(String(defaultValue ?? ''))
  const [highlighted, setHighlighted] = useState(0)
  const options = useMemo(() => {
    const result: SelectOption[] = []
    for (const child of Children.toArray(children)) {
      if (!isValidElement(child)) continue
      if (child.type === 'option') {
        const props = child.props as NativeOptionProps
        result.push({ value: String(props.value ?? ''), label: optionLabel(props.children), disabled: Boolean(props.disabled) })
        continue
      }
      if (child.type !== 'optgroup') continue
      const groupProps = child.props as NativeOptgroupProps
      const group = optionLabel(groupProps.label)
      for (const optionChild of Children.toArray(groupProps.children)) {
        if (!isValidElement(optionChild) || optionChild.type !== 'option') continue
        const optionProps = optionChild.props as NativeOptionProps
        result.push({
          value: String(optionProps.value ?? ''),
          label: optionLabel(optionProps.children),
          disabled: Boolean(groupProps.disabled || optionProps.disabled),
          group,
        })
      }
    }
    return result
  }, [children])
  const selectedValue = String(value ?? internalValue)
  const selected = options.find((option) => option.value === selectedValue) ?? options[0]

  useEffect(() => {
    const close = (event: MouseEvent) => {
      const target = event.target as Node
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => {
    const index = options.findIndex((option) => option.value === selectedValue)
    if (index >= 0) setHighlighted(index)
  }, [options, selectedValue])

  useEffect(() => {
    if (!open) return
    const closeOnViewportChange = (event: Event) => {
      if (event.type === 'scroll' && menuRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    window.addEventListener('resize', closeOnViewportChange)
    window.addEventListener('scroll', closeOnViewportChange, true)
    return () => {
      window.removeEventListener('resize', closeOnViewportChange)
      window.removeEventListener('scroll', closeOnViewportChange, true)
    }
  }, [open])

  const choose = (nextValue: string) => {
    setInternalValue(nextValue)
    onChange?.({ target: { value: nextValue }, currentTarget: { value: nextValue } } as ChangeEvent<HTMLSelectElement>)
    setOpen(false)
  }

  const move = (direction: 1 | -1) => {
    if (!options.length) return
    let next = highlighted
    do next = (next + direction + options.length) % options.length
    while (options[next]?.disabled && next !== highlighted)
    setHighlighted(next)
  }

  const openMenu = () => {
    const bounds = rootRef.current?.getBoundingClientRect()
    if (bounds) {
      const estimatedMenuHeight = Math.min(288, options.length * 42 + 12)
      const opensUpward = bounds.bottom + 6 + estimatedMenuHeight > window.innerHeight && bounds.top > estimatedMenuHeight
      const menuWidth = Math.min(Math.max(bounds.width + 48, bounds.width), 360, window.innerWidth - 16)
      setMenuPosition({
        left: Math.max(8, Math.min(bounds.left, window.innerWidth - menuWidth - 8)),
        top: opensUpward ? bounds.top - estimatedMenuHeight - 6 : bounds.bottom + 6,
        width: menuWidth,
      })
    }
    setOpen(true)
  }

  return (
    <div ref={rootRef} className="relative min-w-0 max-w-full">
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => open ? setOpen(false) : openMenu()}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            if (!open) openMenu()
            else move(event.key === 'ArrowDown' ? 1 : -1)
          } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            if (open && options[highlighted] && !options[highlighted].disabled) choose(options[highlighted].value)
            else openMenu()
          } else if (event.key === 'Escape') {
            setOpen(false)
          }
        }}
        className={cn('flex h-10 w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 text-left text-sm text-foreground outline-none transition hover:border-primary/35 focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50', className)}
      >
        <span className="min-w-0 flex-1 truncate">{selected?.label}</span>
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open ? createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={{ left: menuPosition.left, top: menuPosition.top, width: menuPosition.width }}
          className="fixed z-[9999] max-h-72 overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-2xl"
        >
          {options.map((option, index) => (
            <Fragment key={`${option.value}-${index}`}>
              {option.group && option.group !== options[index - 1]?.group ? (
                <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground first:pt-1">
                  {option.group}
                </div>
              ) : null}
              <button
                type="button"
                role="option"
                aria-selected={option.value === selectedValue}
                disabled={option.disabled}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => choose(option.value)}
                className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition disabled:opacity-40', highlighted === index && 'bg-muted', option.value === selectedValue ? 'font-semibold text-primary' : 'text-foreground')}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.value === selectedValue ? <Check className="size-4 shrink-0" /> : null}
              </button>
            </Fragment>
          ))}
        </div>,
        document.body,
      ) : null}
    </div>
  )
}
