import { getItem, setItem } from './storage'

/** Per spreadsheet and year: `{ [spreadsheetId]: { [year]: CloseYearState } }`; wiped with the account. */
export const CLOSE_YEAR_STORAGE_KEY = 'accounting_close_year_v1'

export interface CloseYearState {
  /** «نقدی را خودت تأیید کن» ticked. */
  cashConfirmed?: boolean
  /** When «آرشیو کن» last moved rows of that year (ms). */
  archivedAt?: number
}

type CloseYearStore = Record<string, Record<string, CloseYearState>>

const listeners = new Set<() => void>()

export function subscribeCloseYearState(listener: () => void): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function getCloseYearState(spreadsheetId: string, year: number): CloseYearState {
  return (getItem<CloseYearStore>(CLOSE_YEAR_STORAGE_KEY) ?? {})[spreadsheetId]?.[year] ?? {}
}

export function patchCloseYearState(
  spreadsheetId: string,
  year: number,
  patch: CloseYearState
): void {
  const store = getItem<CloseYearStore>(CLOSE_YEAR_STORAGE_KEY) ?? {}
  const years = store[spreadsheetId] ?? {}

  try {
    setItem(CLOSE_YEAR_STORAGE_KEY, {
      ...store,
      [spreadsheetId]: { ...years, [year]: { ...years[year], ...patch } }
    })
  } catch {
    // Private mode: the tick is lost on reload; harmless.
  }
  listeners.forEach(listener => listener())
}
