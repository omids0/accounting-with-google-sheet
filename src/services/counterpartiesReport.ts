import type { LineItemsReportType } from './lineItemsReport'
import type { RecordInput } from './recordInputs'
import { isDateInRange, type DateRange } from '../utils/dateRange'

export interface CounterpartyStat {
  name: string
  count: number
  total: number
  /** Share (0..1) of the period's amount that names a counterparty. */
  share: number
  topCategory: string
}

export interface CounterpartiesAggregate {
  rows: CounterpartyStat[]
  /** Amount of the records that name a counterparty. */
  withTotal: number
  /** Amount of the records that name none. */
  withoutTotal: number
}

function topKey(counts: Map<string, number>): string {
  let best = ''
  let bestCount = 0

  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key
      bestCount = count
    }
  }

  return best
}

/** Totals per counterparty of the records in `range`, largest first. */
export function aggregateByCounterparty(
  records: RecordInput[],
  range: DateRange,
  type: LineItemsReportType
): CounterpartiesAggregate {
  const groups = new Map<
    string,
    { count: number; total: number; categories: Map<string, number> }
  >()

  let withoutTotal = 0
  let withTotal = 0

  for (const record of records) {
    if (type !== 'all' && record.type !== type) continue
    if (!isDateInRange(record.date, range)) continue

    if (!record.counterparty) {
      withoutTotal += record.amount

      continue
    }

    withTotal += record.amount

    const group = groups.get(record.counterparty) ?? {
      count: 0,
      total: 0,
      categories: new Map<string, number>()
    }

    group.count += 1
    group.total += record.amount
    if (record.category) {
      group.categories.set(record.category, (group.categories.get(record.category) ?? 0) + 1)
    }
    groups.set(record.counterparty, group)
  }

  const rows = [...groups.entries()]
    .map(([name, group]) => ({
      name,
      count: group.count,
      total: group.total,
      share: withTotal > 0 ? group.total / withTotal : 0,
      topCategory: topKey(group.categories)
    }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'fa'))

  return { rows, withTotal, withoutTotal }
}
