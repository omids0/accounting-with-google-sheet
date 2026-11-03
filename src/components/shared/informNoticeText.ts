import { noticeValue } from './SharedNoticeSheet'
import type { SharedNotice } from '../../services/sharedNotices'
import { formatMoneyParts } from '../../utils/formatMoney'

const quoted = (text: string) => `«${text.trim() || '—'}»`

/**
 * The sentence of an inform-only notice (a record made in the shared account that someone else
 * changed): «مادر مبلغ «قبض برق» را از ۸۰۰٬۰۰۰ به ۸۵۰٬۰۰۰ تومان تغییر داد» /
 * «مادر «سوپرمارکت» را حذف کرد». `who` is the editor's name.
 */
export function informSentence(
  notice: SharedNotice,
  who: string,
  nameOf: (email: string) => string
): string {
  const title = quoted(notice.title || 'یک ثبت')

  if (notice.kind === 'delete') return `${who} ${title} را حذف کرد`

  switch (notice.field) {
    case 'amount': {
      const from = formatMoneyParts(Number(notice.old) || 0)
      const to = formatMoneyParts(Number(notice.new) || 0)

      return `${who} مبلغ ${title} را از ${from.number} به ${to.number} ${to.symbol} تغییر داد`
    }
    case 'title':
      return `${who} عنوان ${quoted(notice.old)} را به ${quoted(notice.new)} تغییر داد`
    case 'category':
      return `${who} دستهٔ ${title} را از ${quoted(notice.old)} به ${quoted(notice.new)} تغییر داد`
    default:
      return `${who} تقسیم ${title} را از ${noticeValue(
        notice,
        notice.old,
        nameOf
      )} به ${noticeValue(notice, notice.new, nameOf)} تغییر داد`
  }
}
