import { isSpreadsheetAccessDeniedError } from './sheetsApi'
import { SpreadsheetNoAccessError } from './spreadsheetAccess'
import { getItem, removeItem, setItem } from './storage'
import { isSharedEntry, sharedSpreadsheetId } from './workspace'
import type { SpreadsheetEntry } from '../types'

/**
 * Said when the shared account's file cannot be opened from this device. Google answers the same
 * way for a removed member and for a device that never got the file's permission, so the words
 * name both.
 */
export const SHARED_NO_ACCESS_MESSAGE =
  'به این حساب مشترک دسترسی نداری. شاید مالک تو را حذف کرده یا این دستگاه اجازه ندارد.'

/** The same words for the start screen, which names the account. */
export const sharedNoAccessNamed = (name: string) =>
  `به حساب مشترک «${name}» دسترسی نداری. شاید مالک تو را حذف کرده یا این دستگاه اجازه ندارد.`

/** The little badge on the card of an account this device cannot open. */
export const SHARED_NO_ACCESS_BADGE = 'دسترسی ندارید'

/** The failure of a shared account's file: no access (a removed share or no grant) or anything else. */
export type SharedFailure = 'denied' | 'other'

/** Classifies a thrown value from opening or reading the shared account's file. */
export function classifySharedFailure(err: unknown): SharedFailure {
  return err instanceof SpreadsheetNoAccessError || isSpreadsheetAccessDeniedError(err)
    ? 'denied'
    : 'other'
}

/**
 * Per account, on this device: `accounting_shared_lost_<id>`. Listed in `ACCOUNT_KEY_PREFIXES`
 * (localDataWipe.ts), so signing out clears it. It outlives a reload so a cold start already knows
 * (the card, the `/shared` redirect); it goes as soon as the file opens again.
 */
export const SHARED_LOST_KEY_PREFIX = 'accounting_shared_lost_'

const keyOf = (spreadsheetId: string) => SHARED_LOST_KEY_PREFIX + spreadsheetId

const listeners = new Set<() => void>()

function emit() {
  listeners.forEach(listener => listener())
}

export function subscribeSharedAccessLost(listener: () => void): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function markSharedAccessLost(spreadsheetId: string): void {
  if (!spreadsheetId || isSharedAccessLost(spreadsheetId)) return
  setItem(keyOf(spreadsheetId), true)
  emit()
}

export function clearSharedAccessLost(spreadsheetId: string): void {
  if (!isSharedAccessLost(spreadsheetId)) return
  removeItem(keyOf(spreadsheetId))
  emit()
}

/** Whether this account was found unreachable from this device. */
export function isSharedAccessLost(spreadsheetId: string): boolean {
  return Boolean(spreadsheetId) && getItem<boolean>(keyOf(spreadsheetId)) === true
}

/** Whether the shared account registered on this device is the one found unreachable. */
export function isRegisteredSharedLost(): boolean {
  const id = sharedSpreadsheetId()

  return id ? isSharedAccessLost(id) : false
}

/**
 * Which start screen the sheet the app could not open on startup gets: the shared account's calm
 * one when it is a registered shared account and a personal sheet can take over, else the usual
 * sheet-picker notice (personal and building sheets keep their screen).
 */
export function inaccessibleScreen(
  sheet: Pick<SpreadsheetEntry, 'id' | 'kind'>,
  personal: { id: string } | undefined
): 'shared' | 'default' {
  return personal && isSharedEntry(sheet) ? 'shared' : 'default'
}
