import { NavLink } from 'react-router-dom'

export function ReportsNav() {
  return (
    <nav className="reports-subnav no-print" aria-label="Reports">
      <NavLink
        to="/reports"
        end
        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
      >
        Overview
      </NavLink>
      <NavLink
        to="/reports/trends"
        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
      >
        Trends
      </NavLink>
      <NavLink
        to="/reports/year-to-date"
        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
      >
        Year-to-date
      </NavLink>
      <NavLink
        to="/reports/monthly"
        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
      >
        Monthly report
      </NavLink>
    </nav>
  )
}
