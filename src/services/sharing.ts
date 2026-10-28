import { getUserEmail } from './auth'
import { DRIVE_API, driveRequest } from './drive'
import { getItem, setItem } from './storage'

export interface SharingEditor {
  email: string
  name: string
}

export interface SharingInfo {
  shared: boolean
  editors: SharingEditor[]
  checkedAt: number
}

/** Per spreadsheet id; listed in `ACCOUNT_KEYS`. */
export const SHARING_KEY = 'accounting_sharing_v1'

export const SHARING_REFRESH_MS = 24 * 60 * 60_000

interface DrivePermission {
  emailAddress?: string
  role?: string
  displayName?: string
}

const EDITOR_ROLES = new Set(['owner', 'organizer', 'fileOrganizer', 'writer'])

type SharingState = Record<string, SharingInfo>

const listeners = new Set<(spreadsheetId: string, info: SharingInfo) => void>()

function readState(): SharingState {
  return getItem<SharingState>(SHARING_KEY) ?? {}
}

function saveInfo(spreadsheetId: string, info: SharingInfo): void {
  try {
    setItem(SHARING_KEY, { ...readState(), [spreadsheetId]: info })
  } catch {
    // Full storage: the answer still holds for this launch.
  }
  listeners.forEach(listener => listener(spreadsheetId, info))
}

/** Drive permissions → who can edit; shared when more than one account can. */
export function sharingFromPermissions(
  permissions: readonly DrivePermission[],
  checkedAt = Date.now()
): SharingInfo {
  const editors: SharingEditor[] = []

  for (const permission of permissions) {
    const email = (permission.emailAddress ?? '').trim().toLowerCase()

    if (!EDITOR_ROLES.has(permission.role ?? '')) continue
    if (email && editors.some(editor => editor.email === email)) continue
    editors.push({ email, name: (permission.displayName ?? '').trim() })
  }

  return { shared: editors.length > 1, editors, checkedAt }
}

export function getSharingInfo(spreadsheetId: string): SharingInfo | null {
  return spreadsheetId ? readState()[spreadsheetId] ?? null : null
}

export function isSharedSpreadsheet(spreadsheetId: string): boolean {
  return getSharingInfo(spreadsheetId)?.shared === true
}

/** Asks Drive who can edit; on any error keeps the last answer, or a private sheet. */
export async function refreshSharingInfo(spreadsheetId: string): Promise<SharingInfo> {
  const fields = encodeURIComponent('permissions(emailAddress,role,displayName)')

  try {
    const data = await driveRequest<{ permissions?: DrivePermission[] }>(
      `${DRIVE_API}/${encodeURIComponent(spreadsheetId)}?fields=${fields}&supportsAllDrives=true`
    )
    const info = sharingFromPermissions(data.permissions ?? [])

    saveInfo(spreadsheetId, info)

    return info
  } catch {
    return getSharingInfo(spreadsheetId) ?? { shared: false, editors: [], checkedAt: 0 }
  }
}

/** At most once per 24 h; fire-and-forget from the sync start. */
export function refreshSharingInfoIfStale(spreadsheetId: string, now = Date.now()): void {
  const known = getSharingInfo(spreadsheetId)

  if (!spreadsheetId || !getUserEmail()) return
  if (known && now - known.checkedAt < SHARING_REFRESH_MS) return
  void refreshSharingInfo(spreadsheetId)
}

export function onSharingChange(
  listener: (spreadsheetId: string, info: SharingInfo) => void
): () => void {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

export interface WriterLabel {
  initial: string
  name: string
  isMe: boolean
  /** Drive gave a display name; false when `name` is only the stand-in. */
  known: boolean
  /** The part of the e-mail before '@' (Latin): a secondary detail, never the main label. */
  address: string
}

/** What a person reads as while Drive has no display name for them. */
export const UNKNOWN_WRITER_NAME = 'شریک'

/**
 * Drive's display name when known; otherwise «شما» for the signed-in account and «شریک» for anyone
 * else. The e-mail local part (`address`) is Latin and scrambles a Persian line, so it is not a name.
 */
export function writerLabel(email: string, info: SharingInfo | null): WriterLabel {
  const normalized = email.trim().toLowerCase()
  const me = (getUserEmail() ?? '').trim().toLowerCase()
  const isMe = !!me && normalized === me
  const known = info?.editors.find(editor => editor.email === normalized)?.name ?? ''
  const name = known || (isMe ? 'شما' : UNKNOWN_WRITER_NAME)

  return {
    initial: Array.from(name)[0]?.toUpperCase() ?? '',
    name,
    isMe,
    known: !!known,
    address: normalized.split('@')[0] || normalized
  }
}
