import { useEffect, useId, useRef, useState } from 'react'
import './infoTooltip.css'

type InfoTooltipProps = {
  label: string
  children: React.ReactNode
}

/**
 * Accessible info tooltip: opens via click, focus, hover, or tap; closes via Escape,
 * outside click/tap, blur (when focus leaves), or mouse leave after hover-open.
 * Hover never opens alone without also supporting non-hover interaction.
 */
export function InfoTooltip({ label, children }: InfoTooltipProps) {
  const tooltipId = useId()
  const rootRef = useRef<HTMLSpanElement>(null)
  // Hover and click/focus are tracked separately: a real mouse click is preceded by a
  // hover (mouseenter), so a single shared boolean would make the click handler's
  // toggle immediately cancel out the hover-driven open. Keeping them independent lets
  // hover-open and click/focus-open close through their own paths (mouse leave vs.
  // Escape/outside click/blur) without fighting each other.
  const [hoverOpen, setHoverOpen] = useState(false)
  const [clickOpen, setClickOpen] = useState(false)
  const open = hoverOpen || clickOpen

  useEffect(() => {
    if (!open) {
      return
    }

    function closeAll() {
      setHoverOpen(false)
      setClickOpen(false)
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        closeAll()
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeAll()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <span
      className="info-tooltip"
      ref={rootRef}
      onMouseEnter={() => setHoverOpen(true)}
      onMouseLeave={() => setHoverOpen(false)}
    >
      <button
        type="button"
        className="info-tooltip-trigger"
        aria-label={label}
        aria-expanded={open}
        aria-controls={tooltipId}
        onClick={() => setClickOpen(true)}
        onFocus={() => setClickOpen(true)}
        onBlur={(event) => {
          const next = event.relatedTarget as Node | null
          if (!rootRef.current?.contains(next)) {
            setClickOpen(false)
          }
        }}
      >
        <span aria-hidden="true">i</span>
      </button>
      {open ? (
        <span
          id={tooltipId}
          role="tooltip"
          className="info-tooltip-content"
        >
          {children}
        </span>
      ) : null}
    </span>
  )
}
