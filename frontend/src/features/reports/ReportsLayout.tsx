import { Outlet } from 'react-router-dom'
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
      <SectionTabs ariaLabel="Reports sections" tabs={TABS} />
      <Outlet />
    </div>
  )
}
