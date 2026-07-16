import { Navigate, useLocation } from 'react-router-dom'

/**
 * Legacy route: recurring income lives under the Income area.
 */
export function RecurringIncomePage() {
  const location = useLocation()
  const successMessage = (location.state as { successMessage?: string } | null)?.successMessage
  return (
    <Navigate
      to="/income?section=recurring"
      replace
      state={successMessage ? { successMessage } : null}
    />
  )
}
