import { useMemo, useSyncExternalStore } from 'react'

import { useIsBuildingWorkspace } from './useWorkspaceType'
import type { BankSmsItem } from '../services/bankSmsNative'
import {
  filterSmsForWorkspace,
  getWorkspaceCardsVersion,
  routingWorkspaces,
  subscribeWorkspaceCards
} from '../services/bankSmsRouting'
import { getSettings } from '../services/settings'
import { useBankSmsStore } from '../stores/bankSmsStore'

/**
 * The captured SMS that belong to the open workspace (round 11, Step 6): those naming one of
 * its cards, and in a personal workspace those no workspace owns. Re-evaluated when the card
 * cache changes or another spreadsheet is opened.
 */
export function useRoutedPendingSms(): BankSmsItem[] {
  const pending = useBankSmsStore(state => state.pending)
  const isBuilding = useIsBuildingWorkspace()
  const cardsVersion = useSyncExternalStore(subscribeWorkspaceCards, getWorkspaceCardsVersion)
  const activeId = getSettings()?.spreadsheetId ?? ''

  return useMemo(
    () => filterSmsForWorkspace(pending, routingWorkspaces(), activeId, isBuilding),
    // `cardsVersion` stands for the cache, which is not a React value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pending, isBuilding, activeId, cardsVersion]
  )
}
