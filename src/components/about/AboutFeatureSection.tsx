import { useCallback, useState } from 'react'

import { AccordionCollapse } from '../AccordionCollapse'
import AppIcon from '../AppIcon'
import type { AboutFeature, AboutFeatureGroup } from './types'
import {
  aboutFeatureChevronClass,
  aboutFeatureDescriptionClass,
  aboutFeatureItemClass,
  aboutFeatureListClass,
  aboutFeatureTitleClass,
  aboutFeatureTriggerClass,
  aboutSectionChevronClass,
  aboutSectionClass,
  aboutSectionIconClass,
  aboutSectionSummaryClass,
  aboutSectionTextClass,
  aboutSectionTitleClass,
  aboutSectionTriggerClass
} from '../ui/aboutStyles'
import { cardClassName } from '../ui/Card'

interface AboutFeatureSectionProps {
  group: AboutFeatureGroup
  expanded: boolean
  onToggle: () => void
}

function AboutFeatureItem({ feature }: { feature: AboutFeature }) {
  const [expanded, setExpanded] = useState(false)

  const toggle = useCallback(() => {
    setExpanded(value => !value)
  }, [])

  return (
    <li className={aboutFeatureItemClass}>
      <button
        type="button"
        className={aboutFeatureTriggerClass(expanded)}
        onClick={toggle}
        aria-expanded={expanded}
      >
        <span className={aboutFeatureTitleClass}>{feature.title}</span>
        <span className={aboutFeatureChevronClass(expanded)} aria-hidden="true">
          <AppIcon name="chevron-down" size={14} strokeWidth={2} />
        </span>
      </button>
      <AccordionCollapse open={expanded}>
        <p className={aboutFeatureDescriptionClass}>{feature.description}</p>
      </AccordionCollapse>
    </li>
  )
}

export default function AboutFeatureSection({
  group,
  expanded,
  onToggle
}: AboutFeatureSectionProps) {
  return (
    <section className={cardClassName(aboutSectionClass(expanded))}>
      <button
        type="button"
        className={aboutSectionTriggerClass}
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`about-panel-${group.id}`}
      >
        <span className={aboutSectionIconClass} aria-hidden="true">
          <AppIcon name={group.icon} size={22} strokeWidth={1.75} />
        </span>
        <span className={aboutSectionTextClass}>
          <span id={`about-${group.id}`} className={aboutSectionTitleClass}>
            {group.title}
          </span>
          <span className={aboutSectionSummaryClass}>{group.summary}</span>
        </span>
        <span className={aboutSectionChevronClass(expanded)} aria-hidden="true">
          <AppIcon name="chevron-down" size={16} strokeWidth={2} />
        </span>
      </button>

      <AccordionCollapse open={expanded}>
        <ul
          id={`about-panel-${group.id}`}
          className={aboutFeatureListClass}
          aria-labelledby={`about-${group.id}`}
        >
          {group.features.map(feature => (
            <AboutFeatureItem key={feature.title} feature={feature} />
          ))}
        </ul>
      </AccordionCollapse>
    </section>
  )
}
