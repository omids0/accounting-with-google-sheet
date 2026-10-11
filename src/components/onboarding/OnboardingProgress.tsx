import { ONBOARDING_STEP_TITLES } from './onboardingSteps'
import type { OnboardingState, OnboardingStepId } from '../../services/onboarding'
import {
  onboardingCountClass,
  onboardingProgressClass,
  onboardingSegmentClass
} from '../ui/onboardingStyles'

interface OnboardingProgressProps {
  steps: OnboardingStepId[]
  state: OnboardingState
  current: OnboardingStepId | null
}

export default function OnboardingProgress({ steps, state, current }: OnboardingProgressProps) {
  const position = current ? steps.indexOf(current) + 1 : steps.length

  return (
    <>
      <div
        className={onboardingProgressClass}
        role="progressbar"
        aria-label="پیشرفت راه‌اندازی"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={current ? position - 1 : steps.length}
      >
        {steps.map(step => {
          const status = state.steps[step]
          const segment =
            status === 'done'
              ? 'done'
              : status === 'skipped'
              ? 'skipped'
              : step === current
              ? 'current'
              : 'todo'

          return (
            <span
              key={step}
              className={onboardingSegmentClass(segment)}
              title={ONBOARDING_STEP_TITLES[step]}
            />
          )
        })}
      </div>
      <p className={onboardingCountClass}>
        {current
          ? `مرحله ${position.toLocaleString('fa-IR')} از ${steps.length.toLocaleString('fa-IR')}`
          : 'تمام شد'}
      </p>
    </>
  )
}
