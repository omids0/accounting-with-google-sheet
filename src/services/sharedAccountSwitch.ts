import { getUserEmail } from './auth'
import { memberHasPermission, parseMembers } from './buildingRoles'
import { unshareFile } from './driveShare'
import { registryOf, type WorkspaceMember } from './memberRegistry'
import { getSpreadsheets } from './settings'
import { PERIOD_SETTINGS_SHEET } from './sheetNames'
import { batchFetchSheetRangesFromApi } from './sheetsRows'
import { getSheetDataRows } from './spreadsheetStore'
import { getItem, setItem } from './storage'
import { isSharedEntry } from './workspace'
import type { SpreadsheetEntry } from '../types'

/**
 * «خاموش کردن» of the shared account on this device: `{ [spreadsheetId]: true }`, per device and
 * listed in `ACCOUNT_KEYS` (localDataWipe.ts). The sheet, its registry entry and the partner's
 * access stay; the account only leaves «فضاهای من».
 */
export const SHARED_HIDDEN_KEY = 'accounting_shared_hidden_v1'

type HiddenStore = Record<string, true>

function readHidden(): HiddenStore {
  return getItem<HiddenStore>(SHARED_HIDDEN_KEY) ?? {}
}

export function isSharedAccountHidden(spreadsheetId: string): boolean {
  return spreadsheetId in readHidden()
}

export function hideSharedAccount(spreadsheetId: string): void {
  setItem(SHARED_HIDDEN_KEY, { ...readHidden(), [spreadsheetId]: true })
}

export function showSharedAccount(spreadsheetId: string): void {
  const rest = { ...readHidden() }

  delete rest[spreadsheetId]
  setItem(SHARED_HIDDEN_KEY, rest)
}

/** The shared account this device has registered, hidden or not. */
export function registeredSharedAccount(): SpreadsheetEntry | null {
  return getSpreadsheets().find(isSharedEntry) ?? null
}

/** The registered shared account unless it was turned off on this device. */
export function visibleSharedAccount(): SpreadsheetEntry | null {
  const entry = registeredSharedAccount()

  return entry && !isSharedAccountHidden(entry.id) ? entry : null
}

const MEMBERS_TTL_MS = 5 * 60_000

const fetchedMembers = new Map<string, { at: number; list: WorkspaceMember[] }>()

/**
 * The members of a shared account that is not the open spreadsheet, as far as this device
 * already knows them: the loaded sheet, else a read made within the last minutes. Null = unknown.
 */
export function knownSharedMembers(spreadsheetId: string, fresh = false): WorkspaceMember[] | null {
  const rows = getSheetDataRows(spreadsheetId, PERIOD_SETTINGS_SHEET)

  if (rows) return parseMembers(rows, 'shared')

  const cached = fetchedMembers.get(spreadsheetId)

  return !fresh && cached && Date.now() - cached.at < MEMBERS_TTL_MS ? cached.list : null
}

/**
 * Like `knownSharedMembers`, reading «تنظیمات دوره» from Sheets when nothing is known yet (or,
 * with `fresh`, when only an earlier read is: someone invited since must not be missed).
 */
export async function loadSharedMembers(
  spreadsheetId: string,
  fresh = false
): Promise<WorkspaceMember[]> {
  const known = knownSharedMembers(spreadsheetId, fresh)

  if (known) return known

  const fetched = await batchFetchSheetRangesFromApi(spreadsheetId, [PERIOD_SETTINGS_SHEET])

  const list = parseMembers((fetched.get(PERIOD_SETTINGS_SHEET) ?? []).slice(1), 'shared')

  fetchedMembers.set(spreadsheetId, { at: Date.now(), list })

  return list
}

/** Whether the signed-in user may manage the members: the owner of the shared account. */
export function isSharedOwner(list: WorkspaceMember[]): boolean {
  return memberHasPermission(
    list,
    getUserEmail(),
    registryOf('shared').settingsPermission,
    'shared'
  )
}

/**
 * «دسترسی همه قطع شود»: takes every Drive share back except the owner's, then hides the account.
 * The file stays in the owner's Drive. Only a holder of `members` (the owner) may; a share Drive
 * refuses stops the run before the account is hidden, so it can be tried again.
 */
export async function revokeAllSharedAccess(spreadsheetId: string): Promise<void> {
  const list = await loadSharedMembers(spreadsheetId, true)

  if (!isSharedOwner(list)) {
    throw new Error('فقط مالک حساب مشترک می‌تواند دسترسی‌ها را قطع کند.')
  }

  const { ownerRole } = registryOf('shared')

  for (const member of list.filter(item => item.role !== ownerRole)) {
    await unshareFile(spreadsheetId, member.email)
  }

  fetchedMembers.delete(spreadsheetId)
  hideSharedAccount(spreadsheetId)
}
