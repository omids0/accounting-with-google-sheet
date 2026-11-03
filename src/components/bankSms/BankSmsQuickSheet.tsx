import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import BankSmsEntryCard from './BankSmsEntryCard'
import { useBankSmsReview } from './useBankSmsReview'
import { getPathForTab } from '../../routes/paths'
import { getBankSmsPrefs } from '../../services/bankSmsPrefs'
import { smsRangeStart } from '../../services/bankSmsRange'
import { quickSmsState } from '../../services/launchActionSmsQuick'
import { useSmsQuickStore } from '../../stores/smsQuickStore'
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
  const { pathname } = useLocation()
  const openPath = useRef(pathname)
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
      close()
      navigate(getPathForTab('bank-sms'))
    }
  }, [view.state, close, navigate])

  // Saved, dismissed or recorded elsewhere. A «نادیده» waits out its undo toast first: closing the
  // sheet now would write it at once and take the toast's «بازگردانی» away.
  useEffect(() => {
    if (view.state === 'done' && !dismissing) close()
  }, [view.state, dismissing, close])

  // «ثبت دستی» and the other redirects to the full form leave this page.
  useEffect(() => {
    if (pathname !== openPath.current) close()
  }, [pathname, close])

  return (
    <PickerSheet
      open={view.state === 'show' || view.state === 'wait'}
      title="ثبت سریع پیامک بانکی"
      onClose={() => {
        if (review.busyKey === null) close()
      }}
    >
      {view.state === 'show' && <BankSmsEntryCard item={view.item} review={review} />}
      {view.state === 'wait' && (
        <div className="flex items-center justify-center gap-3 py-8 text-sm text-muted">
          <Spinner size="sm" decorative />
          <span role="status">در حال آماده‌سازی پیامک…</span>
        </div>
      )}
    </PickerSheet>
  )
}
