import { ROLE_ROW_PREFIX } from './buildingRoles'
import { setMemberSetting } from './buildingSettings'
import { registryOf, type MemberKind, type MemberRole } from './memberRegistry'
import { PERIOD_SETTINGS_SHEET } from './sheetNames'
import { appendSheetRowsApi } from './sheetsOutboxApi'
import { assertMemberWorkspace } from './workspace'
import { optionLabel } from '../components/buildings/buildingOptions'
import { getTodayIso } from '../utils/jalaliDate'

/** `دعوت:<email>` rows of «تنظیمات دوره»: the member was invited and has not been seen yet. */
export const INVITE_ROW_PREFIX = 'دعوت:'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL.test(email.trim())
}

/** Emails of the invited members in the rows of «تنظیمات دوره». */
export function invitedEmails(rows: string[][]): string[] {
  return rows
    .map(row => String(row[0] ?? '').trim())
    .filter(key => key.startsWith(INVITE_ROW_PREFIX))
    .map(key => key.slice(INVITE_ROW_PREFIX.length).toLowerCase())
}

/**
 * Journey step 7: adds the member row (`نقش:<email>`) and marks it invited. Only the rows: the
 * Drive share goes first, in `inviteMember`, so a refused share leaves no half-invited member.
 */
export async function addInvite(
  spreadsheetId: string,
  email: string,
  role: MemberRole
): Promise<void> {
  const normalized = email.trim().toLowerCase()

  await setMemberSetting(spreadsheetId, `${ROLE_ROW_PREFIX}${normalized}`, role)
  await setMemberSetting(spreadsheetId, `${INVITE_ROW_PREFIX}${normalized}`, getTodayIso())
}

/**
 * `addInvite` for a sheet that is not the open one (a file created a moment ago): the in-memory
 * mirror and the outbox belong to the open sheet only, so the two rows go straight to Sheets in
 * one append. The sheet has no member row for this e-mail yet (the caller checked).
 */
export async function addInviteToClosedSheet(
  spreadsheetId: string,
  email: string,
  role: MemberRole
): Promise<void> {
  assertMemberWorkspace(spreadsheetId)

  const normalized = email.trim().toLowerCase()

  const stamp = new Date().toLocaleString('fa-IR')

  await appendSheetRowsApi(spreadsheetId, PERIOD_SETTINGS_SHEET, [
    [`${ROLE_ROW_PREFIX}${normalized}`, role, stamp],
    [`${INVITE_ROW_PREFIX}${normalized}`, getTodayIso(), stamp]
  ])
}

export interface InviteLinks {
  appUrl?: string
  downloadUrl?: string
}

/** Step 2: where the invitee connects the existing sheet, in the words of the workspace kind. */
function connectStep(kind: MemberKind): string {
  const { connectPath, connectAction } = registryOf(kind)

  return connectAction
    ? `۲. از منوی «${connectPath}» گزینهٔ «${connectAction}» را بزنید.`
    : `۲. در اپ «${connectPath}» را بزنید.`
}

/** The way in for the invitee; every URL has its own line so a mail client keeps it in one piece. */
function inviteSteps(
  name: string,
  { appUrl, downloadUrl }: InviteLinks,
  kind: MemberKind
): string[] {
  const trimmed = name.trim()

  return [
    'برای شروع:',
    `۱. اپ «حساب کتاب» را باز کنید و با همین ایمیل گوگل وارد شوید${appUrl ? ':' : '.'}`,
    appUrl ?? '',
    connectStep(kind),
    `۳. با «باز کردن شیت با گوگل» فایل ${
      trimmed ? `«${trimmed}»` : registryOf(kind).fileNoun
    } را انتخاب کنید.`,
    downloadUrl ? '\nنسخهٔ اندروید اپ:' : '',
    downloadUrl ?? '',
    '\nبعد از ورود، گوگل ممکن است یک هشدار امنیتی بفرستد؛ گزینهٔ «بله، خودم بودم» را بزنید.'
  ]
}

export interface InviteMessageInput extends InviteLinks {
  inviterName: string
  /** The name of the building or the shared account. */
  buildingName: string
  role: MemberRole
  /** A test build: the first line says so, so nobody takes it for the real app. */
  testBuild?: boolean
  /** Default: a building. */
  kind?: MemberKind
}

/** The message Drive puts in its sharing e-mail (plain text), sent by the app on the inviter's behalf. */
export function inviteMessage(input: InviteMessageInput): string {
  const kind = input.kind ?? 'building'

  const { fileNoun, ownerRole, roles } = registryOf(kind)

  const name = input.buildingName.trim()

  const who = input.inviterName.trim() || `${optionLabel(roles, ownerRole)} ${fileNoun}`

  return [
    input.testBuild ? '(نسخهٔ آزمایشی اپ)\n' : '',
    'سلام،',
    `${who} شما را به ${name ? `${fileNoun} «${name}»` : `یک ${fileNoun}`} با نقش «${optionLabel(
      roles,
      input.role
    )}» دعوت کرده است.\n`,
    ...inviteSteps(input.buildingName, input, kind),
    '\nبا احترام'
  ]
    .filter(line => line !== '')
    .join('\n')
}

/** The same invitation as a text to copy, for the inviter who shares the file by hand instead. */
export function inviteText(
  buildingName: string,
  role: MemberRole,
  sheetUrl: string,
  links: InviteLinks = {},
  kind: MemberKind = 'building'
): string {
  const { fileNoun, roles } = registryOf(kind)

  const name = buildingName.trim()

  return [
    `دعوت به ${fileNoun} «${name}»`,
    `نقش شما: ${optionLabel(roles, role)}`,
    `فایل ${fileNoun} را در گوگل‌درایو با ایمیل شما به اشتراک گذاشته‌ام:`,
    sheetUrl,
    ...inviteSteps(buildingName, links, kind)
  ]
    .filter(line => line !== '')
    .join('\n')
}
