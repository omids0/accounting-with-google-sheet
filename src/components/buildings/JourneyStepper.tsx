import { JOURNEY_STEPS } from '../../services/buildingJourney'
import { toPersianDigits } from '../../utils/normalizeDigits'
import {
  journeyBarClass,
  journeyBarCountClass,
  journeyBarLinkClass,
  journeyBarPillClass,
  journeyBarRowClass,
  journeyBarSegmentsClass
} from '../ui/buildingStyles'
import { onboardingSegmentClass } from '../ui/onboardingStyles'

export interface StepperStep {
  key: string
  title: string
}

interface JourneyStepperProps {
  step: string
  /** The steps drawn; default: the eight of the building journey. */
  steps?: readonly StepperStep[]
  /** Steps the manager skipped; drawn hatched like the onboarding wizard's. */
  skipped?: readonly string[]
  /** «قبلی»; absent before step 5. */
  onBack?: () => void
  /** «رد کردن» of the whole step. */
  onSkip?: () => void
}

/** «قدم N از M» with one segment per step, the step's name and the back / skip links. */
export default function JourneyStepper({
  step,
  steps = JOURNEY_STEPS,
  skipped = [],
  onBack,
  onSkip
}: JourneyStepperProps) {
  const current = steps.findIndex(item => item.key === step) + 1

  const title = steps[current - 1]?.title ?? ''

  return (
    <div className={journeyBarClass}>
      <div className={journeyBarRowClass}>
        <b className={journeyBarCountClass}>
          {`قدم ${toPersianDigits(String(current))} از ${toPersianDigits(String(steps.length))}`}
        </b>
        <span className={journeyBarPillClass}>{title}</span>
        <span className="flex items-center gap-3">
          {onBack ? (
            <button type="button" className={journeyBarLinkClass} onClick={onBack}>
              قبلی
            </button>
          ) : null}
          {onSkip ? (
            <button type="button" className={journeyBarLinkClass} onClick={onSkip}>
              رد کردن
            </button>
          ) : null}
        </span>
      </div>
      <div className={journeyBarSegmentsClass} aria-hidden="true">
        {steps.map((item, index) => (
          <i
            key={item.key}
            className={onboardingSegmentClass(
              skipped.includes(item.key)
                ? 'skipped'
                : index + 1 < current
                ? 'done'
                : index + 1 === current
                ? 'current'
                : 'todo'
            )}
          />
        ))}
      </div>
    </div>
  )
}
