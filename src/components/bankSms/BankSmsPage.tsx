import { lazy, Suspense } from 'react'
import { useLocation } from 'react-router'

import BankSmsReview from './BankSmsReview'
import BankSmsSharedText from './BankSmsSharedText'
import { useIsBuildingWorkspace, useIsSharedWorkspace } from '../../hooks/useWorkspaceType'
import { isBankSmsAvailable } from '../../services/bankSmsNative'
import { readSharedSmsText } from '../../services/launchAction'
import { isConfigured } from '../../services/settings'
import EmptyState from '../EmptyState'

const SHARED_SMS_MESSAGE =
  'پیامک بانکی فقط در حساب شخصی شما پردازش می‌شود. برای ثبت هزینه در حساب مشترک، از ثبت دستی استفاده کنید.'

/** Inside a building the queue also matches deposits to units (round 11); that code loads there only. */
const BuildingBankSmsReview = lazy(() => import('./BuildingBankSmsReview'))

/** «پیامک‌های بانکی»: review queue for income/expense captured from bank SMS. */
export default function BankSmsPage() {
  const sharedText = readSharedSmsText(useLocation().state)
  const isBuilding = useIsBuildingWorkspace()
  const isShared = useIsSharedWorkspace()

  if (!isConfigured()) return <EmptyState icon="empty-inbox" message="ابتدا با گوگل وارد شوید" />

  // A shared account has no SMS queue and no wallet: the bank SMS stay in the personal books.
  if (isShared) return <EmptyState icon="empty-inbox" message={SHARED_SMS_MESSAGE} />

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
