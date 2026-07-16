import type { ReactNode } from 'react'

type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

type StatusBadgeProps = {
  tone?: StatusTone
  children: ReactNode
  className?: string
}

export function StatusBadge({ tone = 'neutral', children, className }: StatusBadgeProps) {
  return (
    <span className={['status-badge', `status-badge--${tone}`, className].filter(Boolean).join(' ')}>
      {children}
    </span>
  )
}
