import { Outlet } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { SectionTabs } from '../../components/SectionTabs'
import { paths } from '../../routes/paths'
import '../../components/sectionNav.css'
import './settings.css'

const TABS = [
  { to: paths.settingsAccount, label: 'Account' },
  { to: paths.settingsHelp, label: 'Help Center' },
  { to: paths.settingsSecurity, label: 'Security' },
  { to: paths.settingsPreferences, label: 'Preferences' },
  { to: paths.settingsAbout, label: 'About LedgerBloom' },
]

export function SettingsLayout() {
  return (
    <div className="section-shell">
      <div className="hub-header">
        <PageHeader
          title="Settings"
          description="Manage your account, security, preferences, and help resources."
        />
      </div>
      <SectionTabs ariaLabel="Settings sections" tabs={TABS} />
      <Outlet />
    </div>
  )
}
