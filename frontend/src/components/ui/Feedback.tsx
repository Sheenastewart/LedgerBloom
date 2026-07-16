import type { ReactNode } from 'react'
import { Button } from './Button'

type AlertTone = 'info' | 'success' | 'warning' | 'error'

type AlertProps = {
  tone?: AlertTone
  children: ReactNode
  role?: 'status' | 'alert'
  className?: string
}

export function Alert({ tone = 'info', children, role = 'status', className }: AlertProps) {
  const toneClass =
    tone === 'success'
      ? 'alert alert--success'
      : tone === 'warning'
        ? 'alert alert--warning'
        : tone === 'error'
          ? 'alert alert--error'
          : 'alert'
  return (
    <div className={[toneClass, className].filter(Boolean).join(' ')} role={role}>
      {children}
    </div>
  )
}

export function SuccessBanner({ children }: { children: ReactNode }) {
  return (
    <Alert tone="success" role="status" className="success-banner">
      {children}
    </Alert>
  )
}

export function ErrorPanel({
  children,
  onRetry,
}: {
  children: ReactNode
  onRetry?: () => void
}) {
  return (
    <div className="error-panel status-panel" role="alert">
      <div>{children}</div>
      {onRetry ? (
        <Button variant="secondary" type="button" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  )
}

export function EmptyState({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="empty-state" role="status">
      <div>{children}</div>
      {action}
    </div>
  )
}

export function LoadingState({ children = 'Loading…' }: { children?: ReactNode }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <p>{children}</p>
    </div>
  )
}
