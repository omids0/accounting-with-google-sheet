import { Suspense, type ReactNode } from 'react'

import { useOnboarding } from '../../hooks/useOnboarding'
import { LazyOnboardingWizard } from '../../routes/lazyPages'
import { AppLoadingSkeleton } from '../skeleton'

/** Shows the setup wizard in place of the app while onboarding is active. */
export default function OnboardingGate({ children }: { children: ReactNode }) {
  const { state } = useOnboarding({ autoStart: true })

  if (state?.status !== 'active') return children

  return (
    <Suspense fallback={<AppLoadingSkeleton />}>
      <LazyOnboardingWizard />
    </Suspense>
  )
}
