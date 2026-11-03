import type { ActivityEntry } from '../../services/activityLog'
import { parseTrail } from '../../services/activityTrail'
import type { CustomForm, FieldConfig } from '../../types'
import { formatPersianNumber } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { toPersianDigits } from '../../utils/normalizeDigits'
import { parseNumeric } from '../../utils/parseNumeric'
import { WALLET_ACCOUNT_FIELD_ID } from '../form/fieldUtils'

/** One changed field of a log row, ready to show: «مبلغ: ۸۰۰٬۰۰۰ ← ۸۵۰٬۰۰۰». */
export interface TrailLine {
  id: string
  label: string
  from: string
  to: string
}

export type AccountName = (accountId: string) => string

/** A stored value as the person reads it: Persian digits, a Jalali date, the account's name. */
export function formatTrailValue(
  field: Pick<FieldConfig, 'id' | 'type'> | undefined,
  value: string,
  accountName: AccountName
): string {
  if (!value.trim()) return '—'
  if (field?.id === WALLET_ACCOUNT_FIELD_ID) return accountName(value) || '—'
  if (field?.type === 'date') return formatIsoDatePersian(value)
  if (field?.type === 'number' || field?.id === 'amount') {
    const amount = parseNumeric(value)

    return Number.isFinite(amount) ? formatPersianNumber(amount) : toPersianDigits(value)
  }

  return toPersianDigits(value)
}

/** The «قبل ← بعد» lines of an edit row; [] for a row without a trail or a delete. */
export function trailLines(
  entry: ActivityEntry,
  forms: readonly CustomForm[],
  accountName: AccountName
): TrailLine[] {
  const trail = parseTrail(entry)

  if (!trail) return []

  const fields = forms.find(form => form.id === trail.formId)?.fields ?? []

  return Object.keys(trail.after).map(id => {
    const field = fields.find(item => item.id === id)

    return {
      id,
      label: field?.label ?? id,
      from: formatTrailValue(field, trail.before[id] ?? '', accountName),
      to: formatTrailValue(field, trail.after[id], accountName)
    }
  })
}
