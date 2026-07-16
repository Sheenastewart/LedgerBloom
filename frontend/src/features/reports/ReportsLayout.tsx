import { Outlet } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { SectionTabs } from '../../components/SectionTabs'
import { paths } from '../../routes/paths'
import '../../components/sectionNav.css'

const TABS = [
  { to: paths.reportsMonthly, label: 'Monthly Report' },
  { to: paths.reportsTrends, label: 'Trends' },
  { to: paths.reportsYtd, label: 'Year-to-Date' },
  { to: paths.reportsCashFlow, label: 'Cash Flow' },
  { to: paths.reportsExports, label: 'Exports' },
]

export function ReportsLayout() {
  return (
    <div className="section-shell">
      <div className="hub-header">
        <PageHeader
          title="Reports"
          description="Review financial trends, monthly summaries, and exports."
        />
      </div>
      <SectionTabs ariaLabel="Reports sections" tabs={TABS} />
      <Outlet />
    </div>
  )
}
