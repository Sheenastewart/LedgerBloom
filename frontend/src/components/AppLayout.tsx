import { NavLink, Outlet } from 'react-router-dom'

export function AppLayout() {
  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand-link">
          LedgerBloom
        </NavLink>
        <nav className="site-nav" aria-label="Primary">
          <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} end>
            Home
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/budgets"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Budgets
          </NavLink>
          <NavLink
            to="/categories"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Categories
          </NavLink>
          <NavLink
            to="/expenses"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Expenses
          </NavLink>
          <NavLink
            to="/recurring"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Recurring
          </NavLink>
          <NavLink
            to="/recurring-income"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Recurring Income
          </NavLink>
          <NavLink
            to="/income"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Income
          </NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  )
}
