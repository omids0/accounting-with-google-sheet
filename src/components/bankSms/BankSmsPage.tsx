import { lazy, Suspense } from 'react'
import { useLocation } from 'react-router'

import BankSmsReview from './BankSmsReview'
import BankSmsSharedText from './BankSmsSharedText'
import { useIsBuildingWorkspace } from '../../hooks/useWorkspaceType'
import { isBankSmsAvailable } from '../../services/bankSmsNative'
import { readSharedSmsText } from '../../services/launchAction'
import { isConfigured } from '../../services/settings'
import EmptyState from '../EmptyState'

/** Inside a building the queue also matches deposits to units (round 11); that code loads there only. */
const BuildingBankSmsReview = lazy(() => import('./BuildingBankSmsReview'))

/** «پیامک‌های بانکی»: review queue for income/expense captured from bank SMS. */
export default function BankSmsPage() {
  const sharedText = readSharedSmsText(useLocation().state)
  const isBuilding = useIsBuildingWorkspace()

  if (!isConfigured()) return <EmptyState icon="empty-inbox" message="ابتدا با گوگل وارد شوید" />

  // Shared from another app (web share target): works without SMS capture, so on iOS too.
  if (sharedText) return <BankSmsSharedText key={sharedText} text={sharedText} />

  if (!isBankSmsAvailable()) {
    return (
      <EmptyState
        icon="empty-inbox"
        message="صف خودکار پیامک بانکی فقط در اپ اندروید است. در وب‌اپ نصب‌شده متن پیامک بانک را از اپ پیامک با «حساب کتاب» به اشتراک بگذارید تا فرم ثبت پر شود. قالب پیامک‌ها را در کیف پول بسازید."
      />
    )
  }

  return isBuilding ? (
    <Suspense fallback={null}>
      <BuildingBankSmsReview />
    </Suspense>
  ) : (
    <BankSmsReview />
  )
}
