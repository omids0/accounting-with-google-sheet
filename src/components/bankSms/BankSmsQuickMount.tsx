import { lazy, Suspense } from 'react'

import { useSmsQuickStore } from '../../stores/smsQuickStore'

/** Loaded only when a notification asks for it, so the main bundle barely grows. */
const BankSmsQuickSheet = lazy(() => import('./BankSmsQuickSheet'))

/** Mounted once by `Layout`: the notification's «ثبت سریع» opens one SMS in a sheet. */
export default function BankSmsQuickMount() {
  const id = useSmsQuickStore(state => state.id)

  return id ? (
    <Suspense fallback={null}>
      <BankSmsQuickSheet key={id} id={id} />
    </Suspense>
  ) : null
}
