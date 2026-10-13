import { useEffect } from 'react'

import DashboardBackupCard from './DashboardBackupCard'
import DashboardDiscoveryCard from './DashboardDiscoveryCard'
import DashboardMonthlyReportCard from './DashboardMonthlyReportCard'
import { useOnboarding } from '../../hooks/useOnboarding'
import { noteBackupFirstSeen } from '../../services/backupReminder'
import { getDiscoveryQueue, isDiscoveryEligible } from '../../services/featureDiscovery'
import { monthlyReportDue } from '../../services/monthlyReportGate'
import {
  needsOnboardingResume,
  remainingStepCount,
  resumeOnboarding
} from '../../services/onboarding'
import AppIcon from '../AppIcon'
import { useMonthlyReportState } from '../reports/monthly/useMonthlyReportState'
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
 * Top-of-dashboard guidance, one card at most: resume a paused setup, else the
 * first-of-month report, else suggest an unused feature, else remind about a
 * full backup (lowest priority).
 */
export default function DashboardGuideCard() {
  const { spreadsheetId, steps, state } = useOnboarding()
  const reportState = useMonthlyReportState(spreadsheetId ?? undefined)

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

  // Round 7: below the resume card (and the recurring card above), above discovery and backup.
  const reportMonth = monthlyReportDue(reportState)

  if (reportMonth) {
    return <DashboardMonthlyReportCard spreadsheetId={spreadsheetId} monthKey={reportMonth} />
  }

  if (isDiscoveryEligible(spreadsheetId, steps) && getDiscoveryQueue(spreadsheetId).length) {
    return <DashboardDiscoveryCard spreadsheetId={spreadsheetId} />
  }

  return <DashboardBackupCard spreadsheetId={spreadsheetId} />
}
