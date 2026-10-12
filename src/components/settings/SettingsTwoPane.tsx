import { useId, useState, type ReactNode } from 'react'

import AppIcon, { type AppIconName } from '../AppIcon'
import { cardClassName } from '../ui/Card'
import {
  settingsPaneContentClass,
  settingsPaneItemsClass,
  settingsPaneNavClass,
  settingsPaneNavItemClass,
  settingsPaneTitleClass,
  settingsSectionIconClass,
  settingsTwoPaneClass
} from '../ui/settingsStyles'

export interface SettingsSectionConfig {
  id: string
  title: string
  description: string
  icon: AppIconName
  content: ReactNode
}

/** Desktop settings: the section list on the right, the chosen section's cards on the left. */
export default function SettingsTwoPane({ sections }: { sections: SettingsSectionConfig[] }) {
  const [selectedId, setSelectedId] = useState(sections[0]?.id)
  const titleId = useId()
  const current = sections.find(section => section.id === selectedId) ?? sections[0]

  if (!current) return null

  return (
    <div className={settingsTwoPaneClass}>
      <nav className={settingsPaneNavClass} aria-label="بخش‌های تنظیمات">
        {sections.map(section => {
          const active = section.id === current.id

          return (
            <button
              key={section.id}
              type="button"
              className={settingsPaneNavItemClass(active)}
              aria-current={active ? 'true' : undefined}
              onClick={() => setSelectedId(section.id)}
            >
              <span className={settingsSectionIconClass(active)} aria-hidden="true">
                <AppIcon name={section.icon} size={18} />
              </span>
              {section.title}
            </button>
          )
        })}
      </nav>
      <section className={cardClassName(settingsPaneContentClass)} aria-labelledby={titleId}>
        <h2 id={titleId} className={settingsPaneTitleClass}>
          {current.title}
          <small>{current.description}</small>
        </h2>
        <div className={settingsPaneItemsClass}>{current.content}</div>
      </section>
    </div>
  )
}
