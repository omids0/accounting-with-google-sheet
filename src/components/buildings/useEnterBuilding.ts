import { enteringMessage } from './buildingBusyText'
import { useEnterWorkspace, type WorkspaceEntry } from '../../hooks/useEnterWorkspace'
import { isJourneyUnfinished, readJourney } from '../../services/buildingJourney'
import type { Tab } from '../layout/types'

/**
 * Where «ورود» lands: the caller's explicit target wins (a just-created building knows its
 * journey is open although the mirror has not loaded it yet); otherwise an unfinished journey
 * opens the setup and everything else the dashboard.
 */
export function enterDestination(requested: Tab | undefined, buildingId: string): Tab {
  if (requested) return requested

  return isJourneyUnfinished(readJourney(buildingId)) ? 'building-setup' : 'building-dashboard'
}

const BUILDING_ENTRY: WorkspaceEntry = {
  kind: 'building',
  destination: enterDestination,
  busyMessage: enteringMessage,
  failMessage: 'ورود به ساختمان ناموفق بود'
}

/**
 * «ورود» to a building (`useEnterWorkspace` with the building's landing page and texts): opens its
 * dashboard, or its setup journey while that is unfinished (or the given `tab`). Going from one
 * building to another steps to the dashboard first and keeps the remembered personal sheet.
 */
export function useEnterBuilding(onDone?: () => void) {
  return useEnterWorkspace(onDone, BUILDING_ENTRY)
}
