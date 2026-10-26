import { useCallback, useMemo } from 'react'

import type { SmsChoice } from './useBankSmsReview'
import type { useBuildingSmsUnits } from './useBuildingSmsUnits'
import type { ConfirmableSms } from '../../services/bankSmsApply'
import { getBankSmsPrefs } from '../../services/bankSmsPrefs'
import { smsSuggestInput, suggestSmsCategory } from '../../services/bankSmsSuggest'
import { unitSuggestionTitle } from '../../services/buildingSmsMatch'
import { BUILDING_CHARGE_CATEGORY } from '../../utils/protectedCategories'

type Context = Parameters<typeof suggestSmsCategory>[1]

/**
 * The category each SMS card starts with: what the user picked, else the round-6 suggestion.
 * `pending` changes after every confirm, which is when the remembered categories change.
 */
export function useSmsChoices(
  picked: Record<string, SmsChoice>,
  context: Pick<Context, 'recurring' | 'ledger'>,
  pending: unknown,
  units: ReturnType<typeof useBuildingSmsUnits>
) {
  const { recurring, ledger } = context

  const suggestContext = useMemo(() => {
    const prefs = getBankSmsPrefs()

    return {
      recurring,
      ledger,
      bySender: prefs.lastCategoryBySender,
      byTemplate: prefs.lastCategory
    }
  }, [recurring, ledger, pending]) // eslint-disable-line react-hooks/exhaustive-deps

  /** The category of a deposit/withdrawal as the round-6 rules give it (what «درآمد دیگر» saves). */
  const plainChoiceFor = useCallback(
    (entry: ConfirmableSms): SmsChoice | null => {
      const own = picked[entry.sms.id]

      // A pick emptied by deleting its category counts as no choice, never as a blank category.
      if (own) return own.category ? own : null

      return suggestSmsCategory(smsSuggestInput(entry), suggestContext)
    },
    [picked, suggestContext]
  )

  /** Same, but a deposit whose payer's card is a unit's says «شارژ ساختمان» (table, form fallback). */
  const choiceFor = useCallback(
    (entry: ConfirmableSms): SmsChoice | null => {
      const offer = units.offerFor(entry)

      return offer?.kind === 'card' && !picked[entry.sms.id]
        ? suggestSmsCategory(
            smsSuggestInput(entry, {
              title: unitSuggestionTitle(offer.candidate),
              category: BUILDING_CHARGE_CATEGORY
            }),
            suggestContext
          )
        : plainChoiceFor(entry)
    },
    [units, picked, suggestContext, plainChoiceFor]
  )

  return { plainChoiceFor, choiceFor }
}
