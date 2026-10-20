import { setPeriodSetting } from './periodSettings'
import { getSettings } from './settings'
import { PERIOD_SETTINGS_SHEET } from './sheetNames'
import { getSheetDataRows } from './spreadsheetStore'

/**
 * The two lists a building manager edits: expense kinds and payers. Rows `فهرست:<id>` of
 * «تنظیمات دوره» hold the JSON; without a row the defaults apply. The `value` key never changes
 * (records store it), so a value can be renamed, hidden and reordered but never deleted.
 */
export type ManagedListId = 'EXPENSE_KINDS' | 'EXPENSE_PAYERS'

/** Who the unit's share of an expense of this kind is addressed to. */
export type ChargeTo = 'resident' | 'owner'

export interface ManagedItem {
  value: string
  label: string
  /** Kinds only: «سهم به نام». */
  chargeTo?: ChargeTo
  hidden?: boolean
}

export const MANAGED_LIST_ROW_PREFIX = 'فهرست:'

/** The payer key of the fund; every other payer creates a dang to that person. */
export const FUND_PAYER = 'fund'

export const MANAGER_PAYER = 'manager'

export const DEFAULT_MANAGED_LISTS: Record<ManagedListId, ManagedItem[]> = {
  EXPENSE_KINDS: [
    { value: 'current', label: 'جاری', chargeTo: 'resident' },
    { value: 'capital', label: 'عمرانی', chargeTo: 'owner' }
  ],
  EXPENSE_PAYERS: [
    { value: FUND_PAYER, label: 'صندوق' },
    { value: MANAGER_PAYER, label: 'مدیر' }
  ]
}

function isItem(value: unknown): value is ManagedItem {
  const item = value as ManagedItem | null

  return !!item && typeof item.value === 'string' && !!item.value && typeof item.label === 'string'
}

export function parseManagedList(raw: string, id: ManagedListId): ManagedItem[] {
  try {
    const parsed = JSON.parse(raw) as unknown

    if (Array.isArray(parsed)) {
      const items = parsed.filter(isItem)

      if (items.length) return items
    }
  } catch {
    // Falls through to the defaults.
  }

  return DEFAULT_MANAGED_LISTS[id].map(item => ({ ...item }))
}

/** The list as the active (or given) spreadsheet's mirror has it. */
export function getManagedList(
  id: ManagedListId,
  spreadsheetId = getSettings()?.spreadsheetId ?? ''
): ManagedItem[] {
  const key = MANAGED_LIST_ROW_PREFIX + id

  const row = (getSheetDataRows(spreadsheetId, PERIOD_SETTINGS_SHEET) ?? []).find(
    cells => String(cells[0] ?? '').trim() === key
  )

  return parseManagedList(String(row?.[1] ?? ''), id)
}

export async function saveManagedList(
  spreadsheetId: string,
  id: ManagedListId,
  items: ManagedItem[]
): Promise<void> {
  await setPeriodSetting(spreadsheetId, MANAGED_LIST_ROW_PREFIX + id, JSON.stringify(items))
}

/** What the pickers offer: hidden values stay on old records but cannot be chosen again. */
export function visibleItems(items: ManagedItem[], keepValue = ''): ManagedItem[] {
  return items.filter(item => !item.hidden || item.value === keepValue)
}

export function labelOfItem(items: ManagedItem[], value: string): string {
  return items.find(item => item.value === value)?.label ?? value
}

function newKey(): string {
  return `k${crypto.randomUUID().slice(0, 8)}`
}

/** Appends a value; a blank or repeated label changes nothing. */
export function addManagedItem(
  items: ManagedItem[],
  label: string,
  extra: Pick<ManagedItem, 'chargeTo'> = {},
  makeKey: () => string = newKey
): ManagedItem[] {
  const name = label.trim()

  if (!name || items.some(item => item.label === name)) return items

  return [...items, { value: makeKey(), label: name, ...extra }]
}

/** Renames or re-targets a value; its key stays, so old records keep resolving. */
export function updateManagedItem(
  items: ManagedItem[],
  value: string,
  patch: Partial<Pick<ManagedItem, 'label' | 'chargeTo'>>
): ManagedItem[] {
  const label = patch.label?.trim()

  if (
    patch.label !== undefined &&
    (!label || items.some(i => i.value !== value && i.label === label))
  )
    return items

  return items.map(item =>
    item.value === value ? { ...item, ...patch, ...(label ? { label } : {}) } : item
  )
}

/** Hides or shows a value. The last visible one stays: a picker is never empty. */
export function setManagedItemHidden(
  items: ManagedItem[],
  value: string,
  hidden: boolean
): ManagedItem[] {
  if (hidden && items.filter(item => !item.hidden && item.value !== value).length === 0) {
    return items
  }

  return items.map(item => (item.value === value ? { ...item, hidden } : item))
}

export function moveManagedItem(items: ManagedItem[], from: number, to: number): ManagedItem[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items

  const next = [...items]

  next.splice(to, 0, next.splice(from, 1)[0])

  return next
}
