import DashboardDiscoveryCard from './DashboardDiscoveryCard'
import { useOnboarding } from '../../hooks/useOnboarding'
import { isDiscoveryEligible } from '../../services/featureDiscovery'
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

/** Top-of-dashboard guidance: resume a paused setup, otherwise suggest an unused feature. */
export default function DashboardGuideCard() {
  const { spreadsheetId, steps, state } = useOnboarding()

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

  if (!isDiscoveryEligible(spreadsheetId, steps)) return null

  return <DashboardDiscoveryCard spreadsheetId={spreadsheetId} />
}
