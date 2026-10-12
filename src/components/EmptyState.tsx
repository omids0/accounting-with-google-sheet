import type { ReactNode } from 'react'

import AppIcon, { type AppIconName } from './AppIcon'
import Button from './ui/Button'
import {
  emptyStateClass,
  emptyStateDescriptionClass,
  emptyStateIconClass
} from './ui/displayStyles'
import { cn } from '../utils/cn'

interface EmptyStateProps {
  icon: AppIconName
  message: ReactNode
  /** What the page is for; shown only while it is empty, to orient new users. */
  description?: ReactNode
  /** Optional call to action, e.g. the same "add" form the page's speed dial opens. */
  action?: { label: string; onClick: () => void }
  /** Lighter alternative shown before the main action, e.g. widening a filter. */
  secondaryAction?: { label: string; onClick: () => void }
  className?: string
}

export default function EmptyState({
  icon,
  message,
  description,
  action,
  secondaryAction,
  className
}: EmptyStateProps) {
  return (
    <div className={cn(emptyStateClass, className)}>
      <div className={emptyStateIconClass}>
        <AppIcon name={icon} />
      </div>
      {description ? <p className={emptyStateDescriptionClass}>{description}</p> : null}
      <p>{message}</p>
      {action || secondaryAction ? (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {secondaryAction ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => secondaryAction.onClick()}
            >
              {secondaryAction.label}
            </Button>
          ) : null}
          {action ? (
            <Button type="button" variant="primary" size="sm" onClick={() => action.onClick()}>
              <AppIcon name="add" size={16} />
              {action.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
