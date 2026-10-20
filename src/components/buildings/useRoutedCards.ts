import { useSyncExternalStore } from 'react'

import {
  getWorkspaceCardsVersion,
  routedCardLabels,
  subscribeWorkspaceCards
} from '../../services/bankSmsRouting'
import { getSettings } from '../../services/settings'

/** The cards of the open building's fund as the SMS routing knows them: `۶۱۰۴…۳۲۱۰`. */
export function useRoutedCards(): string[] {
  useSyncExternalStore(subscribeWorkspaceCards, getWorkspaceCardsVersion)

  return routedCardLabels(getSettings()?.spreadsheetId ?? '')
}
