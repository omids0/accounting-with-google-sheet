import { useNavigate } from 'react-router'

import { getPathForTab } from '../../routes/paths'
import { isJourneyUnfinished, readJourney } from '../../services/buildingJourney'
import { getSettings } from '../../services/settings'
import { switchActiveSpreadsheet } from '../../services/spreadsheetSetup'
import { moveSyncToSpreadsheet } from '../../services/spreadsheetSwitch'
import { getWorkspaceType, rememberPersonalSheet } from '../../services/workspace'
import { bumpSpreadsheetKey } from '../../stores/appStore'
import { showError } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'
import type { Tab } from '../layout/types'
import { useSheetSwitchGuard } from '../settings/useSheetSwitchGuard'

/**
 * Where «ورود» lands: the caller's explicit target wins (a just-created building knows its
 * journey is open although the mirror has not loaded it yet); otherwise an unfinished journey
 * opens the setup and everything else the dashboard.
 */
export function enterDestination(requested: Tab | undefined, buildingId: string): Tab {
  if (requested) return requested

  return isJourneyUnfinished(readJourney(buildingId)) ? 'building-setup' : 'building-dashboard'
}

/**
 * «ورود»: makes a building the active spreadsheet (the sheet-switch guard asks first when the
 * current one has unsent changes) and opens its dashboard, or its setup journey while that is
 * unfinished (or the given `tab`). The personal spreadsheet is remembered on this device for
 * «برگشت به حساب شخصی».
 */
export function useEnterBuilding() {
  const navigate = useNavigate()
  const currentId = getSettings()?.spreadsheetId ?? ''
  const { guard, modalProps } = useSheetSwitchGuard(currentId)

  const run = async (buildingId: string, tab?: Tab) => {
    try {
      if (currentId && getWorkspaceType(currentId) !== 'building') rememberPersonalSheet(currentId)
      await switchActiveSpreadsheet(buildingId)
      await moveSyncToSpreadsheet(currentId, buildingId)
      navigate(getPathForTab(enterDestination(tab, buildingId)))
      bumpSpreadsheetKey()
    } catch (err) {
      showError(toUserMessage(err, 'ورود به ساختمان ناموفق بود'))
    }
  }

  return {
    enter: (buildingId: string, tab?: Tab) => guard(() => run(buildingId, tab)),
    modalProps
  }
}
