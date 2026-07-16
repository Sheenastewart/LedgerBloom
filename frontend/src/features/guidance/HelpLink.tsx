import { Link } from 'react-router-dom'

type HelpLinkProps = {
  to: string
  children: React.ReactNode
  className?: string
}

/** Lightweight contextual link into the Help Center. */
export function HelpLink({ to, children, className = 'help-link' }: HelpLinkProps) {
  return (
    <Link to={to} className={`${className} no-print`}>
      {children}
    </Link>
  )
}
