import { useCallback, useMemo } from 'react'

import type { ConfirmableSms } from '../../services/bankSmsApply'
import {
  buildSmsUnitInputs,
  matchUnits,
  senderCardTokens,
  unitOffer,
  type SmsUnitMatch,
  type SmsUnitOffer
} from '../../services/buildingSmsMatch'
import type { WalletAccount } from '../../types'
import type { BuildingSetupData } from '../buildings/useBuildingSetupData'

/**
 * Round 11, Step 6: for a deposit SMS in a building queue, which unit paid. Outside a building
 * (`building` null) and for withdrawals there is no match, so the card behaves as before.
 */
export function useBuildingSmsUnits(building: BuildingSetupData | null, fund: WalletAccount[]) {
  const units = useMemo(() => (building ? buildSmsUnitInputs(building) : []), [building])

  const matchFor = useCallback(
    (entry: ConfirmableSms): SmsUnitMatch | null =>
      building && entry.result.direction === 'credit'
        ? matchUnits(
            { amount: entry.amount, tokens: senderCardTokens(entry.sms.body, fund) },
            units
          )
        : null,
    [building, units, fund]
  )

  const offerFor = useCallback(
    (entry: ConfirmableSms): SmsUnitOffer | null => {
      const match = matchFor(entry)

      return match ? unitOffer(match) : null
    },
    [matchFor]
  )

  return { matchFor, offerFor }
}
