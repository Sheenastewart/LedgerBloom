import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import '../features/auth/auth.css'

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

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
          {user ? (
            <>
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
                to="/income"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                Income
              </NavLink>
              <NavLink
                to="/reports"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                Reports
              </NavLink>
            </>
          ) : null}
          <NavLink
            to="/help"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Help
          </NavLink>
        </nav>
        {user ? (
          <div className="user-menu">
            <span className="user-menu-name">{user.displayName}</span>
            <button type="button" className="button button-secondary" onClick={() => void handleLogout()}>
              Log out
            </button>
          </div>
        ) : (
          <div className="user-menu">
            <NavLink to="/login" className="button button-secondary">
              Log in
            </NavLink>
            <NavLink to="/register" className="button button-primary">
              Sign up
            </NavLink>
          </div>
        )}
      </header>
      <Outlet />
    </div>
  )
}
