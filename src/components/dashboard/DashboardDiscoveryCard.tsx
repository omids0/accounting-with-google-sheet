import { useEffect, useState } from 'react'

import {
  dismissDiscovery,
  getDiscoveryIndex,
  getDiscoveryQueue,
  setDiscoveryIndex
} from '../../services/featureDiscovery'
import { useNavigationStore } from '../../stores/navigationStore'
import { cn } from '../../utils/cn'
import AppIcon from '../AppIcon'
import Button from '../ui/Button'
import Card from '../ui/Card'
import {
  discoveryActionsClass,
  discoveryCardClass,
  discoveryCountClass,
  discoveryHeadClass,
  guideCardHintClass,
  guideCardTitleClass,
  onboardingLinkButtonClass
} from '../ui/onboardingStyles'

/** «می‌دانستی؟»: one not-yet-used feature per dashboard visit. */
export default function DashboardDiscoveryCard({ spreadsheetId }: { spreadsheetId: string }) {
  const queue = getDiscoveryQueue(spreadsheetId)
  const [index, setIndex] = useState(() => getDiscoveryIndex(spreadsheetId))
  const [dismissed, setDismissed] = useState(false)

  // The next visit starts from the following feature.
  useEffect(() => {
    setDiscoveryIndex(spreadsheetId, getDiscoveryIndex(spreadsheetId) + 1)
  }, [spreadsheetId])

  if (dismissed || !queue.length) return null

  const position = index % queue.length
  const feature = queue[position]

  const showNext = () => {
    const next = index + 1

    setIndex(next)
    setDiscoveryIndex(spreadsheetId, next + 1)
  }

  const dismiss = () => {
    dismissDiscovery(spreadsheetId)
    setDismissed(true)
  }

  return (
    <Card className={discoveryCardClass} aria-label="معرفی امکانات">
      <div className={discoveryHeadClass}>
        <span className={cn(guideCardTitleClass, 'inline-flex items-center gap-1.5')}>
          <AppIcon name="info" size={16} />
          می‌دانستی؟
        </span>
        <span className={discoveryCountClass}>
          {`${(position + 1).toLocaleString('fa-IR')} از ${queue.length.toLocaleString('fa-IR')}`}
        </span>
      </div>
      <p className={guideCardHintClass}>
        <strong className="block text-text">{feature.title}</strong>
        {feature.pitch}
      </p>
      <div className={discoveryActionsClass}>
        <Button
          type="button"
          size="sm"
          onClick={() => useNavigationStore.getState().onTabChange(feature.tab)}
        >
          برو ببین
        </Button>
        {queue.length > 1 && (
          <Button type="button" size="sm" variant="secondary" onClick={showNext}>
            بعدی
          </Button>
        )}
        <button type="button" className={onboardingLinkButtonClass} onClick={dismiss}>
          دیگر نشان نده
        </button>
      </div>
    </Card>
  )
}
