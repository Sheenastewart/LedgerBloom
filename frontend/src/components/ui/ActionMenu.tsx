import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'
import { MoreIcon } from '../icons/MoreIcon'

export type ActionMenuItem =
  | {
      id: string
      label: string
      kind?: 'default' | 'danger'
      to?: string
      state?: unknown
      onSelect?: () => void
      disabled?: boolean
    }

type ActionMenuProps = {
  label: string
  items: ActionMenuItem[]
}

export function ActionMenu({ label, items }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function onButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen(true)
    }
  }

  return (
    <div className="action-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="button button-icon"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onButtonKeyDown}
      >
        <MoreIcon />
      </button>
      {open ? (
        <div className="action-menu__panel" role="menu" id={menuId} aria-label={label}>
          {items.map((item) => {
            const className = [
              'action-menu-item',
              item.kind === 'danger' ? 'action-menu-item--danger' : '',
            ]
              .filter(Boolean)
              .join(' ')

            if (item.to) {
              return (
                <Link
                  key={item.id}
                  role="menuitem"
                  className={className}
                  to={item.to}
                  state={item.state}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              )
            }

            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className={className}
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false)
                  item.onSelect?.()
                }}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export function confirmDestructive(message: string): boolean {
  return window.confirm(message)
}

export type { ReactNode }
