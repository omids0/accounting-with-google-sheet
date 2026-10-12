import { useEffect, useState } from 'react'

import {
  dismissDiscovery,
  getDiscoveryIndex,
  getDiscoveryQueue,
  setDiscoveryIndex
} from '../../services/featureDiscovery'
import { useNavigationStore } from '../../stores/navigationStore'
import AppIcon from '../AppIcon'
import Button from '../ui/Button'
import {
  discoveryRowClass,
  discoveryRowCloseClass,
  discoveryRowTextClass
} from '../ui/dashboardCalmStyles'

/** «می‌دانستی؟» as a single row: one not-yet-used feature per dashboard visit. */
export default function DashboardDiscoveryCard({ spreadsheetId }: { spreadsheetId: string }) {
  const queue = getDiscoveryQueue(spreadsheetId)
  const [index] = useState(() => getDiscoveryIndex(spreadsheetId))
  const [dismissed, setDismissed] = useState(false)

  // The next visit starts from the following feature.
  useEffect(() => {
    setDiscoveryIndex(spreadsheetId, getDiscoveryIndex(spreadsheetId) + 1)
  }, [spreadsheetId])

  if (dismissed || !queue.length) return null

  const feature = queue[index % queue.length]

  const dismiss = () => {
    dismissDiscovery(spreadsheetId)
    setDismissed(true)
  }

  return (
    <aside className={discoveryRowClass} aria-label="معرفی امکانات">
      <AppIcon name="info" size={16} />
      <span className={discoveryRowTextClass} title={feature.pitch}>
        <strong className="font-semibold">می‌دانستی؟ </strong>
        {feature.title}
      </span>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => useNavigationStore.getState().onTabChange(feature.tab)}
      >
        برو ببین
      </Button>
      <button
        type="button"
        className={discoveryRowCloseClass}
        onClick={dismiss}
        aria-label="دیگر نشان نده"
        title="دیگر نشان نده"
      >
        <AppIcon name="close" size={16} />
      </button>
    </aside>
  )
}
