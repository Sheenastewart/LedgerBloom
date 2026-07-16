import { Navigate, useLocation } from 'react-router-dom'
import { paths } from '../../../routes/paths'

/** Legacy list URL — recurring income now lives on the Income page. */
export function RecurringIncomePage() {
  const location = useLocation()
  return <Navigate to={paths.transactionsIncome} replace state={location.state} />
}
