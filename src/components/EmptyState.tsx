import type { ReactNode } from 'react'

import AppIcon, { type AppIconName } from './AppIcon'
import Button from './ui/Button'
import { emptyStateClass, emptyStateIconClass } from './ui/displayStyles'
import { cn } from '../utils/cn'

interface EmptyStateProps {
  icon: AppIconName
  message: ReactNode
  /** Optional call to action, e.g. the same "add" form the page's speed dial opens. */
  action?: { label: string; onClick: () => void }
  className?: string
}

export default function EmptyState({ icon, message, action, className }: EmptyStateProps) {
  return (
    <div className={cn(emptyStateClass, className)}>
      <div className={emptyStateIconClass}>
        <AppIcon name={icon} />
      </div>
      <p>{message}</p>
      {action ? (
        <div className="mt-3">
          <Button type="button" variant="primary" size="sm" onClick={() => action.onClick()}>
            <AppIcon name="add" size={16} strokeWidth={2} />
            {action.label}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
