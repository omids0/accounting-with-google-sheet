import { useId, useState, type ReactNode } from 'react'

import { AccordionCollapse } from '../AccordionCollapse'
import AppIcon, { type AppIconName } from '../AppIcon'
import {
  accordionCardChevronClass,
  accordionCardSummaryClass,
  accordionCardTextClass,
  accordionCardTitleClass,
  accordionCardTriggerClass
} from '../ui/accordionCardStyles'
import { cardClassName } from '../ui/Card'
import {
  settingsSectionCardClass,
  settingsSectionClass,
  settingsSectionIconClass,
  settingsSectionItemsClass
} from '../ui/settingsStyles'

interface SettingsSectionProps {
  title: string
  /** One line telling the user what is inside. */
  description: string
  icon: AppIconName
  defaultExpanded?: boolean
  children: ReactNode
}

export default function SettingsSection({
  title,
  description,
  icon,
  defaultExpanded = false,
  children
}: SettingsSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const panelId = useId()

  return (
    <section className={settingsSectionClass}>
      <h2 className={cardClassName(settingsSectionCardClass(expanded))}>
        <button
          type="button"
          className={accordionCardTriggerClass}
          onClick={() => setExpanded(value => !value)}
          aria-expanded={expanded}
          aria-controls={panelId}
        >
          <span className={settingsSectionIconClass(expanded)} aria-hidden="true">
            <AppIcon name={icon} size={20} strokeWidth={1.9} />
          </span>
          <span className={accordionCardTextClass}>
            <span className={accordionCardTitleClass}>{title}</span>
            <span className={accordionCardSummaryClass}>{description}</span>
          </span>
          <span className={accordionCardChevronClass(expanded)} aria-hidden="true">
            <AppIcon name="chevron-down" size={16} strokeWidth={2} />
          </span>
        </button>
      </h2>
      <AccordionCollapse open={expanded}>
        <div id={panelId} className={settingsSectionItemsClass}>
          {children}
        </div>
      </AccordionCollapse>
    </section>
  )
}
