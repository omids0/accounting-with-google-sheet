import { useEffect } from 'react'

import DashboardBackupCard from './DashboardBackupCard'
import DashboardDiscoveryCard from './DashboardDiscoveryCard'
import { useOnboarding } from '../../hooks/useOnboarding'
import { noteBackupFirstSeen } from '../../services/backupReminder'
import { getDiscoveryQueue, isDiscoveryEligible } from '../../services/featureDiscovery'
import {
  needsOnboardingResume,
  remainingStepCount,
  resumeOnboarding
} from '../../services/onboarding'
import AppIcon from '../AppIcon'
import Button from '../ui/Button'
import Card from '../ui/Card'
import {
  guideCardClass,
  guideCardHintClass,
  guideCardIconClass,
  guideCardTextClass,
  guideCardTitleClass
} from '../ui/onboardingStyles'

/**
 * Top-of-dashboard guidance, one card at most: resume a paused setup, else
 * suggest an unused feature, else remind about a full backup (lowest priority).
 */
export default function DashboardGuideCard() {
  const { spreadsheetId, steps, state } = useOnboarding()

  // The backup reminder of a never-backed-up spreadsheet counts from this first visit.
  useEffect(() => {
    if (spreadsheetId) noteBackupFirstSeen(spreadsheetId)
  }, [spreadsheetId])

  if (!spreadsheetId) return null

  if (state && needsOnboardingResume(state, steps)) {
    const remaining = remainingStepCount(state, steps)

    return (
      <Card className={guideCardClass}>
        <span className={guideCardIconClass} aria-hidden="true">
          <AppIcon name="info" size={20} />
        </span>
        <div className={guideCardTextClass}>
          <span className={guideCardTitleClass}>ادامه راه‌اندازی</span>
          <span className={guideCardHintClass}>
            {`${remaining.toLocaleString('fa-IR')} از ${steps.length.toLocaleString(
              'fa-IR'
            )} مرحله مانده`}
          </span>
        </div>
        <Button type="button" size="sm" onClick={() => resumeOnboarding(spreadsheetId)}>
          ادامه
        </Button>
      </Card>
    )
  }

  if (isDiscoveryEligible(spreadsheetId, steps) && getDiscoveryQueue(spreadsheetId).length) {
    return <DashboardDiscoveryCard spreadsheetId={spreadsheetId} />
  }

  return <DashboardBackupCard spreadsheetId={spreadsheetId} />
}
