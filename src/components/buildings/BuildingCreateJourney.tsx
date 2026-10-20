import { useEffect, useState } from 'react'

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
import { initialJourneyState } from '../../services/buildingJourney'
import { createBuildingSpreadsheet } from '../../services/buildingTemplate'
import { showError } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'
import SheetSwitchConfirmModal from '../settings/SheetSwitchConfirmModal'
import { journeyPageClass } from '../ui/buildingStyles'
import Card from '../ui/Card'

/** The simulated progress stops here until Sheets answers. */
const PROGRESS_CEILING = 90

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
  const [building, setBuilding] = useState(false)
  const [progress, setProgress] = useState(0)
  const { enter, modalProps } = useEnterBuilding()

  useEffect(() => {
    if (!building) return

    const timer = window.setInterval(
      () => setProgress(value => Math.min(PROGRESS_CEILING, value + 6)),
      350
    )

    return () => window.clearInterval(timer)
  }, [building])

  const next = () => {
    const problem = profileError(profile)

    setError(problem)
    if (!problem) setStage('fund')
  }

  const build = async () => {
    const problem = fundError(fund)

    setError(problem)
    if (problem) return

    setBuilding(true)
    setProgress(4)
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

      setProgress(100)
      await enter(id)
    } catch (err) {
      showError(toUserMessage(err, 'ساخت ساختمان ناموفق بود'))
    } finally {
      setBuilding(false)
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
            progress={progress}
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
