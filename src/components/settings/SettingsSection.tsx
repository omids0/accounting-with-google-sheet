import type { ReactNode } from 'react'

import {
  settingsSectionClass,
  settingsSectionItemsClass,
  settingsSectionTitleClass
} from '../ui/settingsStyles'

interface SettingsSectionProps {
  title: string
  children: ReactNode
}

export default function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <section className={settingsSectionClass}>
      <h2 className={settingsSectionTitleClass}>{title}</h2>
      <div className={settingsSectionItemsClass}>{children}</div>
    </section>
  )
}
