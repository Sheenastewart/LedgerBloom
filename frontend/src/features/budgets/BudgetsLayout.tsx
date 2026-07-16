import { Outlet } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { SectionTabs } from '../../components/SectionTabs'
import { paths } from '../../routes/paths'
import '../../components/sectionNav.css'

const TABS = [
  { to: paths.budgetsMonthly, label: 'Monthly Budget', end: true },
  { to: paths.budgetsCategories, label: 'Budget Categories', end: true },
]

export function BudgetsLayout() {
  return (
    <div className="section-shell">
      <div className="hub-header">
        <PageHeader
          title="Budgets"
          description="Create monthly budgets and monitor planned versus actual spending."
        />
      </div>
      <SectionTabs ariaLabel="Budgets sections" tabs={TABS} />
      <Outlet />
    </div>
  )
}
