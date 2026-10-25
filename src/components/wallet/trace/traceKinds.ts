import type { TraceKind } from '../../../services/walletTraceTypes'

/** The short chip on a finding row: what kind of cause it is. */
export const TRACE_KIND_LABELS: Record<TraceKind, string> = {
  'no-account': 'بدون حساب',
  'pre-accounts': 'قبل از گردش حساب',
  unapplied: 'بدون اثر بر موجودی',
  'no-ledger': 'ثبت‌نشده در گردش',
  'amount-mismatch': 'مبلغ نمی‌خواند',
  'future-dated': 'تاریخ آینده',
  backdated: 'تاریخ قدیمی',
  'in-anchor': 'دوبار شمرده شده',
  'orphan-ledger': 'رکورد ناپیدا',
  'unlinked-ledger': 'تغییر بدون رکورد',
  'outside-ledger': 'تغییر ثبت‌نشده',
  'deleted-account': 'حساب حذف‌شده',
  'manual-balance': 'ویرایش دستی',
  'initial-balance': 'حساب جدید',
  goal: 'هدف پس‌انداز',
  plug: 'اصلاح قبلی'
}

/** Rows one section shows at first, and adds per «نمایش بیشتر». */
export const TRACE_SECTION_LIMIT = 20
