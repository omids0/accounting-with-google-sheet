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
 * Journey step 7: adds the member row (`نقش:<email>`) and marks it invited. The Drive share
 * itself is the manager's to give; this only makes the role known the moment they open the sheet.
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

/** The ready-made message the manager sends along with the Drive share. */
export function inviteText(buildingName: string, role: BuildingRole, sheetUrl: string): string {
  return [
    `دعوت به ساختمان «${buildingName}»`,
    `نقش شما: ${optionLabel(BUILDING_ROLES, role)}`,
    'شیت ساختمان را در گوگل‌درایو با ایمیل شما به اشتراک گذاشته‌ام. با همین حساب گوگل وارد اپ حسابداری شوید، از منوی «بیشتر › مدیر ساختمان» گزینهٔ «اتصال به شیت موجود» را بزنید و شیت را انتخاب کنید.',
    sheetUrl
  ]
    .filter(Boolean)
    .join('\n')
}
