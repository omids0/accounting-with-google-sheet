import type { DataTableColumn } from './DataTable'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import MoneyText from '../MoneyText'
import { dangCheckboxClass } from '../ui/featureCardStyles'
import WriterAvatar from '../WriterAvatar'

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
    cell: row => <MoneyText amount={get(row)} />
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

/** «ثبت‌کننده» on a shared spreadsheet: avatar and name; pages add it only while shared. */
export function writerColumn<T>(get: (row: T) => string | undefined): DataTableColumn<T> {
  return {
    id: 'writer',
    header: 'ثبت‌کننده',
    sortValue: get,
    className: 'whitespace-nowrap',
    cell: row => <WriterAvatar email={get(row)} withName="plain" />
  }
}
