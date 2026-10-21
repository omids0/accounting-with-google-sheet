import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useBuildingAccess } from '../../hooks/useBuildingAccess'
import { getPathForTab } from '../../routes/paths'
import { JOURNEY_STEPS, readJourney, stepNumber } from '../../services/buildingJourney'
import { toPersianDigits } from '../../utils/normalizeDigits'
import AppIcon from '../AppIcon'
import { nextSetupStep, placeholderOwnerCount, setupChecklist } from './buildingSetup'
import CompleteUnitsSheet from './CompleteUnitsSheet'
import { useBuildingSetupData } from './useBuildingSetupData'
import { checklistRowClass } from '../ui/buildingStyles'
import Button from '../ui/Button'
import Card from '../ui/Card'
import {
  guideCardClass,
  guideCardHintClass,
  guideCardIconClass,
  guideCardTextClass,
  guideCardTitleClass
} from '../ui/onboardingStyles'

const fa = (value: number) => toPersianDigits(String(value))

/**
 * The checklist the dashboard shows while the setup journey is unfinished, with one primary
 * «ادامه»; once it is finished, a slim version while any unit still has a placeholder owner.
 * Rendered by the building dashboard (round 11, Step 3). Hidden without the `people` permission.
 */
export default function BuildingSetupCard() {
  const navigate = useNavigate()
  const { can } = useBuildingAccess()
  const data = useBuildingSetupData()
  const [completing, setCompleting] = useState(false)

  const journey = readJourney()

  const placeholderOwners = data.loaded
    ? placeholderOwnerCount(data.units, data.stays, data.persons)
    : 0

  const next = nextSetupStep({ journey, placeholderOwners })

  if (!next || !can('people')) return null

  const unfinished = next.reason === 'journey' && journey

  return (
    <Card className={guideCardClass}>
      <span className={guideCardIconClass} aria-hidden="true">
        <AppIcon name="info" size={20} />
      </span>
      <div className={guideCardTextClass}>
        <span className={guideCardTitleClass}>
          {unfinished ? 'ادامه راه‌اندازی ساختمان' : 'مالک واحدها را کامل کن'}
        </span>
        <span className={guideCardHintClass}>
          {unfinished
            ? `قدم ${fa(stepNumber(next.step))} از ${fa(JOURNEY_STEPS.length)} · ${
                JOURNEY_STEPS[stepNumber(next.step) - 1].title
              }`
            : `${fa(
                placeholderOwners
              )} واحد هنوز مالک موقت دارد؛ صدور خودکار شارژ تا تکمیل آن‌ها منتظر می‌ماند.`}
        </span>
        {unfinished
          ? setupChecklist(journey).map(item => (
              <span key={item.key} className={checklistRowClass}>
                {item.status === 'done' ? '✓' : item.status === 'skipped' ? '–' : '○'} {item.title}
              </span>
            ))
          : null}
      </div>
      <Button
        type="button"
        size="sm"
        className="min-h-11 text-sm"
        onClick={() =>
          unfinished ? navigate(getPathForTab('building-setup')) : setCompleting(true)
        }
      >
        ادامه
      </Button>
      <CompleteUnitsSheet
        open={completing}
        data={data}
        onClose={() => setCompleting(false)}
        onDone={() => setCompleting(false)}
      />
    </Card>
  )
}
