import { useState, type ReactNode } from 'react'

import { AccordionCollapse } from '../AccordionCollapse'
import AppIcon from '../AppIcon'
import {
  settingsSectionChevronClass,
  settingsSectionClass,
  settingsSectionItemsClass,
  settingsSectionTitleClass,
  settingsSectionTriggerClass
} from '../ui/settingsStyles'

interface SettingsSectionProps {
  title: string
  defaultExpanded?: boolean
  children: ReactNode
}

export default function SettingsSection({
  title,
  defaultExpanded = false,
  children
}: SettingsSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <section className={settingsSectionClass}>
      <button
        type="button"
        className={settingsSectionTriggerClass(expanded)}
        onClick={() => setExpanded(value => !value)}
        aria-expanded={expanded}
      >
        <h2 className={settingsSectionTitleClass}>{title}</h2>
        <span className={settingsSectionChevronClass(expanded)} aria-hidden="true">
          <AppIcon name="chevron-down" size={16} strokeWidth={2} />
        </span>
      </button>
      <AccordionCollapse open={expanded}>
        <div className={settingsSectionItemsClass}>{children}</div>
      </AccordionCollapse>
    </section>
  )
}
