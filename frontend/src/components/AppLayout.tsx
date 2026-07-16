import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import { paths } from '../routes/paths'
import { FloatingAddButton } from './FloatingAddButton'
import { GlobalSearch } from './GlobalSearch'
import { Button } from './ui/Button'
import '../features/auth/auth.css'

export function AppLayout() {
  const { user, logout, loading } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate(paths.home)
  }

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to={user ? paths.dashboard : paths.home} className="brand-link">
          LedgerBloom
        </NavLink>
        <nav className="site-nav" aria-label="Primary">
          {!loading && !user ? (
            <NavLink
              to={paths.home}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              end
            >
              Home
            </NavLink>
          ) : null}
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
              <NavLink
                to={paths.settings}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                Settings
              </NavLink>
            </>
          ) : null}
        </nav>
        {user ? (
          <div className="user-menu">
            <GlobalSearch />
            <span className="user-menu-name">{user.displayName}</span>
            <Button variant="secondary" type="button" onClick={() => void handleLogout()}>
              Log out
            </Button>
          </div>
        ) : (
          <div className="user-menu">
            <Button variant="secondary" to={paths.login}>
              Log in
            </Button>
            <Button variant="primary" to={paths.register}>
              Sign up
            </Button>
          </div>
        )}
      </header>
      <Outlet />
      {user ? <FloatingAddButton /> : null}
    </div>
  )
}
