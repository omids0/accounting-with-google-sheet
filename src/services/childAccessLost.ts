import { listChildren, type ChildRecord } from './childrenRegistry'
import {
  classifySharedFailure,
  clearSharedAccessLost,
  isSharedAccessLost,
  markSharedAccessLost,
  subscribeSharedAccessLost
} from './sharedAccessLost'
import { verifySpreadsheetExists } from './sheets'
import { isChildWorkspace } from './workspace'

/**
 * Parent side: a child's account this device can no longer open (the child, who owns the file,
 * removed the share in Google Drive). It reuses `sharedAccessLost.ts`, whose per-sheet flag
 * (`accounting_shared_lost_<id>`, wiped with the other account keys) works for any sheet id.
 *
 * Public API:
 * - `isChildAccessLost(id)`, `lostChildren()`, `subscribeChildAccessLost(listener)`.
 * - `markChildAccessLostIfDenied(id, err)`: call it in the catch of any open/read of a child
 *   sheet; marks it when Google denied access and returns whether it did.
 * - `markOpenChildLostIfDenied(id, err)`: the same for the sync's failed pull, which does not
 *   know whether the open sheet is a child; does nothing for any other kind of sheet.
 * - `probeChildAccess(id)`: one cheap metadata read: 'ok' (flag cleared), 'lost' (flag set) or
 *   'unknown' (offline or another error; the flag is left as it was).
 * - `clearChildAccessLost(id)`; `CHILD_NO_ACCESS_BADGE`; `childNoAccessMessage(name)`.
 */
export const CHILD_NO_ACCESS_BADGE = 'دسترسی قطع شد'

export const childNoAccessMessage = (name: string) =>
  `دسترسی شما به حساب «${name}» قطع شد. شاید فرزندتان اشتراک فایل را در گوگل‌درایو برداشته است.`

export const isChildAccessLost = isSharedAccessLost

export const clearChildAccessLost = clearSharedAccessLost

export const subscribeChildAccessLost = subscribeSharedAccessLost

export function lostChildren(): ChildRecord[] {
  return listChildren().filter(child => isSharedAccessLost(child.id))
}

export function markChildAccessLostIfDenied(id: string, err: unknown): boolean {
  if (classifySharedFailure(err) !== 'denied') return false
  markSharedAccessLost(id)

  return true
}

export function markOpenChildLostIfDenied(id: string, err: unknown): boolean {
  return isChildWorkspace(id) && markChildAccessLostIfDenied(id, err)
}

export async function probeChildAccess(id: string): Promise<'ok' | 'lost' | 'unknown'> {
  try {
    if (await verifySpreadsheetExists(id)) {
      clearSharedAccessLost(id)

      return 'ok'
    }
    markSharedAccessLost(id)

    return 'lost'
  } catch (err) {
    return markChildAccessLostIfDenied(id, err) ? 'lost' : 'unknown'
  }
}
