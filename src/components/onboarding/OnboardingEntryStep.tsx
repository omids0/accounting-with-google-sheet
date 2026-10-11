import { useEffect, useState } from 'react'

import type { OnboardingStepProps } from './onboardingSteps'
import { countRecordRows } from '../../services/onboarding'
import AppIcon from '../AppIcon'
import DataEntryPage from '../DataEntryPage'
import {
  onboardingSavedNoteClass,
  onboardingSubtitleClass,
  onboardingTitleClass
} from '../ui/onboardingStyles'

export default function OnboardingEntryStep({ spreadsheetId, onReadyChange }: OnboardingStepProps) {
  const [savedCount, setSavedCount] = useState(0)

  useEffect(() => {
    onReadyChange(savedCount > 0 || (countRecordRows(spreadsheetId) ?? 0) > 0)
  }, [savedCount, spreadsheetId, onReadyChange])

  return (
    <>
      <div>
        <h2 className={onboardingTitleClass}>اولین تراکنش را ثبت کن</h2>
        <p className={onboardingSubtitleClass}>
          یک هزینه یا درآمد اخیرت را بنویس؛ از همین‌جا داشبوردت جان می‌گیرد.
        </p>
      </div>

      {savedCount > 0 && (
        <p className={onboardingSavedNoteClass} role="status">
          <AppIcon name="check" size={18} />
          {savedCount === 1
            ? 'تراکنش ثبت شد. می‌توانی یکی دیگر هم ثبت کنی یا ادامه بدهی.'
            : `${savedCount.toLocaleString('fa-IR')} تراکنش ثبت شد.`}
        </p>
      )}

      <DataEntryPage
        key={savedCount}
        initialFormType="expense"
        onSaved={() => setSavedCount(count => count + 1)}
      />
    </>
  )
}
