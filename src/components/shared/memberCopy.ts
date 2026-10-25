import { effectivePermission } from '../../services/buildingMembers'
import { registryOf, type MemberKind, type WorkspaceMember } from '../../services/memberRegistry'
import { optionLabel } from '../buildings/buildingOptions'

/**
 * The words and role lists of the member screens (card, invite sheet, page) per workspace kind.
 * The building texts are the round-11 ones, word for word; the shared-account texts say «حساب
 * مشترک», «مالک» and «شریک». Pure, so the screens stay thin and the copy is testable.
 */
type Overrides = WorkspaceMember['overrides']

/** «شریک» / «حسابدار» / …: the label of `role` in the kind's own role list. */
export function memberRoleLabel(kind: MemberKind, role: string): string {
  return optionLabel(registryOf(kind).roles, role)
}

/** The roles an invitation or a role change may give: the owner of a shared account is fixed. */
export function assignableRoles(kind: MemberKind) {
  const { roles, ownerRole, ownerFixed } = registryOf(kind)

  return ownerFixed ? roles.filter(role => role.value !== ownerRole) : roles
}

/** The roles a new invitation may still give: the single partner, once taken, is not offered. */
export function invitableRoles(kind: MemberKind, list: readonly WorkspaceMember[]) {
  const { singleRole } = registryOf(kind)

  const taken = singleRole !== null && list.some(member => member.role === singleRole)

  return assignableRoles(kind).filter(role => !taken || role.value !== singleRole)
}

/** The kind's usual invitation role while it is free, else the first role left. */
export function defaultInviteRole(kind: MemberKind, list: readonly WorkspaceMember[]): string {
  const options = invitableRoles(kind, list)

  const preferred = registryOf(kind).defaultInviteRole

  return options.some(role => role.value === preferred) ? preferred : options[0]?.value ?? preferred
}

export function inviteSheetTitle(kind: MemberKind): string {
  return kind === 'shared' ? 'دعوت عضو' : 'دعوت اعضا'
}

/** «ویرایش» / «فقط مشاهده»: the Drive access of a member, with the raise a writing switch causes. */
export function driveAccessLabel(
  kind: MemberKind,
  role: string,
  overrides: Overrides = {}
): string {
  const registry = registryOf(kind)

  if (registry.driveRole[role] === 'writer') return 'ویرایش'

  const raised =
    registry.raisesDriveOnWrite &&
    registry.writePermissions.some(permission =>
      effectivePermission({ email: '', role, overrides }, permission, kind)
    )

  return raised ? 'ویرایش' : 'فقط مشاهده'
}

/** The line under a member's e-mail and under the switches. */
export function driveAccessLine(kind: MemberKind, role: string, overrides?: Overrides): string {
  return driveAccessLabel(kind, role, overrides) === 'ویرایش'
    ? 'دسترسی ویرایش در گوگل‌درایو'
    : 'فقط مشاهده در گوگل‌درایو'
}

const INTRO: Record<MemberKind, string> = {
  building:
    'مدیر نقش هر عضو را تعیین می‌کند و در صورت نیاز دسترسی‌های او را کم یا زیاد می‌کند. با تغییر نقش، دسترسی‌های تغییر داده‌شده به حالت معمول آن نقش برمی‌گردد. همیشه حداقل یک مدیر لازم است.',
  shared:
    'مالک نقش هر عضو را تعیین می‌کند و در صورت نیاز دسترسی‌های او را کم یا زیاد می‌کند. با تغییر نقش، دسترسی‌های تغییر داده‌شده به حالت معمول آن نقش برمی‌گردد. حساب مشترک یک شریک دارد و هر تعداد ناظر.'
}

/** The text above the list; a shared account's partner or viewer only looks at it. */
export function membersIntro(kind: MemberKind, readOnly = false): string {
  return readOnly
    ? 'اعضا و نقش‌هایشان را اینجا می‌بینید؛ فقط مالک می‌تواند آن‌ها را عوض کند.'
    : INTRO[kind]
}

export function inviteButtonLabel(kind: MemberKind): string {
  return kind === 'shared' ? '+ دعوت' : '+ دعوت عضو'
}

export function removeMemberMessage(kind: MemberKind, email: string): string {
  return kind === 'shared'
    ? `دسترسی ${email} قطع شود؟ او دیگر به حساب مشترک دسترسی ندارد و اشتراک فایل او در گوگل‌درایو هم برداشته می‌شود. ثبت‌هایی که نوشته برای بقیه می‌ماند.`
    : `دسترسی ${email} قطع شود؟ او دیگر نقشی در این ساختمان ندارد و اشتراک فایل او در گوگل‌درایو هم برداشته می‌شود.`
}

export function inviteSheetNote(kind: MemberKind): string {
  const file = kind === 'shared' ? 'فایل حساب مشترک' : 'فایل ساختمان'

  return `با «+ افزودن» گوگل برای او ایمیل دعوت می‌فرستد و ${file} با نقش انتخابی‌اش به اشتراک گذاشته می‌شود. اگر ارسال نشد، فایل را خودت در گوگل‌درایو به اشتراک بگذار و «کپی متن دعوت» را برایش بفرست.`
}

/** Shown under the switches of a member Drive lets only read, though a writing switch is on. */
export function readOnlyWriterNote(kind: MemberKind): string {
  return kind === 'shared'
    ? 'چون کار نوشتن به این عضو داده شده، دسترسی او در گوگل‌درایو هم به «ویرایش» بالا می‌رود.'
    : 'این عضو در گوگل‌درایو فقط می‌تواند ببیند؛ برای ثبت کار باید در گوگل‌درایو دسترسی «ویرایش» هم به او بدهی.'
}

/** The honest line of the spec: the app limits screens, the Drive share is the real access. */
export function accessHonestyNote(kind: MemberKind): string | null {
  return kind === 'shared'
    ? 'دسترسی واقعی همان اشتراک گوگل‌درایو است؛ برنامه فقط صفحه‌ها و دکمه‌ها را محدود می‌کند و هر کس در درایو «ویرایش» داشته باشد می‌تواند فایل را مستقیم تغییر بدهد.'
    : null
}

export const OWNER_LOCKED_NOTE = 'مالک فایل است. نقش و دسترسی مالک تغییر نمی‌کند.'
