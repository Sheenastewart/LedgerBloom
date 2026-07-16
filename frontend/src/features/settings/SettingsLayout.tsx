import { Outlet } from 'react-router-dom'
import { SectionTabs } from '../../components/SectionTabs'
import { paths } from '../../routes/paths'
import '../../components/sectionNav.css'

const TABS = [
  { to: paths.settingsAccount, label: 'Account' },
  { to: paths.settingsHelp, label: 'Help Center' },
  { to: paths.settingsSecurity, label: 'Security' },
  { to: paths.settingsPreferences, label: 'Preferences' },
  { to: paths.settingsAbout, label: 'About' },
]

export function SettingsLayout() {
  return (
    <div className="section-shell">
      <SectionTabs ariaLabel="Settings sections" tabs={TABS} />
      <Outlet />
    </div>
  )
}
