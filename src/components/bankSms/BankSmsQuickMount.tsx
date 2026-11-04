import { lazy, Suspense, useEffect } from 'react'
import { useLocation } from 'react-router'

import { getPathForTab } from '../../routes/paths'
import { useSmsQuickStore } from '../../stores/smsQuickStore'

/** Loaded only when a notification asks for it, so the main bundle barely grows. */
const BankSmsQuickSheet = lazy(() => import('./BankSmsQuickSheet'))

/** Mounted once by `Layout`: the notification's «ثبت سریع» opens one SMS in a sheet. */
export default function BankSmsQuickMount() {
  const id = useSmsQuickStore(state => state.id)
  const close = useSmsQuickStore(state => state.close)
  const { pathname } = useLocation()
  // The review page already lists this card: no sheet over the very page it would lead to.
  const onReviewPage = pathname === getPathForTab('bank-sms')

  useEffect(() => {
    if (id && onReviewPage) close()
  }, [id, onReviewPage, close])

  return id && !onReviewPage ? (
    <Suspense fallback={null}>
      <BankSmsQuickSheet key={id} id={id} />
    </Suspense>
  ) : null
}
