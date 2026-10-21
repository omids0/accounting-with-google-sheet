import { useEffect, useMemo, useState } from 'react'

import { buildingCardCandidates } from './buildingCardGate'
import { buildingCardText, dismissCardMonth, isCardDismissed } from '../../services/bridgeDashboard'
import { readBridgePrefs, updateBridgePrefs } from '../../services/bridgePrefs'
import {
  cachedBuildingSummary,
  loadBuildingSummary,
  type BuildingSummary
} from '../../services/buildingSummary'
import { getSpreadsheetLabel } from '../../services/spreadsheetCatalog'
import AppIcon from '../AppIcon'
import { useEnterBuilding } from '../buildings/useEnterBuilding'
import SheetSwitchConfirmModal from '../settings/SheetSwitchConfirmModal'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { discoveryRowCloseClass } from '../ui/dashboardCalmStyles'
import {
  guideCardClass,
  guideCardIconClass,
  guideCardTextClass,
  guideCardTitleClass
} from '../ui/onboardingStyles'

/**
 * Guide card of the personal dashboard, the lowest priority (round 11, Step 8): from the 10th of
 * the month, «ساختمان نرگس: ۳ واحد بدهکار · شارژ مهر صادر نشده» with «ورود» into that workspace.
 * It reads the building through `buildingSummary` (its own spreadsheet, never loaded here); ✕ hides
 * it for the rest of the month.
 */
export default function DashboardBuildingCard() {
  const buildings = useMemo(() => buildingCardCandidates(), [])
  const [summaries, setSummaries] = useState<Record<string, BuildingSummary | null>>({})
  const [dismissed, setDismissed] = useState(() => readBridgePrefs().dismissed)
  const { enter, modalProps } = useEnterBuilding()

  useEffect(() => {
    let live = true

    for (const { id } of buildings) {
      setSummaries(prev => ({ ...prev, [id]: prev[id] ?? cachedBuildingSummary(id) }))
      void loadBuildingSummary(id).then(summary => {
        if (live) setSummaries(prev => ({ ...prev, [id]: summary }))
      })
    }

    return () => {
      live = false
    }
  }, [buildings])

  const shown = buildings
    .filter(entry => !isCardDismissed(dismissed, entry.id))
    .map(entry => ({
      entry,
      text: buildingCardText(getSpreadsheetLabel(entry.name), summaries[entry.id] ?? null)
    }))
    .find(item => item.text)

  if (!shown) return null

  const dismiss = () => {
    const next = dismissCardMonth(dismissed, shown.entry.id)

    setDismissed(next)
    updateBridgePrefs({ dismissed: next })
  }

  return (
    <Card className={guideCardClass}>
      <span className={guideCardIconClass} aria-hidden="true">
        <AppIcon name="building" size={20} />
      </span>
      <div className={guideCardTextClass}>
        <span className={guideCardTitleClass}>{shown.text}</span>
      </div>
      <Button type="button" size="sm" onClick={() => void enter(shown.entry.id)}>
        ورود
      </Button>
      <button
        type="button"
        className={discoveryRowCloseClass}
        onClick={dismiss}
        aria-label="تا پایان این ماه نشان نده"
        title="تا پایان این ماه نشان نده"
      >
        <AppIcon name="close" size={16} />
      </button>
      <SheetSwitchConfirmModal {...modalProps} />
    </Card>
  )
}
