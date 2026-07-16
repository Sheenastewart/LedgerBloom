import { useLocation } from 'react-router-dom'
import { RecurringIncomePanel } from '../components/RecurringIncomePanel'

type LocationSuccessState = {
  successMessage?: string
}

/**
 * Recurring income schedules under Transactions.
 */
export function RecurringIncomePage() {
  const location = useLocation()
  const successMessage = (location.state as LocationSuccessState | null)?.successMessage ?? null

  return <RecurringIncomePanel successMessage={successMessage} />
}
