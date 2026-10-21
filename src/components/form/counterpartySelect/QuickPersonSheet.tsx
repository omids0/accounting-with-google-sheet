import { useEffect, useState } from 'react'

import { quickPersonError } from '../../../services/buildingQuickPerson'
import FormModal from '../../FormModal'
import { formErrorClass } from '../../ui/formStyles'
import WalletCardNumberInput from '../../wallet/WalletCardNumberInput'
import FormField from '../FormField'

export interface QuickPersonValues {
  name: string
  phone: string
  card: string
}

interface QuickPersonSheetProps {
  open: boolean
  saving: boolean
  /** Also ask for the bank card (an owner's, so bank SMS can find the unit). */
  askCard?: boolean
  onClose: () => void
  /** Resolves true when the person was saved. */
  onSubmit: (values: QuickPersonValues) => Promise<boolean>
}

const EMPTY: QuickPersonValues = { name: '', phone: '', card: '' }

/**
 * The light «شخص جدید» of a building: one name (required), a phone and, for owners, a card (both
 * optional). The full counterparty form (map, birth date, bank list) stays on the counterparties
 * page.
 */
export default function QuickPersonSheet({
  open,
  saving,
  askCard = false,
  onClose,
  onSubmit
}: QuickPersonSheetProps) {
  const [values, setValues] = useState<QuickPersonValues>(EMPTY)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setValues(EMPTY)
      setError(null)
    }
  }, [open])

  return (
    <FormModal
      open={open}
      title="شخص جدید"
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()

        const problem = quickPersonError(values)

        setError(problem)
        if (!problem) void onSubmit(values)
      }}
      saving={saving}
      saveLabel="ثبت"
    >
      <FormField label="نام" required>
        <input
          value={values.name}
          onChange={event => setValues({ ...values, name: event.target.value })}
          placeholder="مثلاً: علی احمدی"
          autoComplete="off"
        />
      </FormField>
      <FormField label="تلفن (اختیاری)">
        <input
          value={values.phone}
          onChange={event => setValues({ ...values, phone: event.target.value })}
          type="tel"
          inputMode="tel"
          dir="ltr"
          autoComplete="off"
        />
      </FormField>
      {askCard ? (
        <FormField
          label="شمارهٔ کارت (اختیاری)"
          hint="با کارت، پیامک بانکی واریز این فرد خودکار به واحدش وصل می‌شود."
        >
          <WalletCardNumberInput
            value={values.card}
            onChange={card => setValues({ ...values, card })}
          />
        </FormField>
      ) : null}
      {error ? (
        <p className={formErrorClass} role="alert">
          {error}
        </p>
      ) : null}
    </FormModal>
  )
}
