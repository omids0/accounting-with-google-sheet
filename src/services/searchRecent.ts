import { getItem, setItem } from './storage'
import { normalizeSearchText } from '../utils/search'

/** Per spreadsheet: `{ [spreadsheetId]: string[] }`, newest first; wiped with the account. */
export const SEARCH_RECENT_STORAGE_KEY = 'accounting_search_recent_v1'

export const SEARCH_RECENT_LIMIT = 5

type RecentStore = Record<string, string[]>

export function getRecentSearches(spreadsheetId: string | undefined): string[] {
  if (!spreadsheetId) return []

  const list = getItem<RecentStore>(SEARCH_RECENT_STORAGE_KEY)?.[spreadsheetId]

  return Array.isArray(list) ? list.slice(0, SEARCH_RECENT_LIMIT) : []
}

/** `list` with `query` moved to the front, de-duplicated by its normalized form, capped. */
export function pushRecentSearch(list: string[], query: string): string[] {
  const trimmed = query.trim().replace(/\s+/g, ' ')
  const key = normalizeSearchText(trimmed)

  if (!key) return list

  const rest = list.filter(item => normalizeSearchText(item) !== key)

  return [trimmed, ...rest].slice(0, SEARCH_RECENT_LIMIT)
}

/** Remembers `query` as the newest recent search; returns the updated list. */
export function saveRecentSearch(spreadsheetId: string | undefined, query: string): string[] {
  if (!spreadsheetId) return []

  const next = pushRecentSearch(getRecentSearches(spreadsheetId), query)
  const store = getItem<RecentStore>(SEARCH_RECENT_STORAGE_KEY) ?? {}

  setItem(SEARCH_RECENT_STORAGE_KEY, { ...store, [spreadsheetId]: next })

  return next
}
