import { getSession } from '../services/auth'
import { getItem, removeItem, setItem } from '../services/storage'

/** The invite code a newcomer arrived with, kept until their first sign-in counts it. */
const PENDING_KEY = 'accounting_invite_ref'

/** A code nobody signed in with for this long is dropped, so it cannot be counted for a stranger later. */
const PENDING_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

interface PendingInvite {
  code: string
  at: number
}

/** The shape the worker hands out (`workers/auth-refresh/src/invite.ts`). */
export const isInviteCode = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{10}$/.test(value)

export function getPendingInviteRef(): string | null {
  const pending = getItem<PendingInvite>(PENDING_KEY)

  if (!pending || !isInviteCode(pending.code) || Date.now() - pending.at > PENDING_MAX_AGE_MS) {
    return null
  }

  return pending.code
}

/** Returns false when `code` is not an invite code, so a typed code can be refused. */
export function setPendingInviteRef(code: string): boolean {
  const trimmed = code.trim()

  if (!isInviteCode(trimmed)) return false

  setItem<PendingInvite>(PENDING_KEY, { code: trimmed, at: Date.now() })

  return true
}

export function clearPendingInviteRef(): void {
  removeItem(PENDING_KEY)
}

/**
 * Reads `?ref=` from the address the invite page sent the newcomer to and removes only that
 * parameter, so a share or launch query waiting in the URL survives. Someone already signed
 * in is not a newcomer: their link is ignored (and still removed).
 */
export function captureInviteRefFromUrl(): void {
  try {
    const url = new URL(window.location.href)

    const ref = url.searchParams.get('ref')

    if (ref === null) return

    if (!getSession()) setPendingInviteRef(ref)

    url.searchParams.delete('ref')
    window.history.replaceState(window.history.state, '', url)
  } catch {
    /* an unreadable address or blocked storage only means the invitation is not remembered */
  }
}
