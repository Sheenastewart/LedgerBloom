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
  title,
}: {
  children: ReactNode
  action?: ReactNode
  /** Optional short heading for intentional empty screens. */
  title?: string
}) {
  return (
    <div className="empty-state" role="status">
      {title ? <p className="empty-state__title">{title}</p> : null}
      <div className="empty-state__body">{children}</div>
      {action}
    </div>
  )
}

export function LoadingState({
  children = 'Loading…',
  withSkeleton = false,
}: {
  children?: ReactNode
  /** Subtle placeholder bars while content loads. */
  withSkeleton?: boolean
}) {
  return (
    <div className="loading-state" role="status" aria-live="polite" aria-busy="true">
      {withSkeleton ? (
        <div className="skeleton-stack" aria-hidden="true">
          <div className="skeleton-block skeleton-block--lg" />
          <div className="skeleton-block" />
          <div className="skeleton-block skeleton-block--sm" />
        </div>
      ) : null}
      <p>{children}</p>
    </div>
  )
}
