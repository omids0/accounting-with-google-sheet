import EntryCounterpartyField from './EntryCounterpartyField'
import EntryLineItemsField from './EntryLineItemsField'
import { COUNTERPARTY_FIELD_ID, LINE_ITEMS_FIELD_ID } from '../form/fieldUtils'

/** Whether a form field is drawn by `EntryRecordExtraField` instead of `FieldInput`. */
export function isRecordExtraField(fieldId: string): boolean {
  return fieldId === COUNTERPARTY_FIELD_ID || fieldId === LINE_ITEMS_FIELD_ID
}

/**
 * The two optional income/expense fields with their own editors: «طرف حساب»
 * and «ریز اقلام». Shared by the entry form and the record edit modal.
 */
export default function EntryRecordExtraField({
  fieldId,
  values,
  setValue,
  disabled,
  autoSuggest
}: {
  fieldId: string
  values: Record<string, string | number>
  setValue: (id: string, value: string | number) => void
  disabled?: boolean
  /** Prefill the counterparty from earlier records (new records only). */
  autoSuggest?: boolean
}) {
  if (fieldId === COUNTERPARTY_FIELD_ID) {
    return (
      <EntryCounterpartyField
        value={String(values[COUNTERPARTY_FIELD_ID] ?? '')}
        category={String(values.category ?? '')}
        title={String(values.title ?? '')}
        disabled={disabled}
        autoSuggest={autoSuggest}
        onChange={name => setValue(COUNTERPARTY_FIELD_ID, name)}
      />
    )
  }

  if (fieldId === LINE_ITEMS_FIELD_ID) {
    return (
      <EntryLineItemsField
        value={String(values[LINE_ITEMS_FIELD_ID] ?? '')}
        amount={values.amount ?? ''}
        category={String(values.category ?? '')}
        disabled={disabled}
        onChange={json => setValue(LINE_ITEMS_FIELD_ID, json)}
        onAmountChange={amount => setValue('amount', amount)}
      />
    )
  }

  return null
}
