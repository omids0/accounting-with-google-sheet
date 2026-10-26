import { useState } from 'react'

import { CREATE_ENTER_MESSAGE, CREATE_FILE_MESSAGE } from './buildingBusyText'
import {
  countOf,
  EMPTY_FUND,
  EMPTY_PROFILE,
  fundError,
  profileError,
  profileFromDrafts,
  type FundDraft,
  type ProfileDraft
} from './journeyDraft'
import JourneyFundStep from './JourneyFundStep'
import JourneyProfileStep from './JourneyProfileStep'
import JourneyStepper from './JourneyStepper'
import { useEnterBuilding } from './useEnterBuilding'
import { useCreepingBusy } from '../../hooks/useCreepingBusy'
import { initialJourneyState, rememberCreatedJourney } from '../../services/buildingJourney'
import { createBuildingSpreadsheet } from '../../services/buildingTemplate'
import { hideBusy } from '../../stores/busyOverlayStore'
import { showError } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'
import SheetSwitchConfirmModal from '../settings/SheetSwitchConfirmModal'
import { journeyPageClass } from '../ui/buildingStyles'
import Card from '../ui/Card'

/**
 * What the busy overlay says, and how far its simulated bar may creep before Sheets answers.
 */
const CREATE_STEPS = {
  file: { label: CREATE_FILE_MESSAGE, ceiling: 60 },
  enter: { label: CREATE_ENTER_MESSAGE, ceiling: 96 }
} as const

type CreateStep = keyof typeof CREATE_STEPS

/**
 * «+ ساختمان جدید», steps 1 and 2 of the journey. They run in the manager's own workspace and
 * write nothing until «ساخت ساختمان» creates the spreadsheet; the building is then entered and
 * steps 3 to 8 continue inside it.
 */
export default function BuildingCreateJourney({ onCancel }: { onCancel: () => void }) {
  const [stage, setStage] = useState<'profile' | 'fund'>('profile')
  const [profile, setProfile] = useState<ProfileDraft>(EMPTY_PROFILE)
  const [fund, setFund] = useState<FundDraft>(EMPTY_FUND)
  const [error, setError] = useState<string | null>(null)
  const busy = useCreepingBusy<CreateStep>(CREATE_STEPS, 'file')
  const building = busy.active
  const { enter, modalProps } = useEnterBuilding()

  const next = () => {
    const problem = profileError(profile)

    setError(problem)
    if (!problem) setStage('fund')
  }

  const build = async () => {
    const problem = fundError(fund)

    setError(problem)
    if (problem) return

    busy.start('file')
    try {
      const journey = initialJourneyState({
        unitCount: countOf(profile.units),
        note: profile.note.trim() || undefined
      })

      const id = await createBuildingSpreadsheet(
        profileFromDrafts(profile, fund),
        fund.accounts,
        journey
      )

      // The new sheet is not mirrored yet, so its journey row cannot be read: hand it over and
      // go straight to step 3 instead of the dashboard.
      rememberCreatedJourney(id, journey)
      busy.advance('enter', 62)
      await enter(id, 'building-setup', CREATE_STEPS.enter.label)
      busy.complete()
    } catch (err) {
      hideBusy()
      showError(toUserMessage(err, 'ساخت ساختمان ناموفق بود'))
    } finally {
      busy.stop()
    }
  }

  return (
    <div className={journeyPageClass}>
      <Card>
        <JourneyStepper step={stage} />
        {stage === 'profile' ? (
          <JourneyProfileStep
            draft={profile}
            error={error}
            onChange={setProfile}
            onNext={next}
            onCancel={onCancel}
          />
        ) : (
          <JourneyFundStep
            draft={fund}
            error={error}
            building={building}
            onChange={setFund}
            onBuild={() => void build()}
            onBack={() => {
              setError(null)
              setStage('profile')
            }}
          />
        )}
      </Card>
      <SheetSwitchConfirmModal {...modalProps} />
    </div>
  )
}
