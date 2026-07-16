import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description?: string
  actions?: ReactNode
  headingLevel?: 1 | 2
}

export function PageHeader({ title, description, actions, headingLevel = 1 }: PageHeaderProps) {
  const HeadingTag = headingLevel === 1 ? 'h1' : 'h2'
  return (
    <div className="page-header">
      <div>
        <HeadingTag>{title}</HeadingTag>
        {description ? <p className="page-subtitle">{description}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </div>
  )
}
