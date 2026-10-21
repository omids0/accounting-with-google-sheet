import { useId, type ReactNode } from 'react'

import { cn } from '../utils/cn'
import {
  calmBlockBadgeClass,
  calmBlockClass,
  calmBlockHeadClass,
  calmBlockLinkClass,
  calmBlockTitleClass
} from './ui/calmListStyles'

export interface CalmBlockAction {
  label: string
  onClick: () => void
}

export interface CalmBlockProps {
  title: string
  /** Short note after the title, e.g. «· ۱ معوق». */
  badge?: ReactNode
  /** The «همه ←» style link on the end of the header row. */
  action?: CalmBlockAction
  /** Controls on their own row under the header (toggles, pickers). */
  toolbar?: ReactNode
  className?: string
  children: ReactNode
}

/**
 * A flat dashboard/charts section: title, optional link, then its rows. Self-
 * contained so a grid layout can place each block on its own.
 */
export default function CalmBlock({
  title,
  badge,
  action,
  toolbar,
  className,
  children
}: CalmBlockProps) {
  const titleId = useId()

  return (
    <section className={cn(calmBlockClass, className)} aria-labelledby={titleId}>
      <div className={calmBlockHeadClass}>
        <h2 id={titleId} className={calmBlockTitleClass}>
          {title}
          {badge ? <span className={calmBlockBadgeClass}>{badge}</span> : null}
        </h2>
        {action ? (
          <button type="button" className={calmBlockLinkClass} onClick={action.onClick}>
            {action.label}
          </button>
        ) : null}
      </div>
      {toolbar}
      {children}
    </section>
  )
}
