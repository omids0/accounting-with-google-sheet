import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'

import { getPathForTab } from '../../routes/paths'
import {
  canGoBack,
  goNextStep,
  goPreviousStep,
  OPTIONAL_STEPS,
  readJourney,
  saveJourney,
  type JourneyState
} from '../../services/buildingJourney'
import { getSettings } from '../../services/settings'
import { showError } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'
import EmptyState from '../EmptyState'
import CompleteUnitsSheet from './CompleteUnitsSheet'
import FirstIssueStep from './FirstIssueStep'
import InviteMembersSheet from './InviteMembersSheet'
import JourneyStepper from './JourneyStepper'
import JourneySummarySheet from './JourneySummarySheet'
import PreviousDebtsSheet from './PreviousDebtsSheet'
import QuickUnitsBuilderSheet from './QuickUnitsBuilderSheet'
import { useBuildingSetupData } from './useBuildingSetupData'

/**
 * Steps 3 to 8 of the setup journey, inside the new building. One sheet per step, each opened by
 * the one before when it is saved or skipped; the step bar shows «قدم N از ۸» with «قبلی» (from
 * step 5) and «رد کردن». Closing a sheet leaves the journey where it is: the dashboard keeps the
 * setup card with «ادامه» until the summary is confirmed.
 */
export default function BuildingJourneyPage() {
  const navigate = useNavigate()
  const data = useBuildingSetupData()
  const spreadsheetId = getSettings()?.spreadsheetId ?? ''
  const [state, setState] = useState<JourneyState | null>(() => readJourney(spreadsheetId))

  const dashboard = getPathForTab('building-dashboard')

  if (!state || state.finished) return <Navigate to={dashboard} replace />

  const move = (next: JourneyState) => {
    setState(next)
    saveJourney(spreadsheetId, next).catch(err =>
      showError(toUserMessage(err, 'ذخیرهٔ پیشرفت راه‌اندازی ناموفق بود'))
    )
    if (next.finished) navigate(dashboard, { replace: true })
  }

  const advance = (how: 'done' | 'skipped' = 'done') => move(goNextStep(state, how))

  const header = (
    <JourneyStepper
      step={state.step}
      skipped={state.skipped}
      onBack={canGoBack(state) ? () => move(goPreviousStep(state)) : undefined}
      onSkip={OPTIONAL_STEPS.includes(state.step) ? () => advance('skipped') : undefined}
    />
  )

  const leave = () => navigate(dashboard)

  return (
    <>
      <EmptyState
        icon="building"
        message={data.profile ? `راه‌اندازی «${data.profile.name}»` : 'راه‌اندازی ساختمان'}
        description="با هر قدم، قدم بعدی باز می‌شود. اگر وسط راه بیرون بروی، کارت «ادامه» روی داشبورد می‌ماند."
      />
      <QuickUnitsBuilderSheet
        open={state.step === 'units'}
        defaultUnits={state.unitCount}
        defaultFloors={data.profile?.floors}
        header={header}
        onClose={leave}
        onCreated={() => void data.reload().then(() => advance())}
      />
      <CompleteUnitsSheet
        open={state.step === 'people'}
        data={data}
        header={header}
        onClose={leave}
        onDone={() => advance()}
      />
      <PreviousDebtsSheet
        open={state.step === 'debts'}
        data={data}
        header={header}
        onClose={leave}
        onSaved={() => advance()}
      />
      <FirstIssueStep
        open={state.step === 'issue'}
        header={header}
        onClose={leave}
        onIssued={() => advance()}
      />
      <InviteMembersSheet
        open={state.step === 'invite'}
        buildingName={data.profile?.name ?? ''}
        header={header}
        onClose={leave}
        onSaved={() => advance()}
      />
      <JourneySummarySheet
        open={state.step === 'summary'}
        data={data}
        header={header}
        onClose={leave}
        onFinish={() => advance()}
      />
    </>
  )
}
