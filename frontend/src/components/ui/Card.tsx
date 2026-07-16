import type { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
  as?: 'div' | 'article' | 'section'
}

export function Card({ children, className, as: Tag = 'div' }: CardProps) {
  return <Tag className={['lb-card', className].filter(Boolean).join(' ')}>{children}</Tag>
}

type StatCardProps = {
  label: ReactNode
  value: ReactNode
  negative?: boolean
  className?: string
}

export function StatCard({ label, value, negative, className }: StatCardProps) {
  return (
    <article className={['stat-card', className].filter(Boolean).join(' ')}>
      <h2 className="stat-card__label">{label}</h2>
      <p className={negative ? 'stat-card__value is-negative' : 'stat-card__value'}>{value}</p>
    </article>
  )
}

export function MetricCard({ label, value, negative, className }: StatCardProps) {
  return (
    <article className={['metric-card', className].filter(Boolean).join(' ')}>
      <h2 className="metric-card__label">{label}</h2>
      <p className={negative ? 'metric-card__value is-negative' : 'metric-card__value'}>{value}</p>
    </article>
  )
}
