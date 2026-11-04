import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import BankSmsEntryCard from './BankSmsEntryCard'
import { useBankSmsReview } from './useBankSmsReview'
import { getPathForTab } from '../../routes/paths'
import { getBankSmsPrefs } from '../../services/bankSmsPrefs'
import { smsRangeStart } from '../../services/bankSmsRange'
import { quickSmsState } from '../../services/launchActionSmsQuick'
import { useSmsQuickStore } from '../../stores/smsQuickStore'
import { showInfo } from '../../utils/toast'
import PickerSheet from '../form/PickerSheet'
import Spinner from '../ui/Spinner'

/** The queue or the accounts never arrived (offline, signed out): give up and open the page. */
const GIVE_UP_MS = 8000

/**
 * One pending SMS as the review page's own card, over whatever page the user was on. Everything
 * (category, extra fields, save, «⋯», the redirects to the full form) is `BankSmsEntryCard`; this
 * only finds the card, and closes the sheet once the SMS has left the list.
 */
export default function BankSmsQuickSheet({ id }: { id: string }) {
  const close = useSmsQuickStore(state => state.close)
  const navigate = useNavigate()
  const { key: locationKey } = useLocation()
  const openKey = useRef(locationKey)
  // Same range as the notification counted (the page's «بازه»).
  const sinceMs = useMemo(() => smsRangeStart(getBankSmsPrefs().viewDays), [])
  const review = useBankSmsReview(sinceMs)
  const { loading: templatesLoading } = review.templatesApi
  const [sawLoading, setSawLoading] = useState(false)
  const [gaveUp, setGaveUp] = useState(false)
  const [wasShown, setWasShown] = useState(false)

  useEffect(() => {
    if (review.loading) setSawLoading(true)
  }, [review.loading])

  useEffect(() => {
    const timer = window.setTimeout(() => setGaveUp(true), GIVE_UP_MS)

    return () => window.clearTimeout(timer)
  }, [])

  // The queue was read (a first read has started and ended), with its templates, and the accounts
  // were read once: a user with no wallet account has none, and must not wait for the give-up.
  const settled =
    gaveUp || (sawLoading && !review.loading && !templatesLoading && review.accountsLoaded)
  const view = quickSmsState({ id, items: review.items, settled, wasShown })
  const { dismissing } = review

  useEffect(() => {
    if (view.state === 'show') setWasShown(true)
  }, [view.state])

  useEffect(() => {
    if (view.state === 'fallback') {
      // The queue was read and the SMS is not in it (another book): say why the page opens. A queue
      // that never arrived (offline) is not «not in this book».
      if (sawLoading && !review.loading && review.accountsLoaded)
        showInfo(
          review.items.some(item => item.key === id)
            ? 'این پیامک را باید خودتان بررسی کنید'
            : 'این پیامک در این دفتر نیست'
        )
      close()
      navigate(getPathForTab('bank-sms'))
    }
  }, [
    view.state,
    close,
    navigate,
    sawLoading,
    review.loading,
    review.accountsLoaded,
    review.items,
    id
  ])

  // Saved, dismissed or recorded elsewhere. A «نادیده» waits out its undo toast first: closing the
  // sheet now would write it at once and take the toast's «بازگردانی» away.
  useEffect(() => {
    if (view.state === 'done' && !dismissing) close()
  }, [view.state, dismissing, close])

  // «ثبت دستی» and the other redirects to the full form leave this page. The location key, not the
  // path: a redirect to the page the sheet is already over (a form opened from /entry, a duplicate
  // sent to /bank-sms) lands on the same path but is still a navigation, and the sheet must go.
  useEffect(() => {
    if (locationKey !== openKey.current) close()
  }, [locationKey, close])

  return (
    <PickerSheet
      open={view.state === 'show' || view.state === 'wait'}
      title="ثبت سریع پیامک بانکی"
      // dvh follows the keyboard where the browser resizes the page for it.
      panelClassName="max-h-[min(90dvh,680px)]"
      onClose={() => {
        if (review.busyKey === null) close()
      }}
    >
      {view.state === 'show' && (
        // The card's swipe row clips (overflow-hidden), so as a bare flex child it shrank to the
        // sheet's height and its buttons could not be scrolled to; shrink-0 lets the body scroll.
        <div className="shrink-0">
          <BankSmsEntryCard item={view.item} review={review} swipeable={false} />
        </div>
      )}
      {view.state === 'wait' && (
        <div className="flex items-center justify-center gap-3 py-8 text-sm text-muted">
          <Spinner size="sm" decorative />
          <span role="status">در حال آماده‌سازی پیامک…</span>
        </div>
      )}
    </PickerSheet>
  )
}
