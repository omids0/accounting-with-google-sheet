import { createSearchTextBuilder, joinParts, type SearchEntry } from './globalSearch'
import type { SearchSources } from './globalSearchEntries'
import { collatedText, compareCollated } from '../utils/collatedText'
import { formatJalaliMonthLabel } from '../utils/dateRange'
import { isoToJalali } from '../utils/jalaliDate'
import { parseLineItems } from '../utils/lineItems'
import { toPersianDigits } from '../utils/normalizeDigits'
import { parseNumeric } from '../utils/parseNumeric'
import { normalizeSheetDate } from '../utils/sheetValues'

/**
 * Record fields that are ids, flags or raw JSON, not words a user would type. The
 * counterparty stays searchable; the item names are indexed from `lineItems` below.
 */
const RECORD_SKIP_FIELDS = new Set(['amount', 'walletAccount', 'walletApply', 'lineItems'])

/** «مهر ۱۴۰۵» of an ISO date; empty when there is no date. */
export function monthLabelOf(iso: string): string {
  if (!iso) return ''

  const { year, month } = isoToJalali(iso)

  return toPersianDigits(formatJalaliMonthLabel(`${year}-${String(month).padStart(2, '0')}`))
}

/**
 * Records are the bulk of the index (tens of thousands of rows), so this loop keeps its work per
 * row small: the month label is built once per distinct date, every distinct word is normalized
 * once, and the newest-first sort compares precomputed keys instead of calling localeCompare.
 */
export function recordEntries(sources: SearchSources): SearchEntry[] {
  const accounts = new Map(sources.accounts.map(account => [account.id, account.title]))
  const buildText = createSearchTextBuilder()
  const monthLabels = new Map<string, string>()
  const monthOf = (date: string) => {
    let label = monthLabels.get(date)

    if (label === undefined) {
      label = monthLabelOf(date)
      monthLabels.set(date, label)
    }

    return label
  }

  const entries = sources.records.map(record => {
    const values = record.values
    const date = normalizeSheetDate(values[record.dateField])
    const amount = Math.abs(parseNumeric(values.amount))
    const typeLabel = record.type === 'income' ? 'درآمد' : 'هزینه'
    const category = [values.category, values.subCategory].filter(Boolean).join(' / ')
    const month = monthOf(date)
    const itemNames = parseLineItems(values.lineItems).map(item => item.name)
    const words: string[] = []

    for (const key in values) {
      if (key !== record.dateField && !RECORD_SKIP_FIELDS.has(key)) words.push(values[key])
    }

    const entry: SearchEntry = {
      group: 'records',
      id: record.id,
      recordType: record.type,
      title: values.title || values.category || '—',
      subtitle: joinParts(
        typeLabel,
        category,
        month,
        itemNames.length ? `☰ ${toPersianDigits(String(itemNames.length))}` : ''
      ),
      amount: record.type === 'expense' ? -amount : amount,
      date,
      text: buildText(
        ...words,
        ...itemNames,
        typeLabel,
        accounts.get(values.walletAccount ?? ''),
        month
      ),
      amounts: [amount],
      writer: record.writer
    }

    return { entry, sortKey: collatedText(date) }
  })

  // Array.sort is stable, so equal dates keep their sheet order exactly as before.
  entries.sort((a, b) => compareCollated(b.sortKey, a.sortKey))

  return entries.map(item => item.entry)
}
