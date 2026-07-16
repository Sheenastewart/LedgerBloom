import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import { paths } from '../routes/paths'
import '../features/auth/auth.css'

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate(paths.home)
  }

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to={paths.home} className="brand-link">
          LedgerBloom
        </NavLink>
        <nav className="site-nav" aria-label="Primary">
          <NavLink
            to={paths.home}
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            end
          >
            Home
          </NavLink>
          {user ? (
            <>
              <NavLink
                to={paths.dashboard}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                Dashboard
              </NavLink>
              <NavLink
                to={paths.transactions}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                Transactions
              </NavLink>
              <NavLink
                to={paths.budgets}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                Budgets
              </NavLink>
              <NavLink
                to={paths.reports}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                Reports
              </NavLink>
            </>
          ) : null}
          <NavLink
            to={paths.settings}
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Settings
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
            <NavLink to={paths.login} className="button button-secondary">
              Log in
            </NavLink>
            <NavLink to={paths.register} className="button button-primary">
              Sign up
            </NavLink>
          </div>
        )}
      </header>
      <Outlet />
    </div>
  )
}
