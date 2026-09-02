import { useCallback, useState } from 'react'

import { AccordionCollapse } from '../AccordionCollapse'
import AppIcon from '../AppIcon'
import type { AboutFeature, AboutFeatureGroup } from './types'

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
    <li className="about-feature-item">
      <button
        type="button"
        className={`about-feature-trigger${expanded ? ' about-feature-trigger--expanded' : ''}`}
        onClick={toggle}
        aria-expanded={expanded}
      >
        <span className="about-feature-title">{feature.title}</span>
        <span className="about-feature-chevron" aria-hidden="true">
          <AppIcon name="chevron-down" size={14} strokeWidth={2} />
        </span>
      </button>
      <AccordionCollapse open={expanded}>
        <p className="about-feature-description">{feature.description}</p>
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
    <section className={`about-section card${expanded ? ' about-section--expanded' : ''}`}>
      <button
        type="button"
        className="about-section-trigger"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`about-panel-${group.id}`}
      >
        <span className="about-section-icon" aria-hidden="true">
          <AppIcon name={group.icon} size={22} strokeWidth={1.75} />
        </span>
        <span className="about-section-text">
          <span id={`about-${group.id}`} className="about-section-title">
            {group.title}
          </span>
          <span className="about-section-summary">{group.summary}</span>
        </span>
        <span className="about-section-chevron" aria-hidden="true">
          <AppIcon name="chevron-down" size={16} strokeWidth={2} />
        </span>
      </button>

      <AccordionCollapse open={expanded}>
        <ul
          id={`about-panel-${group.id}`}
          className="about-feature-list"
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
