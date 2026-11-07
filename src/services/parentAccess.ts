import { getUserEmail } from './auth'
import { isValidEmail } from './buildingInvites'
import { listSharedEmails, shareErrorMessage, shareFile } from './driveShare'
import { setPeriodSetting } from './periodSettings'
import { getSettings } from './settings'
import { PERIOD_SETTINGS_SHEET } from './sheetNames'
import { getSheetDataRows } from './spreadsheetStore'
import { isPersonalWorkspace } from './workspace'
import { normalizeEmail, sameEmail } from '../utils/email'
import { getTodayIso } from '../utils/jalaliDate'

/**
 * Child side of «والدین من» (the teenager's device, PERSONAL workspace only). The child shares
 * their own personal spreadsheet with a parent as a Drive `reader` and leaves a marker row
 * `والد:<email>` = date in «تنظیمات دوره» (the same `key | value | stamp` convention as the
 * `نقش:` / `دعوت:` member rows), so the app can list who has access.
 *
 * Public API:
 * - `grantParentAccess(parentEmail, options?)` -> `'granted' | 'invalid' | 'self' | 'exists'`;
 *   throws an Error with a Persian message when Drive refuses (`shareErrorMessage`) or the open
 *   sheet is not a personal one. Share first, marker row second (retried):
 *   a refused share leaves no row, a lost marker write still shows the parent in `listParents`.
 * - `localParents(spreadsheetId?)`: the marker rows, no network (instant list for the screen).
 * - `listParents(spreadsheetId?)`: the marker rows cross-checked with Drive's permission list.
 *   status `active` = Drive lists the e-mail; `revoked` = the row exists but Drive no longer lists
 *   it (the parent ended it); `unverified` = Drive could not be asked (offline, reader-only).
 *   A Drive reader with no marker row is listed too (`since: null`, `active`).
 * - `activeParents(list)`: the entries that still see the account (`active` / `unverified`), for
 *   the always-visible transparency notice.
 * - `PARENT_ROW_PREFIX`, `parentEmailsFromRows(rows)`, `PARENT_GRANT_MESSAGES`.
 *
 * There is deliberately NO function that removes a parent: only the parent ends the access
 * (owner decision). The child owns the file, so they can still unshare it in Drive by hand.
 */
export const PARENT_ROW_PREFIX = 'والد:'

export const NOT_PERSONAL_PARENT_MESSAGE = 'دسترسی والدین فقط در حساب شخصی تنظیم می‌شود'

export type GrantParentResult = 'granted' | 'invalid' | 'self' | 'exists'

export const PARENT_GRANT_MESSAGES: Record<Exclude<GrantParentResult, 'granted'>, string> = {
  invalid: 'ایمیل والد درست نیست؛ ایمیل یک حساب گوگل را وارد کنید',
  self: 'ایمیل خودتان را نمی‌توانید به‌عنوان والد وارد کنید',
  exists: 'این والد از قبل به حساب شما دسترسی دارد'
}

export interface ParentAccess {
  email: string
  /** The day the row was written (ISO), when it has one. */
  since: string | null
  status: 'active' | 'revoked' | 'unverified'
}

export interface GrantParentOptions {
  /** Used in the Drive e-mail so the parent knows who shared the account. */
  childName?: string
  appUrl?: string
}

/** The `والد:<email>` rows of «تنظیمات دوره», in sheet order, without duplicates. */
export function parentEmailsFromRows(
  rows: readonly (readonly string[])[]
): { email: string; since: string | null }[] {
  const seen = new Map<string, { email: string; since: string | null }>()

  for (const row of rows) {
    const key = String(row[0] ?? '').trim()

    if (!key.startsWith(PARENT_ROW_PREFIX)) continue

    const email = normalizeEmail(key.slice(PARENT_ROW_PREFIX.length))

    if (email && !seen.has(email)) {
      seen.set(email, { email, since: String(row[1] ?? '').trim() || null })
    }
  }

  return [...seen.values()]
}

const activeSheetId = () => getSettings()?.spreadsheetId ?? ''

export function localParents(
  spreadsheetId = activeSheetId()
): { email: string; since: string | null }[] {
  return parentEmailsFromRows(getSheetDataRows(spreadsheetId, PERIOD_SETTINGS_SHEET) ?? [])
}

export async function listParents(spreadsheetId = activeSheetId()): Promise<ParentAccess[]> {
  const rows = localParents(spreadsheetId)
  const drive = await listSharedEmails(spreadsheetId).catch(() => null)

  const marked: ParentAccess[] = rows.map(({ email, since }) => ({
    email,
    since,
    status: !drive ? 'unverified' : drive.includes(email) ? 'active' : 'revoked'
  }))

  if (!drive) return marked

  // Drive is the truth about who can open the file: a reader whose marker row never got written
  // (a lost write, a reload right after sharing) is still listed, so the teen sees everyone.
  const known = new Set(rows.map(row => row.email))
  const unmarked = [...new Set(drive)]
    .filter(email => email && !known.has(email))
    .map((email): ParentAccess => ({ email, since: null, status: 'active' }))

  return [...marked, ...unmarked]
}

const MARKER_ATTEMPTS = 3
const MARKER_RETRY_MS = 400

/**
 * The marker row, written after the share went out. A failed write is retried and, if it still
 * fails, not thrown: the share succeeded and `listParents` lists the reader from Drive anyway.
 */
async function writeParentMarker(spreadsheetId: string, email: string): Promise<void> {
  for (let attempt = 1; attempt <= MARKER_ATTEMPTS; attempt += 1) {
    try {
      await setPeriodSetting(spreadsheetId, `${PARENT_ROW_PREFIX}${email}`, getTodayIso())

      return
    } catch {
      if (attempt < MARKER_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, MARKER_RETRY_MS))
      }
    }
  }
}

export const activeParents = (list: readonly ParentAccess[]): ParentAccess[] =>
  list.filter(parent => parent.status !== 'revoked')

/** How the parent makes the shared sheet visible to the app (Drive's narrow scope hides it until then). */
export const PARENT_OPEN_SHEET_HINT =
  'نحوهٔ دیدن: «فرزندان من» را باز کنید، «باز کردن شیت با گوگل» را بزنید و شیتی را که با شما به اشتراک گذاشته شده انتخاب کنید.'

/** The e-mail Drive sends the parent with the share. */
function shareMessage({ childName, appUrl }: GrantParentOptions): string {
  const name = childName?.trim()

  return [
    'سلام،',
    `${
      name ? `«${name}»` : 'فرزندتان'
    } حساب خود در اپ «حساب کتاب» را برای دیدن (فقط‌خواندنی) با شما به اشتراک گذاشته است.`,
    'شما فقط می‌بینید و چیزی را تغییر نمی‌دهید.',
    appUrl ? `\nبرای دیدن: از منوی «فرزندان من» در اپ، حساب را وصل کنید:\n${appUrl}` : '',
    PARENT_OPEN_SHEET_HINT,
    '\nبا احترام'
  ]
    .filter(Boolean)
    .join('\n')
}

export async function grantParentAccess(
  parentEmail: string,
  options: GrantParentOptions = {}
): Promise<GrantParentResult> {
  const spreadsheetId = activeSheetId()

  if (!spreadsheetId || !isPersonalWorkspace(spreadsheetId)) {
    throw new Error(NOT_PERSONAL_PARENT_MESSAGE)
  }

  const email = normalizeEmail(parentEmail)

  if (!isValidEmail(email)) return 'invalid'
  if (sameEmail(email, getUserEmail())) return 'self'

  const known = (await listParents(spreadsheetId)).find(parent => parent.email === email)

  if (known?.status === 'active') return 'exists'

  try {
    await shareFile(spreadsheetId, email, 'reader', shareMessage(options))
  } catch (err) {
    throw new Error(shareErrorMessage(err, 'ارسال دعوت ناموفق بود', 'حساب'))
  }
  await writeParentMarker(spreadsheetId, email)

  return 'granted'
}
