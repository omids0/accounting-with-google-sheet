import { isSpreadsheetAccessDeniedError } from './sheetsApi'
import { SpreadsheetNoAccessError } from './spreadsheetAccess'

/**
 * Said when the shared account's file cannot be opened from this device. Google answers the same
 * way for a removed member and for a device that never got the file's permission, so the words
 * name both.
 */
export const SHARED_NO_ACCESS_MESSAGE =
  'به این حساب مشترک دسترسی نداری. شاید مالک تو را حذف کرده یا این دستگاه اجازه ندارد.'

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
 * Accounts found unreachable in this session. In memory on purpose: a reload re-reads the file, so
 * a share the owner gave back is never held against the user.
 */
const lost = new Set<string>()

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
  if (!spreadsheetId || lost.has(spreadsheetId)) return
  lost.add(spreadsheetId)
  emit()
}

export function clearSharedAccessLost(spreadsheetId: string): void {
  if (lost.delete(spreadsheetId)) emit()
}

/** Whether this account was found unreachable; without an id, whether any account was. */
export function isSharedAccessLost(spreadsheetId?: string): boolean {
  return spreadsheetId ? lost.has(spreadsheetId) : lost.size > 0
}
