import {
  JOURNEY_STEPS,
  stepNumber,
  type JourneyState,
  type JourneyStepKey
} from '../../services/buildingJourney'
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

interface JourneyStepperProps {
  step: JourneyStepKey
  /** Steps the manager skipped; drawn hatched like the onboarding wizard's. */
  skipped?: JourneyState['skipped']
  /** «قبلی»; absent before step 5. */
  onBack?: () => void
  /** «رد کردن» of the whole step. */
  onSkip?: () => void
}

/** «قدم N از ۸» with eight segments, the step's name and the back / skip links. */
export default function JourneyStepper({
  step,
  skipped = [],
  onBack,
  onSkip
}: JourneyStepperProps) {
  const current = stepNumber(step)

  const title = JOURNEY_STEPS[current - 1]?.title ?? ''

  return (
    <div className={journeyBarClass}>
      <div className={journeyBarRowClass}>
        <b className={journeyBarCountClass}>
          {`قدم ${toPersianDigits(String(current))} از ${toPersianDigits(
            String(JOURNEY_STEPS.length)
          )}`}
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
        {JOURNEY_STEPS.map((item, index) => (
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
