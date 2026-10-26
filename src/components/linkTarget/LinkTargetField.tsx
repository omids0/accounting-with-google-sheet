import { useMemo } from 'react'

import type { LinkTargetState } from '../../hooks/useLinkTarget'
import { formatMoney } from '../../utils/formatMoney'
import FormField from '../form/FormField'
import Select, { type SelectOption } from '../form/Select'

type LinkTargetFieldProps = {
  link: LinkTargetState
  disabled?: boolean
}

/**
 * «پرداخت کدام بدهی؟» / «دریافت کدام طلب؟»: lists the open items a new «بدهی» or «طلب» record can
 * pay. Mounted by the manual entry form and the bank-SMS card alike (always through the lazy
 * wrapper). «هیچ‌کدوم» is the default and leaves the record a plain one.
 */
export default function LinkTargetField({ link, disabled = false }: LinkTargetFieldProps) {
  const { kind, options, loading, selectedId, error } = link

  const selectOptions = useMemo<SelectOption[]>(
    () => [
      { value: '', label: loading ? 'در حال خواندن…' : kind?.noneLabel ?? '' },
      ...options.map(option => ({
        value: option.id,
        disabled: option.disabled,
        label: option.disabled
          ? `${option.title} — باقی‌مانده ${formatMoney(option.remaining)} (کمتر از مبلغ این رکورد)`
          : `${option.title} — باقی‌مانده ${formatMoney(option.remaining)}`
      }))
    ],
    [kind, options, loading]
  )

  if (!kind) return null

  const empty = !loading && options.length === 0

  // One field in every state (reading, nothing open, items), so the form does not jump around.
  return (
    <FormField
      label={kind.fieldLabel}
      controlWidth="full"
      error={error || undefined}
      hint={empty ? kind.emptyHint : undefined}
    >
      <Select
        value={selectedId}
        onChange={link.select}
        options={selectOptions}
        disabled={disabled || loading || empty}
        aria-label={kind.fieldLabel}
      />
    </FormField>
  )
}
