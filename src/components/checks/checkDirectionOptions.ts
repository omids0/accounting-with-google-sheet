import { CHECK_DIRECTION_LABELS } from '../../services/checkDirection'
import type { CheckDirection } from '../../types'
import type { SegmentedRadioOption } from '../form'

/** Options of the «نوع چک» switch in the form: a payable first, the default. */
export const CHECK_DIRECTION_OPTIONS: SegmentedRadioOption<CheckDirection>[] = [
  { value: 'paid', label: CHECK_DIRECTION_LABELS.paid },
  { value: 'received', label: CHECK_DIRECTION_LABELS.received }
]

/** The person on the other side of the check: who gets it, or who gave it. */
export function checkCounterpartyLabel(direction: CheckDirection): string {
  return direction === 'received' ? 'از طرف (صادرکننده)' : 'در وجه (گیرنده)'
}
