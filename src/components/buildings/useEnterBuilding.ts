import { useState } from 'react'
import { flushSync } from 'react-dom'
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
 * «برگشت به حساب شخصی», and only when the sheet being left is not itself a building, so going
 * from one building to another keeps it. Entering the building that is already open just opens
 * its dashboard. `onDone` runs once the page is open (the drawer closes with it). `entering` is the
 * building being opened right now, so the caller can say so while the first download runs.
 */
export function useEnterBuilding(onDone?: () => void) {
  const navigate = useNavigate()
  const currentId = getSettings()?.spreadsheetId ?? ''
  const { guard, modalProps } = useSheetSwitchGuard(currentId)
  const [entering, setEntering] = useState<string | null>(null)

  const open = (buildingId: string, tab?: Tab) => {
    navigate(getPathForTab(enterDestination(tab, buildingId)))
    onDone?.()
  }

  const run = async (buildingId: string, tab?: Tab) => {
    setEntering(buildingId)
    try {
      if (currentId && getWorkspaceType(currentId) !== 'building') rememberPersonalSheet(currentId)
      // From one building to another the open page belongs to the building being left (a unit of
      // it, say): step to the dashboard first, whose skeleton waits for the new building's data.
      else if (currentId) navigate(getPathForTab('building-dashboard'), { replace: true })
      await switchActiveSpreadsheet(buildingId)
      await moveSyncToSpreadsheet(currentId, buildingId)
      // The route guard sends a building away from «/buildings» as soon as the workspace flips. Let
      // that settle first, so the page we want is the last navigation instead of being overridden.
      flushSync(() => bumpSpreadsheetKey())
      open(buildingId, tab)
    } catch (err) {
      showError(toUserMessage(err, 'ورود به ساختمان ناموفق بود'))
    } finally {
      setEntering(null)
    }
  }

  return {
    enter: async (buildingId: string, tab?: Tab) => {
      if (entering) return
      if (buildingId === currentId) open(buildingId, tab)
      else await guard(() => run(buildingId, tab))
    },
    entering,
    modalProps
  }
}
