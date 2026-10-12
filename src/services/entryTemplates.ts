import { parseCreatedAtMs } from './recordDuplicates'
import { getItem, setItem } from './storage'
import { SUBCATEGORY_FIELD_ID, WALLET_ACCOUNT_FIELD_ID } from '../components/form/fieldUtils'
import { addJalaliMonths, isoToJalali } from '../utils/jalaliDate'
import { parseNumeric } from '../utils/parseNumeric'
import { normalizeSheetDate } from '../utils/sheetValues'

/** Per spreadsheet: `{ [spreadsheetId]: EntryTemplatePrefs }`; wiped with the account. */
export const ENTRY_TEMPLATES_STORAGE_KEY = 'accounting_entry_templates_v1'

/** A group becomes a chip once it has this many records in the window. */
export const TEMPLATE_MIN_COUNT = 3
export const TEMPLATE_MAX_CHIPS = 6
export const TEMPLATE_WINDOW_MONTHS = 6

/** Keyed by `templateKey`: pinned chips come first, hidden ones never show. */
export interface EntryTemplatePrefs {
  pinned: string[]
  hidden: string[]
}

/** «پرتکرار»: one category + subcategory + wallet account the user records again and again. */
export interface EntryTemplate {
  key: string
  category: string
  subCategory: string
  accountId: string
  count: number
  /** Title and amount of the newest record of the group. */
  title: string
  amount: number
  pinned: boolean
}

export interface TemplateSourceRecord {
  createdAt?: string
  values: Record<string, string>
}

export function templateKey(category: string, subCategory: string, accountId: string): string {
  return [category, subCategory, accountId].join('|')
}

interface Group extends EntryTemplate {
  lastDate: string
  lastCreated: number
}

/** First day counted: the same day six Jalali months ago. */
export function templateWindowStart(todayIso: string): string {
  return addJalaliMonths(todayIso, -TEMPLATE_WINDOW_MONTHS, isoToJalali(todayIso).day)
}

/**
 * Every group with at least three records in the last six months, most used first
 * (ties: the most recently used). Hidden and pinned flags are not applied here.
 */
export function collectTemplateGroups(
  records: TemplateSourceRecord[],
  todayIso: string,
  dateFieldId = 'date'
): EntryTemplate[] {
  const start = templateWindowStart(todayIso)
  const groups = new Map<string, Group>()

  records.forEach(record => {
    const date = normalizeSheetDate(record.values[dateFieldId] ?? '')
    const category = (record.values.category ?? '').trim()

    if (!category || !date || date < start || date > todayIso) return

    const subCategory = (record.values[SUBCATEGORY_FIELD_ID] ?? '').trim()
    const accountId = (record.values[WALLET_ACCOUNT_FIELD_ID] ?? '').trim()
    const key = templateKey(category, subCategory, accountId)
    const created = parseCreatedAtMs(record.createdAt ?? '') ?? 0
    const group = groups.get(key)
    const latest =
      group && (date < group.lastDate || (date === group.lastDate && created < group.lastCreated))
        ? group
        : {
            title: (record.values.title ?? '').trim(),
            amount: parseNumeric(record.values.amount),
            lastDate: date,
            lastCreated: created
          }

    groups.set(key, {
      key,
      category,
      subCategory,
      accountId,
      count: (group?.count ?? 0) + 1,
      pinned: false,
      title: latest.title,
      amount: latest.amount,
      lastDate: latest.lastDate,
      lastCreated: latest.lastCreated
    })
  })

  return [...groups.values()]
    .filter(group => group.count >= TEMPLATE_MIN_COUNT)
    .sort((a, b) => b.count - a.count || b.lastDate.localeCompare(a.lastDate))
    .map(({ lastDate: _d, lastCreated: _c, ...template }) => template)
}

/** The chip row: hidden removed, pinned first (in pin order), at most six. */
export function pickEntryTemplates(
  groups: EntryTemplate[],
  prefs: EntryTemplatePrefs
): EntryTemplate[] {
  const hidden = new Set(prefs.hidden)
  const visible = groups.filter(group => !hidden.has(group.key))
  const pinned = prefs.pinned.flatMap(key => {
    const group = visible.find(item => item.key === key)

    return group ? [{ ...group, pinned: true }] : []
  })
  const rest = visible.filter(group => !prefs.pinned.includes(group.key))

  return [...pinned, ...rest].slice(0, TEMPLATE_MAX_CHIPS)
}

const EMPTY_PREFS: EntryTemplatePrefs = { pinned: [], hidden: [] }

export function getEntryTemplatePrefs(spreadsheetId: string | undefined): EntryTemplatePrefs {
  if (!spreadsheetId) return EMPTY_PREFS

  return (
    getItem<Record<string, EntryTemplatePrefs>>(ENTRY_TEMPLATES_STORAGE_KEY)?.[spreadsheetId] ??
    EMPTY_PREFS
  )
}

export function setEntryTemplatePrefs(spreadsheetId: string, prefs: EntryTemplatePrefs): void {
  const store = getItem<Record<string, EntryTemplatePrefs>>(ENTRY_TEMPLATES_STORAGE_KEY) ?? {}

  try {
    setItem(ENTRY_TEMPLATES_STORAGE_KEY, { ...store, [spreadsheetId]: prefs })
  } catch {
    // Private mode: the choice lasts until the page closes.
  }
}
