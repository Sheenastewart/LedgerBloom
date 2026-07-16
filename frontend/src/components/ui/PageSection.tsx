import type { ReactNode } from 'react'

type SectionHeaderProps = {
  id?: string
  title: string
  description?: string
  actions?: ReactNode
}

export function SectionHeader({ id, title, description, actions }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div>
        <h2 id={id}>{title}</h2>
        {description ? <p className="page-subtitle">{description}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </div>
  )
}
