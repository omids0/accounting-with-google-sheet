import { getUserEmail } from './auth'
import { setMemberSetting } from './buildingSettings'
import { rowsToGroups } from './categoryGroups'
import { getSettings } from './settings'
import { sharedRecordForm } from './sharedLinkRows'
import { CATEGORIES_SHEET, PERIOD_SETTINGS_SHEET } from './sheetNames'
import { isSpreadsheetAccessDeniedError } from './sheetsApi'
import { normalizeHeaderLabel } from './sheetsHeaders'
import { batchFetchSheetRangesFromApi } from './sheetsRows'
import { getSheetAllRows } from './spreadsheetStore'
import type { OutboxOperation } from './syncOutbox'
import { writeToWorkspace } from './workspaceBridge'
import { SHARED_LINK_FIELD_LABEL } from '../components/form/sharedFields'

/**
 * Change notices (spec «When the partner edits or deletes a copy»): a copy of a personal record
 * changed in the shared account by someone else leaves a row in the shared sheet's «تنظیمات دوره»
 * for the record's creator, `اعلان:<creatorEmail>:<noticeId>` = JSON. The creator's device reads its
 * own rows, then applies the change to the personal record or ignores it; both remove the row.
 */

export const SHARED_NOTICE_REFRESH_MS = 5 * 60 * 1000

const PREFIX = 'اعلان:'

export interface SharedNotice {
  /** The copy's «مرجع»: `share:<personalSpreadsheetId>:<personalRecordId>`. */
  recordRef: string
  field: 'amount' | 'title' | 'category' | 'split' | 'delete'
  old: string
  new: string
  by: string
  time: string
  kind: 'edit' | 'delete'
  /** The copy's title, for the banner (the shared sheet holds it anyway). */
  title?: string
}

export type StoredNotice = SharedNotice & { id: string }

const norm = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()

/**
 * Writes the notice for the copy's creator: only for a copy of a personal record (`share:` ref)
 * changed by someone else. Runs while the shared sheet is open (its member-row writer).
 */
export async function raiseNotice(
  sharedId: string,
  copy: { ref: string; creator: string },
  editor: string,
  change: Omit<SharedNotice, 'by' | 'time' | 'recordRef'>
): Promise<boolean> {
  const creator = norm(copy.creator)
  const by = norm(editor)

  if (!copy.ref.startsWith('share:') || !creator || creator === by) return false

  const notice: SharedNotice = {
    ...change,
    recordRef: copy.ref,
    by,
    time: new Date().toISOString()
  }

  await setMemberSetting(
    sharedId,
    `${PREFIX}${creator}:${crypto.randomUUID()}`,
    JSON.stringify(notice)
  )

  return true
}

function parseRow(row: string[], prefix: string): StoredNotice | null {
  const key = String(row[0] ?? '').trim()

  if (!key.toLowerCase().startsWith(prefix)) return null
  try {
    const notice = JSON.parse(String(row[1] ?? '')) as SharedNotice

    return notice?.recordRef ? { ...notice, id: key.slice(prefix.length) } : null
  } catch {
    return null
  }
}

const prefixOf = (email: string) => `${PREFIX}${norm(email)}:`

/** The last direct read of a shared sheet that is not open here. */
let fetched: { id: string; at: number; rows: string[][] } | null = null

/** A shared sheet this device cannot read (no Picker grant): never asked again this session. */
let denied = ''

const listeners = new Set<() => void>()

export function subscribeNotices(listener: () => void): () => void {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

const notify = () => listeners.forEach(listener => listener())

/** «تنظیمات دوره» of the shared sheet: the open mirror, else the last direct read. */
const rowsOf = (sharedId: string) =>
  getSheetAllRows(sharedId, PERIOD_SETTINGS_SHEET) ?? (fetched?.id === sharedId ? fetched.rows : [])

export function readNotices(sharedId: string, email: string): StoredNotice[] {
  const prefix = prefixOf(email)

  return rowsOf(sharedId).flatMap(row => parseRow(row, prefix) ?? [])
}

/** One direct read at most every `SHARED_NOTICE_REFRESH_MS`; none while the sheet is open here. */
export async function refreshNotices(sharedId: string): Promise<void> {
  const now = Date.now()
  const offline = typeof navigator !== 'undefined' && !navigator.onLine

  if (denied === sharedId || offline || getSheetAllRows(sharedId, PERIOD_SETTINGS_SHEET)) return
  if (fetched?.id === sharedId && now - fetched.at < SHARED_NOTICE_REFRESH_MS) return

  // Stamped first: a second caller in the meantime does not read again.
  fetched = { id: sharedId, at: now, rows: fetched?.id === sharedId ? fetched.rows : [] }
  try {
    const read = await batchFetchSheetRangesFromApi(sharedId, [PERIOD_SETTINGS_SHEET])

    fetched = { id: sharedId, at: now, rows: read.get(PERIOD_SETTINGS_SHEET) ?? [] }
    notify()
  } catch (err) {
    if (isSpreadsheetAccessDeniedError(err)) denied = sharedId
  }
}

/** Deletes this user's notice rows that match (bottom row first); `rows` = a read already made. */
export async function removeNotices(
  sharedId: string,
  match: (notice: StoredNotice) => boolean,
  rows?: string[][]
): Promise<void> {
  const all =
    rows ??
    getSheetAllRows(sharedId, PERIOD_SETTINGS_SHEET) ??
    (await batchFetchSheetRangesFromApi(sharedId, [PERIOD_SETTINGS_SHEET])).get(
      PERIOD_SETTINGS_SHEET
    ) ??
    []
  const prefix = prefixOf(getUserEmail() ?? '')
  const operations: OutboxOperation[] = all
    .flatMap((row, index) => {
      const notice = parseRow(row, prefix)

      return notice && match(notice)
        ? [
            {
              type: 'delete' as const,
              sheetName: PERIOD_SETTINGS_SHEET,
              rowNumber: index + 1,
              expectedRow: row
            }
          ]
        : []
    })
    .reverse()
  const gone = new Set(
    operations.map(operation => 'expectedRow' in operation && operation.expectedRow?.[0])
  )

  if (fetched?.id === sharedId)
    fetched = { ...fetched, rows: fetched.rows.filter(row => !gone.has(row[0])) }
  notify()
  if (operations.length) await writeToWorkspace(sharedId, operations)
}

export const dismissNotice = (sharedId: string, noticeId: string): Promise<void> =>
  removeNotices(sharedId, notice => notice.id === noticeId)

const TYPES = ['expense', 'income'] as const

const tabOf = (type: (typeof TYPES)[number]) =>
  getSettings()?.forms.find(form => form.type === type)?.sheetName ??
  sharedRecordForm(type).sheetName

/**
 * Writes the notice's new value to the PERSONAL record, nothing else: a category only when the
 * personal list has that exact name, a delete only clears the record's shared marker. A split
 * (the personal record has none) or a record that is gone is 'skipped'.
 */
export async function applyNotice(notice: SharedNotice): Promise<'applied' | 'skipped'> {
  const [, personalId = '', recordId = ''] = notice.recordRef.split(':')

  if (notice.field === 'split' || !personalId || !recordId) return 'skipped'

  const tabs = [...TYPES.map(tabOf), CATEGORIES_SHEET]
  const missing = tabs.filter(tab => !getSheetAllRows(personalId, tab))
  const read = missing.length ? await batchFetchSheetRangesFromApi(personalId, missing) : null
  const rowsOf = (tab: string) => getSheetAllRows(personalId, tab) ?? read?.get(tab) ?? []
  const at = TYPES.findIndex(type => rowsOf(tabOf(type)).some(row => row[0] === recordId))

  if (at < 0) return 'skipped'

  const type = TYPES[at]
  const rows = rowsOf(tabOf(type))
  const index = rows.findIndex((row, number) => number > 0 && row[0] === recordId)
  const label =
    notice.field === 'delete'
      ? SHARED_LINK_FIELD_LABEL
      : sharedRecordForm(type).fields.find(field => field.id === notice.field)?.label
  const column = (rows[0] ?? [])
    .map(normalizeHeaderLabel)
    .indexOf(normalizeHeaderLabel(label ?? ''))
  const value = notice.field === 'delete' ? '' : notice.new

  if (index < 0 || column < 0) return 'skipped'
  if (
    notice.field === 'category' &&
    !rowsToGroups(rowsOf(CATEGORIES_SHEET))[type].includes(value)
  ) {
    return 'skipped'
  }

  const width = Math.max(rows[0].length, rows[index].length)
  const row = Array.from({ length: width }, (_, cell) => rows[index][cell] ?? '')

  row[column] = value
  await writeToWorkspace(personalId, {
    type: 'update',
    sheetName: tabOf(type),
    rowNumber: index + 1,
    expectedRow: rows[index],
    row
  })

  return 'applied'
}
