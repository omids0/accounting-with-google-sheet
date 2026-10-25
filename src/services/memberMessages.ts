import { registryOf, type MemberKind } from './memberRegistry'

/**
 * Why a member change or an invitation was refused, in the words of each workspace kind. The
 * building copy is the round-11 text unchanged; the shared copy names «حساب مشترک» and its roles.
 */
export type MemberBlock = 'forbidden' | 'unknown' | 'last-manager' | 'self' | 'partner-limit'

export type InviteBlock = 'forbidden' | 'self' | 'exists' | 'partner-limit'

const PARTNER_LIMIT = 'حساب مشترک فقط یک شریک دارد؛ نفر دیگر را «ناظر» کنید'

export const MEMBER_BLOCK_MESSAGES: Record<MemberBlock, string> = {
  forbidden: 'تغییر اعضا فقط با دسترسی «تنظیمات» ممکن است',
  unknown: 'این عضو پیدا نشد',
  'last-manager': registryOf('building').lastOwnerMessage,
  self: 'نقش و دسترسی خودت را نمی‌توانی تغییر بدهی؛ مدیر دیگری باید این کار را بکند',
  'partner-limit': PARTNER_LIMIT
}

const SHARED_MEMBER_BLOCK_MESSAGES: Record<MemberBlock, string> = {
  forbidden: 'تغییر اعضا فقط با دسترسی «دعوت و مدیریت اعضا» ممکن است',
  unknown: 'این عضو پیدا نشد',
  'last-manager': registryOf('shared').lastOwnerMessage,
  self: 'نقش و دسترسی خودت را نمی‌توانی تغییر بدهی؛ مالک باید این کار را بکند',
  'partner-limit': PARTNER_LIMIT
}

export const INVITE_BLOCK_MESSAGES: Record<InviteBlock, string> = {
  forbidden: 'دعوت عضو فقط با دسترسی «تنظیمات» ممکن است',
  self: 'این ایمیل خود شماست و از قبل عضو ساختمان هستید',
  exists: 'این ایمیل از قبل عضو ساختمان است؛ نقشش را از صفحهٔ «اعضا و دسترسی‌ها» عوض کنید',
  'partner-limit': PARTNER_LIMIT
}

const SHARED_INVITE_BLOCK_MESSAGES: Record<InviteBlock, string> = {
  forbidden: 'دعوت عضو فقط با دسترسی «دعوت و مدیریت اعضا» ممکن است',
  self: 'این ایمیل خود شماست و از قبل عضو حساب مشترک هستید',
  exists: 'این ایمیل از قبل عضو است؛ نقشش را از فهرست اعضا عوض کنید',
  'partner-limit': 'حساب مشترک فقط یک شریک دارد؛ این نفر را «ناظر» دعوت کنید'
}

export function memberBlockMessages(kind: MemberKind = 'building'): Record<MemberBlock, string> {
  return kind === 'shared' ? SHARED_MEMBER_BLOCK_MESSAGES : MEMBER_BLOCK_MESSAGES
}

export function inviteBlockMessages(kind: MemberKind = 'building'): Record<InviteBlock, string> {
  return kind === 'shared' ? SHARED_INVITE_BLOCK_MESSAGES : INVITE_BLOCK_MESSAGES
}
