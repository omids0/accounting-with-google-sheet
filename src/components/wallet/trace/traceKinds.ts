import type { TraceKind } from '../../../services/walletTraceTypes'

/** The short chip on a finding row: what kind of cause it is. */
export const TRACE_KIND_LABELS: Record<TraceKind, string> = {
  'no-account': 'بدون حساب',
  unapplied: 'بدون اثر بر موجودی',
  'no-ledger': 'بدون ردّ در گردش',
  'amount-mismatch': 'مبلغ نمی‌خواند',
  'future-dated': 'تاریخ آینده',
  backdated: 'تاریخ قدیمی',
  'in-anchor': 'دوبار شمرده شده',
  'orphan-ledger': 'رکورد ناپیدا',
  'unlinked-ledger': 'گردش بدون رکورد',
  'outside-ledger': 'تغییر بدون گردش',
  'deleted-account': 'حساب حذف‌شده',
  'manual-balance': 'ویرایش دستی',
  'initial-balance': 'حساب جدید',
  goal: 'هدف پس‌انداز',
  plug: 'اصلاح قبلی'
}

/** Rows shown before «نمایش همه» in one section. */
export const TRACE_SECTION_LIMIT = 6
