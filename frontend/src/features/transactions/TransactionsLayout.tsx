import { Outlet } from 'react-router-dom'
import { SectionTabs } from '../../components/SectionTabs'
import { paths } from '../../routes/paths'
import '../../components/sectionNav.css'

const TABS = [
  { to: paths.transactionsExpenses, label: 'Expenses' },
  { to: paths.transactionsIncome, label: 'Income' },
  { to: paths.transactionsRecurringExpenses, label: 'Recurring Expenses' },
  { to: paths.transactionsRecurringIncome, label: 'Recurring Income' },
  { to: paths.transactionsCategories, label: 'Categories' },
]

export function TransactionsLayout() {
  return (
    <div className="section-shell">
      <SectionTabs ariaLabel="Transactions sections" tabs={TABS} />
      <Outlet />
    </div>
  )
}
