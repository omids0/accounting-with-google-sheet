import { ONBOARDING_STEP_TITLES } from './onboardingSteps'
import type { OnboardingState, OnboardingStepId } from '../../services/onboarding'
import AppIcon from '../AppIcon'
import {
  onboardingSubtitleClass,
  onboardingSummaryClass,
  onboardingSummaryIconClass,
  onboardingSummaryRowClass,
  onboardingSummaryStatusClass,
  onboardingTitleClass
} from '../ui/onboardingStyles'

interface OnboardingSummaryProps {
  steps: OnboardingStepId[]
  state: OnboardingState
}

export default function OnboardingSummary({ steps, state }: OnboardingSummaryProps) {
  const anySkipped = steps.some(step => state.steps[step] === 'skipped')

  return (
    <div className={onboardingSummaryClass}>
      <span className={onboardingSummaryIconClass}>
        <AppIcon name="check" />
      </span>
      <h2 className={onboardingTitleClass}>آماده‌ای!</h2>
      <ul className="w-full max-w-[280px]">
        {steps.map(step => {
          const done = state.steps[step] === 'done'

          return (
            <li key={step} className={onboardingSummaryRowClass}>
              <span>{ONBOARDING_STEP_TITLES[step]}</span>
              <span className={onboardingSummaryStatusClass(done)}>
                {done ? '✓ انجام شد' : '— رد شد'}
              </span>
            </li>
          )
        })}
      </ul>
      {anySkipped && (
        <p className={onboardingSubtitleClass}>
          مراحل ردشده را هر وقت خواستی از خود بخش‌ها تکمیل کن؛ بخش «درباره» در منو هم همه امکانات را
          معرفی می‌کند.
        </p>
      )}
    </div>
  )
}
