import { normalizeSearchText } from '../utils/search'

/** Result groups in display order (people first, then the ledgers, then the rest). */
export const SEARCH_GROUPS = [
  { id: 'counterparties', label: 'طرف حساب', title: 'طرف حساب‌ها' },
  { id: 'records', label: 'تراکنش', title: 'تراکنش‌ها' },
  { id: 'checks', label: 'چک', title: 'چک‌ها' },
  { id: 'receivables', label: 'طلب', title: 'طلب‌ها' },
  { id: 'dang', label: 'بدهی', title: 'بدهی‌ها' },
  { id: 'installments', label: 'قسط', title: 'اقساط' },
  { id: 'treasury', label: 'صندوقچه', title: 'صندوقچه' },
  { id: 'reminders', label: 'یادآوری', title: 'یادآوری‌ها' },
  { id: 'vehicles', label: 'خودرو', title: 'خودروها' }
] as const

export type SearchGroupId = (typeof SEARCH_GROUPS)[number]['id']

/** Rows shown per group before «بیشتر». */
export const SEARCH_GROUP_LIMIT = 20

/** One searchable item of any module, with its haystack normalized once. */
export interface SearchEntry {
  group: SearchGroupId
  /** The id the module page highlights (record id, check id, goal id, asset id, …). */
  id: string
  /** Income/expense for records (the records page needs the type). */
  recordType?: 'income' | 'expense'
  title: string
  subtitle: string
  /** Signed for records (expense < 0); null when the item has no amount. */
  amount: number | null
  /** ISO date for the day badge; empty when the item has none. */
  date: string
  /** Normalized text the query is matched against. */
  text: string
  /** Absolute amounts a numeric query matches exactly. */
  amounts: number[]
  /** Email in «ثبت‌کننده» (shared spreadsheets show an avatar). */
  writer?: string
}

export interface SearchGroupResult {
  id: SearchGroupId
  label: string
  title: string
  /** All matches of the group; `items` is capped by the group's limit. */
  total: number
  items: SearchEntry[]
}

export interface SearchResults {
  total: number
  groups: SearchGroupResult[]
}

/** Normalized haystack of the given parts (empty ones skipped). */
export function searchText(...parts: (string | number | null | undefined)[]): string {
  return normalizeSearchText(parts.filter(part => part != null && part !== '').join(' '))
}

/**
 * The amount a query stands for: plain digits after normalization, so «۲٬۰۰۰٬۰۰۰»,
 * «2,000,000» and «2000000» are all 2000000. Null for anything else.
 */
export function parseAmountQuery(query: string): number | null {
  const normalized = normalizeSearchText(query).replace(/\s+/g, '')

  if (!/^\d+(\.\d+)?$/.test(normalized)) return null

  const amount = Number(normalized)

  return Number.isFinite(amount) && amount > 0 ? amount : null
}

function matches(entry: SearchEntry, tokens: string[], amount: number | null): boolean {
  if (amount != null && entry.amounts.includes(amount)) return true

  return tokens.every(token => entry.text.includes(token))
}

/**
 * Entries matching `query`, grouped in `SEARCH_GROUPS` order. Every word of the
 * query must appear (any order); a numeric query also matches amounts exactly.
 * Each group keeps its input order and is capped at `limits[group]` (default 20).
 */
export function searchEntries(
  entries: SearchEntry[],
  query: string,
  limits: Partial<Record<SearchGroupId, number>> = {}
): SearchResults {
  const normalized = normalizeSearchText(query)

  if (!normalized) return { total: 0, groups: [] }

  const tokens = normalized.split(' ')
  const amount = parseAmountQuery(normalized)
  const byGroup = new Map<SearchGroupId, SearchEntry[]>()

  for (const entry of entries) {
    if (!matches(entry, tokens, amount)) continue

    const list = byGroup.get(entry.group) ?? []

    list.push(entry)
    byGroup.set(entry.group, list)
  }

  const groups = SEARCH_GROUPS.flatMap(({ id, label, title }) => {
    const list = byGroup.get(id)

    if (!list?.length) return []

    const limit = limits[id] ?? SEARCH_GROUP_LIMIT

    return [{ id, label, title, total: list.length, items: list.slice(0, limit) }]
  })

  return { total: groups.reduce((sum, group) => sum + group.total, 0), groups }
}
