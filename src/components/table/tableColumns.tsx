import type { DataTableColumn } from './DataTable'
import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { dangCheckboxClass } from '../ui/featureCardStyles'

/** Column builders shared by the desktop table views; pages compose them into a config. */

export function textColumn<T>(
  id: string,
  header: string,
  get: (row: T) => string | undefined,
  strong = false
): DataTableColumn<T> {
  return {
    id,
    header,
    cell: row => get(row) || '—',
    sortValue: get,
    className: strong ? 'font-semibold' : undefined
  }
}

/** ISO dates shown in Persian; sorted chronologically. */
export function dateColumn<T>(
  id: string,
  header: string,
  get: (row: T) => string | undefined
): DataTableColumn<T> {
  return {
    id,
    header,
    cell: row => {
      const value = get(row)

      return value ? formatIsoDatePersian(value) : '—'
    },
    sortValue: get,
    className: 'whitespace-nowrap'
  }
}

/** Amounts: end-aligned, largest first on the first click. */
export function moneyColumn<T>(
  id: string,
  header: string,
  get: (row: T) => number
): DataTableColumn<T> {
  return {
    id,
    header,
    numeric: true,
    sortFirst: 'desc',
    sortValue: get,
    cell: row => formatMoney(get(row))
  }
}

/** The paid / done checkbox of a card, as the first column. */
export function checkboxColumn<T>({
  header,
  checked,
  disabled,
  label,
  onChange
}: {
  header: string
  checked: (row: T) => boolean
  disabled?: (row: T) => boolean
  label: (row: T) => string
  onChange: (row: T, checked: boolean) => void
}): DataTableColumn<T> {
  return {
    id: 'check',
    header,
    hideHeader: true,
    className: 'w-px',
    cell: row => (
      <input
        type="checkbox"
        className={dangCheckboxClass}
        checked={checked(row)}
        disabled={disabled?.(row)}
        aria-label={label(row)}
        onChange={event => onChange(row, event.target.checked)}
      />
    )
  }
}
