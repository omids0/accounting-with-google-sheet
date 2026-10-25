import { ROLE_ROW_PREFIX } from './buildingRoles'
import { setBuildingSetting } from './buildingSettings'
import {
  BUILDING_ROLES,
  optionLabel,
  type BuildingRole
} from '../components/buildings/buildingOptions'
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
  role: BuildingRole
): Promise<void> {
  const normalized = email.trim().toLowerCase()

  await setBuildingSetting(spreadsheetId, `${ROLE_ROW_PREFIX}${normalized}`, role)
  await setBuildingSetting(spreadsheetId, `${INVITE_ROW_PREFIX}${normalized}`, getTodayIso())
}

export interface InviteLinks {
  appUrl?: string
  downloadUrl?: string
}

/** The way in for the invitee; every URL has its own line so a mail client keeps it in one piece. */
function inviteSteps(buildingName: string, { appUrl, downloadUrl }: InviteLinks): string[] {
  const name = buildingName.trim()

  return [
    'برای شروع:',
    `۱. اپ «حساب کتاب» را باز کنید و با همین ایمیل گوگل وارد شوید${appUrl ? ':' : '.'}`,
    appUrl ?? '',
    '۲. از منوی «بیشتر › مدیر ساختمان» گزینهٔ «اتصال به شیت موجود» را بزنید.',
    `۳. با «باز کردن شیت با گوگل» فایل ${name ? `«${name}»` : 'ساختمان'} را انتخاب کنید.`,
    downloadUrl ? '\nنسخهٔ اندروید اپ:' : '',
    downloadUrl ?? '',
    '\nبعد از ورود، گوگل ممکن است یک هشدار امنیتی بفرستد؛ گزینهٔ «بله، خودم بودم» را بزنید.'
  ]
}

export interface InviteMessageInput extends InviteLinks {
  inviterName: string
  buildingName: string
  role: BuildingRole
  /** A test build: the first line says so, so nobody takes it for the real app. */
  testBuild?: boolean
}

/** The message Drive puts in its sharing e-mail (plain text), sent by the app on the manager's behalf. */
export function inviteMessage(input: InviteMessageInput): string {
  const name = input.buildingName.trim()

  const who = input.inviterName.trim() || 'مدیر ساختمان'

  return [
    input.testBuild ? '(نسخهٔ آزمایشی اپ)\n' : '',
    'سلام،',
    `${who} شما را به ${name ? `ساختمان «${name}»` : 'یک ساختمان'} با نقش «${optionLabel(
      BUILDING_ROLES,
      input.role
    )}» دعوت کرده است.\n`,
    ...inviteSteps(input.buildingName, input),
    '\nبا احترام'
  ]
    .filter(line => line !== '')
    .join('\n')
}

/** The same invitation as a text to copy, for the manager who shares the file by hand instead. */
export function inviteText(
  buildingName: string,
  role: BuildingRole,
  sheetUrl: string,
  links: InviteLinks = {}
): string {
  const name = buildingName.trim()

  return [
    `دعوت به ساختمان «${name}»`,
    `نقش شما: ${optionLabel(BUILDING_ROLES, role)}`,
    'فایل ساختمان را در گوگل‌درایو با ایمیل شما به اشتراک گذاشته‌ام:',
    sheetUrl,
    ...inviteSteps(buildingName, links)
  ]
    .filter(line => line !== '')
    .join('\n')
}
