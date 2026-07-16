import { Navigate, useLocation } from 'react-router-dom'
import { paths } from '../../../routes/paths'

/** Legacy list URL — recurring bills now live on the Expenses page. */
export function RecurringPage() {
  const location = useLocation()
  return <Navigate to={paths.transactionsExpenses} replace state={location.state} />
}
