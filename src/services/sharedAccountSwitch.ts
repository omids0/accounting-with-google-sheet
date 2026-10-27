import { getUserEmail } from './auth'
import { memberHasPermission, parseMembers } from './buildingRoles'
import { listSharedEmails, unshareFile } from './driveShare'
import { registryOf, type WorkspaceMember } from './memberRegistry'
import { getSettings, getSpreadsheets, saveSettings } from './settings'
import { PERIOD_SETTINGS_SHEET } from './sheetNames'
import { batchFetchSheetRangesFromApi } from './sheetsRows'
import { getSheetDataRows } from './spreadsheetStore'
import { getItem, setItem } from './storage'
import { isSharedAccountHidden, isSharedEntry, SHARED_HIDDEN_KEY } from './workspace'
import type { SpreadsheetEntry } from '../types'

// Read by the personal forms' tick too, so the key lives in the small workspace module.
export { isSharedAccountHidden, SHARED_HIDDEN_KEY }

type HiddenStore = Record<string, true>

function readHidden(): HiddenStore {
  return getItem<HiddenStore>(SHARED_HIDDEN_KEY) ?? {}
}

export function hideSharedAccount(spreadsheetId: string): void {
  setItem(SHARED_HIDDEN_KEY, { ...readHidden(), [spreadsheetId]: true })
}

export function showSharedAccount(spreadsheetId: string): void {
  const rest = { ...readHidden() }

  delete rest[spreadsheetId]
  setItem(SHARED_HIDDEN_KEY, rest)
}

/**
 * «ترک این فضا»: the account leaves this device's registry (and its «پنهان» flag), so
 * `hasSharedAccount()` is false and «فضاهای من» offers «راه‌اندازی» / «اتصال» again. Turning it
 * off («فقط از منوی من پنهان شود») never calls this: that keeps the registration.
 */
export function forgetSharedAccount(spreadsheetId: string): void {
  const settings = getSettings()

  if (settings) {
    saveSettings({
      ...settings,
      spreadsheets: settings.spreadsheets?.filter(entry => entry.id !== spreadsheetId)
    })
  }
  showSharedAccount(spreadsheetId)
  fetchedMembers.delete(spreadsheetId)
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

/**
 * Whether the signed-in user is the owner of the shared account: the owner role AND the right to
 * manage members. A partner a member override gave `members` is not the owner.
 */
export function isSharedOwner(list: WorkspaceMember[]): boolean {
  const { ownerRole, settingsPermission } = registryOf('shared')

  const email = (getUserEmail() ?? '').trim().toLowerCase()

  return (
    list.find(member => member.email === email)?.role === ownerRole &&
    memberHasPermission(list, email, settingsPermission, 'shared')
  )
}

/**
 * «دسترسی همه قطع شود»: takes every Drive share back except the owner's, then hides the account.
 * The list comes from Drive's own permissions (the source of truth for access: an invitation whose
 * role row has not been written yet still has access), plus the members of the sheet. The file
 * stays in the owner's Drive. Only the owner may; a share Drive refuses stops the run before the
 * account is hidden, so it can be tried again.
 */
export async function revokeAllSharedAccess(spreadsheetId: string): Promise<void> {
  const list = await loadSharedMembers(spreadsheetId, true)

  if (!isSharedOwner(list)) {
    throw new Error('فقط مالک حساب مشترک می‌تواند دسترسی‌ها را قطع کند.')
  }

  const { ownerRole } = registryOf('shared')

  const owners = new Set(list.filter(item => item.role === ownerRole).map(item => item.email))

  const everyone = new Set([
    ...(await listSharedEmails(spreadsheetId)),
    ...list.map(member => member.email)
  ])

  for (const email of everyone) {
    if (!owners.has(email)) await unshareFile(spreadsheetId, email)
  }

  fetchedMembers.delete(spreadsheetId)
  hideSharedAccount(spreadsheetId)
}
