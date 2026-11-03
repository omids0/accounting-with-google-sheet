import { isValidEmail, type InviteLinks } from './buildingInvites'
import { normalizeEmail } from '../utils/email'

/**
 * Parent side: the invite a parent sends their child («دعوت فرزند»). The text carries the
 * parent's e-mail and the app link; the link has `?parent=<email>` so the child's screen
 * «والدین من» can prefill the e-mail field.
 *
 * Public API:
 * - `PARENT_INVITE_PARAM` ('parent'), `buildParentInviteLink(appUrl, parentEmail)`.
 * - `parseParentInviteParam(search)`: the validated lower-case e-mail of `?parent=...` (pass
 *   `location.search`), or null.
 * - `buildParentInviteText(parentEmail, appLink, links?)`: plain text to share or copy.
 */
export const PARENT_INVITE_PARAM = 'parent'

export function buildParentInviteLink(appUrl: string, parentEmail: string): string {
  const base = appUrl.trim()

  if (!base) return ''

  return `${base}${base.includes('?') ? '&' : '?'}${PARENT_INVITE_PARAM}=${encodeURIComponent(
    normalizeEmail(parentEmail)
  )}`
}

export function parseParentInviteParam(search: string): string | null {
  const value = normalizeEmail(new URLSearchParams(search).get(PARENT_INVITE_PARAM))

  return isValidEmail(value) ? value : null
}

export function buildParentInviteText(
  parentEmail: string,
  appLink: string,
  { downloadUrl }: InviteLinks = {}
): string {
  const email = normalizeEmail(parentEmail)

  const link = buildParentInviteLink(appLink, email)

  return [
    'سلام،',
    'می‌خواهم حساب تو را در اپ «حساب کتاب» فقط ببینم تا در کنترل خرج‌ها کمکت کنم. من چیزی را تغییر نمی‌دهم و تو می‌بینی چه کسی دسترسی دارد.\n',
    'برای شروع:',
    `۱. اپ «حساب کتاب» را باز کن و با حساب گوگل خودت وارد شو${link ? ':' : '.'}`,
    link,
    '۲. از منو «والدین من» را بزن.',
    `۳. ایمیل من را وارد کن (${email})، توضیح‌ها را بخوان و تأیید کن.`,
    downloadUrl ? '\nنسخهٔ اندروید اپ:' : '',
    downloadUrl ?? ''
  ]
    .filter(line => line !== '')
    .join('\n')
}
