import { Outlet } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { SectionTabs } from '../../components/SectionTabs'
import { paths } from '../../routes/paths'
import '../../components/sectionNav.css'

const TABS = [
  { to: paths.transactionsAll, label: 'All' },
  { to: paths.transactionsExpenses, label: 'Expenses' },
  { to: paths.transactionsIncome, label: 'Income' },
]

export function TransactionsLayout() {
  return (
    <div className="section-shell">
      <div className="hub-header">
        <PageHeader
          title="Transactions"
          description="Review activity and manage expenses and income in one place."
        />
      </div>
      <SectionTabs ariaLabel="Transactions sections" tabs={TABS} />
      <Outlet />
    </div>
  )
}
