import { useState, type ReactNode } from 'react'

type PeriodDetailsProps = {
  defaultOpen?: boolean
  className?: string
  children: ReactNode
}

/** Uncontrolled-feeling details with a reliable initial open state. */
export function PeriodDetails({ defaultOpen = false, className, children }: PeriodDetailsProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <details
      className={className}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      {children}
    </details>
  )
}
