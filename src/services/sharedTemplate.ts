import { getUserEmail } from './auth'
import { isValidEmail } from './buildingInvites'
import { inviteMember } from './buildingMemberDrive'
import { parseMembers, ROLE_ROW_PREFIX } from './buildingRoles'
import { registerWorkspaceSpreadsheet } from './buildingTemplate'
import { inviteBlockMessages } from './memberMessages'
import { markCompactGridsMigrated } from './migrateCompactGrids'
import { SHARED_SHEET_SPECS } from './moduleSheetSpecs'
import { MEMBERSHIP_DATE_KEY } from './periodSettings'
import { getDefaultForms } from './settings'
import { sharedLabel, WORKSPACE_SHARED_VALUE } from './sharedWorkspace'
import { PERIOD_SETTINGS_SHEET } from './sheetNames'
import { createSpreadsheet, type NewSheetTab } from './sheetsCreate'
import { formatSpreadsheetTitle } from './spreadsheetCatalog'
import { markFreshlyCreated } from './spreadsheetPreparedSession'
import { hasSharedAccount, setWorkspaceType, WORKSPACE_TYPE_ROW } from './workspace'
import { withSharedFields } from '../components/form/sharedFields'
import type { CustomForm } from '../types'
import { getTodayIso } from '../utils/jalaliDate'

/** v1 has one shared account per person (UX-FAMILY-SPEC «More calls»). */
export const ONE_SHARED_ACCOUNT_MESSAGE =
  'شما از قبل یک حساب مشترک دارید؛ اگر خاموشش کرده‌اید، از «فضاهای من» دوباره روشنش کنید'

export type SharedPartnerRole = 'partner' | 'viewer'

const normalizeEmail = (email: string) => email.trim().toLowerCase()

/** Step 2 of the setup wizard: what is wrong with the name and the partner's e-mail, or null. */
export function sharedSetupError(
  draft: { name: string; email: string },
  creatorEmail: string
): string | null {
  if (!draft.name.trim()) return 'نام حساب مشترک را بنویسید'
  if (!isValidEmail(draft.email)) return 'ایمیل گوگل شریک را درست وارد کنید'
  if (normalizeEmail(draft.email) === normalizeEmail(creatorEmail))
    return 'این ایمیل خود شماست؛ ایمیل گوگل شریک‌تان را وارد کنید'

  return null
}

/**
 * The «تنظیمات دوره» rows a new shared account starts with (no I/O): the type marker, the
 * membership date (a fresh file skips the first-open check that would add it) and the creator as
 * «مالک». They go out with the file itself, so no sync can ever read the sheet without its type.
 */
export function buildSharedTemplateRows(
  _name: string,
  creatorEmail: string,
  now = new Date()
): { period: string[][] } {
  const stamp = now.toLocaleString('fa-IR')

  return {
    period: [
      [WORKSPACE_TYPE_ROW, WORKSPACE_SHARED_VALUE, stamp],
      [MEMBERSHIP_DATE_KEY, getTodayIso(), stamp],
      [`${ROLE_ROW_PREFIX}${normalizeEmail(creatorEmail)}`, 'owner', stamp]
    ]
  }
}

/** The income / expense forms of a shared account: standard fields plus payer, split, creator. */
export function sharedForms(): CustomForm[] {
  return withSharedFields(getDefaultForms())
}

/** The tabs of a new shared account: exactly its own few, the period one with its first rows. */
export function sharedTabs(rows: { period: string[][] }): NewSheetTab[] {
  return SHARED_SHEET_SPECS.map(spec => ({
    ...spec,
    rows: spec.sheetName === PERIOD_SETTINGS_SHEET ? rows.period : undefined
  }))
}

/** Lists the spreadsheet as this device's shared account without making it the active one. */
export function registerSharedSpreadsheet(id: string, name: string): void {
  registerWorkspaceSpreadsheet(id, name, 'shared')
}

/**
 * «ساخت فضا و ارسال دعوت»: creates «حسابداری · مشترک <name>» in the creator's Drive with its own
 * tabs, forms and first rows (two requests), lists it on this device as the shared account, then
 * invites the partner: Drive first, so a refused or offline share leaves the file (kept and
 * registered, the invitation can be sent again from «اعضا») but no half-invited member, and the
 * Drive error reaches the caller. The new file is not opened; the personal books stay untouched.
 */
export async function createSharedSpreadsheet(
  name: string,
  partnerEmail: string,
  partnerRole: SharedPartnerRole,
  /** Called when the file exists and the invitation starts (the busy overlay's next text). */
  onInvite?: () => void
): Promise<string> {
  const creator = normalizeEmail(getUserEmail() ?? '')

  if (hasSharedAccount()) throw new Error(ONE_SHARED_ACCOUNT_MESSAGE)

  const problem = sharedSetupError({ name, email: partnerEmail }, creator)

  if (problem) throw new Error(problem)

  const label = name.trim()

  const title = formatSpreadsheetTitle(sharedLabel(label))

  const rows = buildSharedTemplateRows(label, creator)

  const spreadsheetId = await createSpreadsheet(title, sharedForms(), sharedTabs(rows))

  // Every tab and header is in place: the first activation goes straight to opening it.
  markFreshlyCreated(spreadsheetId)
  // Its tabs were created with exact grids, so the first download has nothing to shrink either.
  markCompactGridsMigrated(spreadsheetId)
  // Known before the first activation, so its forms, tabs and menu are the shared account's.
  setWorkspaceType(spreadsheetId, 'shared')
  registerSharedSpreadsheet(spreadsheetId, title)

  onInvite?.()

  // The file is not the open sheet: the invitation checks the members it was just created with.
  const block = await inviteMember(
    spreadsheetId,
    partnerEmail,
    partnerRole,
    label,
    parseMembers(rows.period, 'shared')
  )

  if (block) throw new Error(inviteBlockMessages('shared')[block])

  return spreadsheetId
}
