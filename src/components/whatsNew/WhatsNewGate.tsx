import { lazy, Suspense, useCallback, useEffect, useState } from 'react'

import { useUserBusy } from '../../hooks/useUserBusy'
import { claimWhatsNew, closeWhatsNew } from '../../services/whatsNew'

const WhatsNewSheet = lazy(() => import('./WhatsNewSheet'))

/** Lets the first screen settle before the sheet slides in. */
const SHOW_DELAY_MS = 1200

/**
 * «چه خبر؟» once after an update, web and APK alike. Mounted in the app shell, so
 * it only runs once the app is ready and past the wizard; it waits while a modal,
 * sheet or unsaved form is open.
 */
export default function WhatsNewGate() {
  const [lastSeen, setLastSeen] = useState(claimWhatsNew)
  const [open, setOpen] = useState(false)
  const busy = useUserBusy()

  useEffect(() => {
    if (!lastSeen || busy || open) return

    const timer = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [lastSeen, busy, open])

  const done = useCallback(() => {
    closeWhatsNew()
    setLastSeen(null)
    setOpen(false)
  }, [])

  if (!lastSeen || !open) return null

  return (
    <Suspense fallback={null}>
      <WhatsNewSheet lastSeen={lastSeen} onDone={done} />
    </Suspense>
  )
}
