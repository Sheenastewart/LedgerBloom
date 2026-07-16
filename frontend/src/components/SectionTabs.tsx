import { NavLink } from 'react-router-dom'
import './sectionNav.css'

export type SectionTab = {
  to: string
  label: string
  end?: boolean
}

type SectionTabsProps = {
  ariaLabel: string
  tabs: SectionTab[]
}

export function SectionTabs({ ariaLabel, tabs }: SectionTabsProps) {
  return (
    <nav className="section-tabs" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => (isActive ? 'section-tab active' : 'section-tab')}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
