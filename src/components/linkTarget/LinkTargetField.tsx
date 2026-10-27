import { useMemo } from 'react'

import type { LinkTargetState } from '../../hooks/useLinkTarget'
import FormField from '../form/FormField'
import Select, { type SelectOption } from '../form/Select'

type LinkTargetFieldProps = {
  link: LinkTargetState
  disabled?: boolean
}

/**
 * «پرداخت کدام بدهی؟» / «دریافت کدام طلب؟» / «کدام چک …؟» / «پرداخت کدام دفترچه قسط؟»: lists the
 * open items a new record can pay, and for an item with children (an installment book) a second
 * select for which instalment. Mounted by the manual entry form and the bank-SMS card alike
 * (always through the lazy wrapper). «هیچ‌کدوم» is the default and leaves the record a plain one.
 */
export default function LinkTargetField({ link, disabled = false }: LinkTargetFieldProps) {
  const { kind, options, childOptions, loading, expectEmpty, selectedId, childId, error, warning } =
    link

  const selectOptions = useMemo<SelectOption[]>(
    () => [
      { value: '', label: loading ? 'در حال خواندن…' : kind?.noneLabel ?? '' },
      ...options.map(option => ({
        value: option.id,
        disabled: option.disabled,
        label: option.label
      }))
    ],
    [kind, options, loading]
  )

  const childSelectOptions = useMemo<SelectOption[]>(
    () =>
      childOptions.length
        ? childOptions.map(option => ({ value: option.id, label: option.label }))
        : [{ value: '', label: 'اول دفترچه را انتخاب کن' }],
    [childOptions]
  )

  if (!kind) return null

  const empty = !loading && options.length === 0

  // The second select is there from the start and stays (disabled until a book is picked): the form
  // does not jump when the user picks one, nor shrink when nothing turns out to be open.
  const showChild = Boolean(kind.childLabel)

  // One field in every state (reading, nothing open, items), so the form does not jump around.
  return (
    <>
      <FormField
        label={kind.fieldLabel}
        controlWidth="full"
        error={error || undefined}
        hint={empty || expectEmpty ? kind.emptyHint : undefined}
      >
        <Select
          value={selectedId}
          onChange={link.select}
          options={selectOptions}
          disabled={disabled || loading || empty}
          aria-label={kind.fieldLabel}
        />
      </FormField>
      {showChild ? (
        <FormField
          label={kind.childLabel}
          controlWidth="full"
          hint={
            warning ? (
              <span role="status" className="font-semibold text-warning">
                {warning}
              </span>
            ) : undefined
          }
        >
          <Select
            value={childId}
            onChange={link.selectChild}
            options={childSelectOptions}
            disabled={disabled || !selectedId}
            aria-label={kind.childLabel}
          />
        </FormField>
      ) : null}
    </>
  )
}
