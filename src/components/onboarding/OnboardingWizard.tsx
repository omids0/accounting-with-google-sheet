import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'

import OnboardingAccountsStep from './OnboardingAccountsStep'
import OnboardingEntryStep from './OnboardingEntryStep'
import OnboardingProgress from './OnboardingProgress'
import OnboardingSmsStep from './OnboardingSmsStep'
import type { OnboardingStepProps } from './onboardingSteps'
import OnboardingSummary from './OnboardingSummary'
import { useOnboarding } from '../../hooks/useOnboarding'
import {
  finishOnboarding,
  firstPendingStep,
  pauseOnboarding,
  resolveOnboardingStep,
  type OnboardingStepId
} from '../../services/onboarding'
import Button from '../ui/Button'
import {
  onboardingActionsClass,
  onboardingBodyClass,
  onboardingHeaderClass,
  onboardingLinkButtonClass,
  onboardingPageClass
} from '../ui/onboardingStyles'

function StepContent({ step, ...props }: OnboardingStepProps & { step: OnboardingStepId }) {
  if (step === 'wallet') return <OnboardingAccountsStep variant="first" {...props} />
  if (step === 'accounts') return <OnboardingAccountsStep variant="more" {...props} />
  if (step === 'entry') return <OnboardingEntryStep {...props} />

  return <OnboardingSmsStep {...props} />
}

/** Full-screen first-run setup shown before the main app for an empty spreadsheet. */
export default function OnboardingWizard() {
  const navigate = useNavigate()
  const { spreadsheetId, steps, state } = useOnboarding()
  const [ready, setReady] = useState(false)

  const onReadyChange = useCallback((next: boolean) => setReady(next), [])

  if (!state) return null

  const current = firstPendingStep(state, steps)

  const resolve = (status: 'done' | 'skipped') => {
    if (!current) return
    setReady(false)
    resolveOnboardingStep(spreadsheetId, current, status)
    window.scrollTo({ top: 0 })
  }

  const leave = (finish: boolean) => {
    if (finish) finishOnboarding(spreadsheetId)
    else pauseOnboarding(spreadsheetId)
    navigate('/', { replace: true })
  }

  return (
    <div className={onboardingPageClass} dir="rtl">
      <h1 className={onboardingHeaderClass}>راه‌اندازی اولیه</h1>
      <OnboardingProgress steps={steps} state={state} current={current} />

      <main className={onboardingBodyClass} key={current ?? 'summary'}>
        {current ? (
          <StepContent step={current} spreadsheetId={spreadsheetId} onReadyChange={onReadyChange} />
        ) : (
          <OnboardingSummary steps={steps} state={state} />
        )}
      </main>

      <div className={onboardingActionsClass}>
        {current ? (
          <>
            <Button type="button" disabled={!ready} onClick={() => resolve('done')}>
              ادامه
            </Button>
            <Button type="button" variant="secondary" onClick={() => resolve('skipped')}>
              رد شدن از این مرحله
            </Button>
            <button
              type="button"
              className={onboardingLinkButtonClass}
              onClick={() => leave(false)}
            >
              بعداً تکمیل می‌کنم — برو به داشبورد
            </button>
          </>
        ) : (
          <Button type="button" onClick={() => leave(true)}>
            ورود به داشبورد
          </Button>
        )}
      </div>
    </div>
  )
}
