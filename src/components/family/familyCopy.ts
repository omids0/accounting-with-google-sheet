import type { ParentAccess } from '../../services/parentAccess'
import { toPersianDigits } from '../../utils/normalizeDigits'

/**
 * The Persian words of the parents feature, kept apart from the screens so they can be tested and
 * so both sides say the same thing. Every sentence starts with a Persian word (RTL lines).
 */

/**
 * The fixed sentence on the child's «والدین من». Honest: the app has no remove button, but the file
 * is the child's, so Google Drive can always end the access.
 */
export const ACCESS_END_NOTE =
  'در اپ دکمهٔ قطع وجود ندارد؛ قطع دسترسی فقط از گوگل‌درایو ممکن است. والد پس از قطع، «دسترسی قطع شد» را می‌بیند.'

/** The warning above the consent box: Drive access shows the whole file, card numbers included. */
export const PARENT_DRIVE_WARNING =
  'والد با گوگل‌درایو کل فایل، از جمله شمارهٔ کارت‌ها اگر ثبت کرده‌اید، را می‌تواند ببیند.'

/** What a parent sees of the child's account, exactly (the child reads this before consenting). */
export const PARENT_SEES = [
  'همهٔ درآمدها و هزینه‌هایی که ثبت می‌کنید، با تاریخ، مبلغ، دسته‌بندی و توضیح',
  'دسته‌بندی‌ها و بودجه‌هایی که تعیین کرده‌اید',
  'موجودی کیف پول (نام حساب‌ها و مانده)'
]

export const PARENT_DOES_NOT_SEE = [
  'رمز یا پین اپ و قفل برنامه',
  'هیچ چیز را تغییر یا حذف نمی‌کند؛ فقط می‌بیند'
]

export const PARENT_RAW_SHEET_NOTE =
  'والد با دسترسی گوگل‌شیت می‌تواند خودِ فایل را هم در گوگل‌درایو باز کند و برگه‌های دیگر آن را ببیند.'

export const CHILD_OWNS_FILE_NOTE =
  'فایل مال شماست و اشتراکش را از گوگل‌درایو می‌توانید بردارید؛ در این صورت والد «دسترسی قطع شد» را می‌بیند.'

/** The status chip of a parent in the child's list. */
export const PARENT_STATUS_LABELS: Record<ParentAccess['status'], string> = {
  active: 'فعال',
  revoked: 'دسترسی قطع شد',
  unverified: 'تأییدنشده'
}

export const PARENT_STATUS_HINTS: Record<ParentAccess['status'], string> = {
  active: 'این والد حساب شما را می‌بیند',
  revoked: 'دسترسی والد برداشته شده و دیگر حساب را نمی‌بیند',
  unverified: 'الان نمی‌شود با گوگل‌درایو تطبیق داد (شاید آفلاین هستید)؛ فرض بر این است که می‌بیند'
}

/** The summary above the parent list: who can see the account right now. */
export function parentsSummary(list: readonly ParentAccess[]): string {
  const seeing = list.filter(parent => parent.status !== 'revoked').length

  return seeing
    ? `${
        seeing === 1 ? 'یک والد' : `${toPersianDigits(String(seeing))} والد`
      } همین حالا حساب شما را می‌بیند`
    : 'در حال حاضر هیچ والدی حساب شما را نمی‌بیند'
}

/** The question before «حذف از فهرست»: what happens, and what never does. */
export function forgetChildQuestion(name: string): string {
  return `«${name}» از فهرست فرزندان شما حذف شود؟ دیگر نمی‌توانید حسابش را ببینید و اپ تلاش می‌کند دسترسی شما را در گوگل‌درایو او هم بردارد. حساب و ثبت‌های فرزند هیچ تغییری نمی‌کند.`
}

/** What «حذف از فهرست» did: `local` is the honest case (the share is still in the child's Drive). */
export function forgetChildResultMessage(result: 'removed' | 'local' | 'blocked'): {
  kind: 'success' | 'error'
  text: string
} {
  if (result === 'removed') {
    return { kind: 'success', text: 'فرزند حذف شد و دسترسی شما در گوگل‌درایو هم برداشته شد' }
  }
  if (result === 'local') {
    return {
      kind: 'success',
      text: 'فرزند از این دستگاه حذف شد؛ اشتراک فایل هنوز در گوگل‌درایو فرزند مانده. برای برداشتنش، از فرزندتان بخواهید یا آن را در گوگل‌درایو خودتان از «اشتراک‌گذاشته‌شده با من» حذف کنید.'
    }
  }

  return { kind: 'error', text: 'برای حذف، اول باید حساب شخصی شما باز شود' }
}

/** The empty state of «فرزندان من». */
export const CHILDREN_EMPTY = {
  message: 'هنوز فرزندی اضافه نکرده‌اید',
  description:
    'اگر نوجوانتان با این اپ حساب‌وکتاب می‌نویسد، می‌توانید فقط برای دیدن، درآمد و خرجش را دنبال کنید و در کنترل خرج‌ها کمکش کنید. فرزندتان باید خودش از منوی «والدین من» اجازه بدهد؛ بدون اجازهٔ او چیزی دیده نمی‌شود.'
}
