import type { IntegrityKind } from '../../../services/integrityTypes'

/** The short chip on a finding row: what kind of problem it is. */
export const INTEGRITY_KIND_LABELS: Record<IntegrityKind, string> = {
  'balance-mismatch': 'موجودی با گردش نمی‌خواند',
  'no-history': 'بدون گردش',
  'record-missing-account': 'حساب رکورد پیدا نشد',
  'transfer-one-leg': 'انتقال نیمه‌کاره',
  'transfer-no-leg': 'انتقال اجرا نشده',
  'duplicate-id': 'شناسهٔ تکراری',
  'outbox-stuck': 'تغییر معلق'
}
