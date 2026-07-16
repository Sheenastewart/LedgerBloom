import { useId, useState } from 'react'
import './howThisWorks.css'

type HowThisWorksProps = {
  title?: string
  children: React.ReactNode
}

export function HowThisWorks({ title = 'How this works', children }: HowThisWorksProps) {
  const panelId = useId()
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="how-this-works no-print">
      <button
        type="button"
        className="how-this-works-toggle"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((prev) => !prev)}
      >
        {title}
      </button>
      <div
        id={panelId}
        className={expanded ? 'how-this-works-panel is-open' : 'how-this-works-panel'}
        hidden={!expanded}
      >
        {expanded ? children : null}
      </div>
    </div>
  )
}
