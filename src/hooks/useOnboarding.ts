import { useEffect, useMemo, useState } from 'react'

import { isBankSmsAvailable } from '../services/bankSmsNative'
import { useDataRevision } from '../services/dataRevision'
import {
  getOnboardingState,
  getOnboardingSteps,
  shouldStartOnboarding,
  startOnboarding,
  subscribeOnboarding,
  type OnboardingState
} from '../services/onboarding'
import { getSettings } from '../services/settings'
import { subscribeStore } from '../services/spreadsheetStore'
import { useAppStore } from '../stores/appStore'

/**
 * Onboarding state of the active spreadsheet. Re-reads on onboarding changes,
 * local writes and synced data, and starts the wizard once an empty sheet is proven.
 */
export function useOnboarding(options: { autoStart?: boolean } = {}) {
  const spreadsheetKey = useAppStore(state => state.spreadsheetKey)
  const revision = useDataRevision()
  const [version, setVersion] = useState(0)

  const spreadsheetId = getSettings()?.spreadsheetId ?? ''
  const steps = useMemo(() => getOnboardingSteps(isBankSmsAvailable()), [])

  useEffect(() => {
    const bump = () => setVersion(v => v + 1)
    const offOnboarding = subscribeOnboarding(bump)
    const offStore = subscribeStore(bump)

    return () => {
      offOnboarding()
      offStore()
    }
  }, [])

  useEffect(() => {
    if (options.autoStart && spreadsheetId && shouldStartOnboarding(spreadsheetId)) {
      startOnboarding(spreadsheetId)
    }
  }, [options.autoStart, spreadsheetId, spreadsheetKey, revision, version])

  const state: OnboardingState | null = useMemo(
    () => (spreadsheetId ? getOnboardingState(spreadsheetId) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spreadsheetId, spreadsheetKey, version]
  )

  return { spreadsheetId, steps, state, revision }
}
