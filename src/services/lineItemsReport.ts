import { addUnitPrice, bestUnitPrice, type UnitTotals } from './lineItemsUnitPrice'
import type { RecordInput } from './recordInputs'
import {
  getJalaliMonthKey,
  isDateInRange,
  listRecentJalaliMonthKeys,
  type DateRange
} from '../utils/dateRange'
import { getTodayIso } from '../utils/jalaliDate'
import { normalizeItemName } from '../utils/lineItems'

export type LineItemsReportType = 'income' | 'expense' | 'all'

export interface ItemStat {
  /** `normalizeItemName` of the name: the grouping key and the item page id. */
  key: string
  /** The spelling typed most often. */
  name: string
  count: number
  total: number
  average: number
  topCategory: string
  /** Price per unit («کیلو») when the notes carry quantities of one unit. */
  unitPrice?: { value: number; unit: string }
}

export interface LineItemsAggregate {
  items: ItemStat[]
  /** Amount of the records that have items. */
  withItemsTotal: number
  /** Amount of the records without items. */
  withoutItemsTotal: number
  /** Records that have items. */
  recordCount: number
  /** Item lines over those records. */
  itemCount: number
}

export interface PriceChange {
  key: string
  name: string
  from: number
  to: number
  unit: string
  /** Percent change, signed. */
  pct: number
}

/** A price must move this many percent to count as a change. */
const PRICE_CHANGE_MIN_PCT = 5

function mostFrequent(counts: Map<string, number>): string {
  let best = ''
  let bestCount = 0

  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  }

  return best
}

function bump(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1)
}

interface ItemAccumulator {
  count: number
  total: number
  spellings: Map<string, number>
  categories: Map<string, number>
  units: UnitTotals
}

function toStat(key: string, acc: ItemAccumulator): ItemStat {
  const stat: ItemStat = {
    key,
    name: mostFrequent(acc.spellings),
    count: acc.count,
    total: acc.total,
    average: acc.count ? acc.total / acc.count : 0,
    topCategory: mostFrequent(acc.categories)
  }

  const unitPrice = bestUnitPrice(acc.units)

  if (unitPrice) stat.unitPrice = unitPrice

  return stat
}

/** Items of the records in `range`, grouped by name across spellings, largest total first. */
export function aggregateLineItems(
  records: RecordInput[],
  range: DateRange,
  type: LineItemsReportType
): LineItemsAggregate {
  const groups = new Map<string, ItemAccumulator>()

  let withItemsTotal = 0
  let withoutItemsTotal = 0
  let recordCount = 0
  let itemCount = 0

  for (const record of records) {
    if (type !== 'all' && record.type !== type) continue
    if (!isDateInRange(record.date, range)) continue

    if (!record.items.length) {
      withoutItemsTotal += record.amount

      continue
    }

    withItemsTotal += record.amount
    recordCount += 1

    for (const item of record.items) {
      const key = normalizeItemName(item.name)

      if (!key) continue

      itemCount += 1

      const acc = groups.get(key) ?? {
        count: 0,
        total: 0,
        spellings: new Map(),
        categories: new Map(),
        units: new Map()
      }

      acc.count += 1
      acc.total += item.amount
      bump(acc.spellings, item.name.trim())
      if (record.category) bump(acc.categories, record.category)

      addUnitPrice(acc.units, item)

      groups.set(key, acc)
    }
  }

  const items = [...groups.entries()]
    .map(([key, acc]) => toStat(key, acc))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'fa'))

  return { items, withItemsTotal, withoutItemsTotal, recordCount, itemCount }
}

/** Items priced per the same unit in both periods whose unit price moved by 5% or more. */
export function priceChanges(current: ItemStat[], previous: ItemStat[]): PriceChange[] {
  const before = new Map(previous.map(item => [item.key, item]))

  const changes: PriceChange[] = []

  for (const item of current) {
    const old = before.get(item.key)

    if (!item.unitPrice || !old?.unitPrice) continue
    if (item.unitPrice.unit !== old.unitPrice.unit || old.unitPrice.value <= 0) continue

    const pct = ((item.unitPrice.value - old.unitPrice.value) / old.unitPrice.value) * 100

    if (Math.abs(pct) < PRICE_CHANGE_MIN_PCT) continue

    changes.push({
      key: item.key,
      name: item.name,
      from: old.unitPrice.value,
      to: item.unitPrice.value,
      unit: item.unitPrice.unit,
      pct
    })
  }

  return changes.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
}

/** Monthly totals of one item over the last `months` Jalali months, oldest first, zero-filled. */
export function itemHistory(
  records: RecordInput[],
  key: string,
  months = 12,
  today = getTodayIso()
): { month: string; total: number; count: number }[] {
  const history = listRecentJalaliMonthKeys(getJalaliMonthKey(today), months).map(month => ({
    month,
    total: 0,
    count: 0
  }))

  const byMonth = new Map(history.map(entry => [entry.month, entry]))

  for (const record of records) {
    const entry = record.date ? byMonth.get(getJalaliMonthKey(record.date)) : undefined

    if (!entry) continue

    for (const item of record.items) {
      if (normalizeItemName(item.name) !== key) continue
      entry.total += item.amount
      entry.count += 1
    }
  }

  return history
}

/** Other item keys that read as the same item: equal without spaces, or one inside the other. */
export function similarItemNames(allKeys: string[], key: string): string[] {
  const squeezed = key.replace(/\s+/g, '')

  return allKeys.filter(other => {
    if (other === key) return false

    const otherSqueezed = other.replace(/\s+/g, '')

    if (otherSqueezed === squeezed) return true

    const [short, long] =
      squeezed.length <= otherSqueezed.length
        ? [squeezed, otherSqueezed]
        : [otherSqueezed, squeezed]

    return short.length >= 3 && long.includes(short)
  })
}

/** One record that carries an item: what the item cost there and in what quantity. */
export interface ItemOccurrence {
  id: string
  type: RecordInput['type']
  date: string
  title: string
  recordAmount: number
  counterparty: string
  /** Sum of the item's lines in this record. */
  amount: number
  /** The notes of those lines («۲ کیلو»), joined. */
  quantity: string
}

/** The records that carry item `key`, newest first. */
export function itemOccurrences(records: RecordInput[], key: string): ItemOccurrence[] {
  const found: ItemOccurrence[] = []

  for (const record of records) {
    const lines = record.items.filter(item => normalizeItemName(item.name) === key)

    if (!lines.length) continue

    found.push({
      id: record.id,
      type: record.type,
      date: record.date,
      title: record.title,
      recordAmount: record.amount,
      counterparty: record.counterparty,
      amount: lines.reduce((sum, line) => sum + line.amount, 0),
      quantity: lines
        .map(line => line.note?.trim() ?? '')
        .filter(Boolean)
        .join(' + ')
    })
  }

  return found.sort((a, b) => b.date.localeCompare(a.date))
}

/** The counterparty that most of the occurrences name; '' when none does. */
export function topOccurrenceCounterparty(occurrences: ItemOccurrence[]): string {
  const counts = new Map<string, number>()

  for (const occurrence of occurrences) {
    if (occurrence.counterparty) bump(counts, occurrence.counterparty)
  }

  return mostFrequent(counts)
}
