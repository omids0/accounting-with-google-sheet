import { useState } from 'react'

import {
  applyNotice,
  dismissNotice,
  type SharedNotice,
  type StoredNotice
} from '../../services/sharedNotices'
import { formatMoney } from '../../utils/formatMoney'
import { showError, showSuccess } from '../../utils/toast'
import ConfirmActionModal from '../ConfirmActionModal'

/** The shared account edits only a record's amount (or deletes it): no other field is named. */
const FIELD_WORD: Partial<Record<SharedNotice['field'], string>> = { amount: 'مبلغ' }

/** A cell as the user reads it: an amount in money, a split in words. */
export function noticeValue(
  notice: SharedNotice,
  value: string,
  nameOf: (email: string) => string
): string {
  if (notice.field === 'amount') return formatMoney(Number(value) || 0)
  if (notice.field !== 'split') return value || '—'

  return value.startsWith('only:') ? `فقط برای ${nameOf(value.slice(5))}` : 'نصف‌نصف'
}

/** «مینا مبلغ «شام» را در حساب مشترک عوض کرد» / «مینا «شام» را از حساب مشترک حذف کرد». */
export function noticeSentence(notice: SharedNotice, who: string, place = 'حساب مشترک'): string {
  const title = `«${notice.title || 'یک ثبت'}»`
  const word = FIELD_WORD[notice.field]

  return notice.kind === 'delete'
    ? `${who} ${title} را از ${place} حذف کرد`
    : `${who} ${word ? `${word} ` : ''}${title} را در ${place} عوض کرد`
}

interface SharedNoticeSheetProps {
  sharedId: string
  notice: StoredNotice | null
  nameOf: (email: string) => string
  /** Opened from the personal edit form: applying there is done by saving the form. */
  inForm?: boolean
  onApplied?: () => void
  onClose: () => void
}

/**
 * «تغییر در ثبت مشترک»: before and after, «اعمال در ثبت شخصی من» or «نادیده بگیر»; both remove
 * the notice and leave the shared copy as the partner left it. A deletion or a split (the personal
 * record has none) only needs «باشه»; a deletion also clears the personal record's shared marker.
 */
export default function SharedNoticeSheet({
  sharedId,
  notice,
  nameOf,
  inForm = false,
  onApplied,
  onClose
}: SharedNoticeSheetProps) {
  const [busy, setBusy] = useState(false)

  if (!notice) return null

  const plain = notice.kind === 'delete' || notice.field === 'split'
  const run = async (apply: boolean) => {
    setBusy(true)
    try {
      // A deletion clears the marker either way: the copy is gone.
      const done = apply || notice.kind === 'delete' ? await applyNotice(notice) : 'skipped'

      await dismissNotice(sharedId, notice.id)
      if (done === 'applied') onApplied?.()
      if (apply && done === 'applied' && notice.kind === 'edit') showSuccess('در ثبت شخصی اعمال شد')
      if (apply && done === 'skipped' && notice.kind === 'edit') {
        showError('ثبت شخصی تغییر نکرد: این دسته یا خود ثبت در حساب شخصی شما نیست')
      }
      onClose()
    } catch {
      showError('اعلان به‌روز نشد؛ اتصال را بررسی کنید و دوباره امتحان کنید')
    } finally {
      setBusy(false)
    }
  }
  const change =
    notice.kind === 'delete'
      ? 'ثبت شخصی شما می‌ماند و دیگر به حساب مشترک وصل نیست.'
      : `قبل: ${noticeValue(notice, notice.old, nameOf)}\nبعد: ${noticeValue(
          notice,
          notice.new,
          nameOf
        )}`
  const footer = inForm
    ? 'برای اعمال، همین فرم را عوض کنید و ذخیره کنید.'
    : 'در هر دو حالت نسخهٔ حساب مشترک همان‌طور که ویرایش شده می‌ماند.'

  return (
    <ConfirmActionModal
      open
      title="تغییر در ثبت مشترک"
      message={`${noticeSentence(notice, nameOf(notice.by))}.\n${change}\n${footer}`}
      confirming={busy}
      confirmLabel={inForm || plain ? 'باشه' : 'اعمال در ثبت شخصی من'}
      cancelLabel={plain && !inForm ? 'بعداً' : 'نادیده بگیر'}
      onConfirm={() => (inForm ? onClose() : void run(notice.field !== 'split'))}
      onCancel={plain && !inForm ? onClose : () => void run(false)}
      onClose={onClose}
    />
  )
}
