import {
  unitPickLabel,
  unitReason,
  unitSuggestionTitle,
  type SmsUnitOffer
} from '../../services/buildingSmsMatch'
import Select from '../form/Select'
import ToggleChipGroup from '../ToggleChipGroup'
import { smsChoiceReasonClass, smsChoiceRowClass } from '../ui/bankSmsStyles'

/** Up to this many candidates are chips; more are a list to pick from. */
const MAX_CHIPS = 6

type BankSmsUnitLineProps = {
  offer: SmsUnitOffer
  /** The picked unit of a `pick` offer ('' until one is). */
  pickedId: string
  onPick: (unitId: string) => void
  disabled: boolean
}

/**
 * Round 11, Step 6: which unit paid, on a deposit card of a building queue. A card match is one
 * suggestion line («شارژ مهر · واحد ۴ · رضایی»); an amount-only match is a question with the
 * candidate units to pick from, and nothing is saved until one is picked.
 */
export default function BankSmsUnitLine({
  offer,
  pickedId,
  onPick,
  disabled
}: BankSmsUnitLineProps) {
  if (offer.kind === 'card') {
    const reason = unitReason(offer.candidate)

    return (
      <div className={smsChoiceRowClass}>
        <p className={smsChoiceReasonClass}>
          <b>پیشنهاد: {unitSuggestionTitle(offer.candidate)}</b>
          {reason ? ` (${reason})` : ''}
        </p>
      </div>
    )
  }

  const options = offer.candidates.map(({ unit }) => ({
    id: unit.id,
    label: unitPickLabel(unit)
  }))

  return (
    <div className={smsChoiceRowClass}>
      <p className={smsChoiceReasonClass}>{offer.text}</p>
      {options.length <= MAX_CHIPS ? (
        <ToggleChipGroup
          ariaLabel="واحد پرداخت‌کننده"
          options={options}
          selected={{ [pickedId]: true }}
          onToggle={onPick}
        />
      ) : (
        <Select
          aria-label="واحد پرداخت‌کننده"
          value={pickedId}
          onChange={onPick}
          disabled={disabled}
          options={[
            { value: '', label: 'کدام واحد؟' },
            ...options.map(option => ({ value: option.id, label: option.label }))
          ]}
        />
      )}
    </div>
  )
}
