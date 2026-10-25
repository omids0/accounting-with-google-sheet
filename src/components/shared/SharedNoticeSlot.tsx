import { lazy, Suspense } from 'react'

import { hasSharedAccount } from '../../services/workspace'

/** Loads only on a device with a shared account: everyone else never downloads it. */
const SharedNoticeBanner = lazy(() => import('./SharedNoticeBanner'))

/** Where change notices show (see `SharedNoticeBanner`); nothing at all without a shared account. */
export default function SharedNoticeSlot(props: { recordRef?: string; onApplied?: () => void }) {
  if (!hasSharedAccount()) return null

  return (
    <Suspense fallback={null}>
      <SharedNoticeBanner {...props} />
    </Suspense>
  )
}
