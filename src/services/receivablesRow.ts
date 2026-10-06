import type { Receivable, ReceivablePayment } from '../types'
import { parseNumeric } from '../utils/parseNumeric'
import { isJsonArrayCell, isNumericCell, isPlainNumberCell } from '../utils/sheetValues'

export const RECEIVABLES_SHEET = 'طلب‌ها'

export const RECEIVABLES_HEADERS = [
  'شناسه',
  'زمان ثبت',
  'عنوان',
  'طرف حساب',
  'دسته‌بندی',
  'مبلغ',
  'تاریخ قرض',
  'توضیحات',
  'پرداخت‌ها',
  'زیردسته'
]

export function parsePayments(raw: string): ReceivablePayment[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as ReceivablePayment[]

    if (Array.isArray(parsed)) return parsed
  } catch {
    /* use default */
  }

  return []
}

type ReceivableRowLayout = 'legacy' | 'withTitle' | 'withCategory'

/**
 * Three column layouts exist in users' sheets. The plain `Number()` checks run first so
 * rows that already parsed keep their layout; the tolerant checks only rescue rows whose
 * amount is formatted (`1,500,000`, Persian digits) and used to fall through.
 */
export function detectReceivableRowLayout(row: string[]): ReceivableRowLayout {
  if (isPlainNumberCell(row[3])) return 'legacy'
  if (isPlainNumberCell(row[5])) return 'withTitle'
  if (isNumericCell(row[3]) && isJsonArrayCell(row[6])) return 'legacy'
  if (isNumericCell(row[5]) && isJsonArrayCell(row[8])) return 'withTitle'

  return 'withCategory'
}

export function rowToReceivable(
  row: string[],
  rowNumber: number
): Receivable & { rowNumber: number } {
  const layout = detectReceivableRowLayout(row)

  if (layout === 'legacy') {
    return {
      rowNumber,
      id: row[0] ?? '',
      createdAt: row[1] ?? '',
      title: '',
      debtor: row[2] ?? '',
      category: 'سایر',
      amount: parseNumeric(row[3]),
      borrowDate: row[4] ?? '',
      note: row[5] ?? '',
      payments: parsePayments(row[6] ?? '')
    }
  }

  if (layout === 'withTitle') {
    return {
      rowNumber,
      id: row[0] ?? '',
      createdAt: row[1] ?? '',
      title: row[2] ?? '',
      debtor: row[3] ?? '',
      category: row[4] ?? 'سایر',
      amount: parseNumeric(row[5]),
      borrowDate: row[6] ?? '',
      note: row[7] ?? '',
      subCategory: row[9] ?? '',
      payments: parsePayments(row[8] ?? '')
    }
  }

  return {
    rowNumber,
    id: row[0] ?? '',
    createdAt: row[1] ?? '',
    title: '',
    debtor: row[2] ?? '',
    category: row[3] ?? 'سایر',
    amount: parseNumeric(row[4]),
    borrowDate: row[5] ?? '',
    note: row[6] ?? '',
    payments: parsePayments(row[7] ?? '')
  }
}

export function receivableToRow(receivable: Receivable): string[] {
  return [
    receivable.id,
    receivable.createdAt,
    receivable.title,
    receivable.debtor,
    receivable.category,
    String(receivable.amount),
    receivable.borrowDate,
    receivable.note,
    JSON.stringify(receivable.payments),
    receivable.subCategory ?? ''
  ]
}

export function paidAmount(receivable: Receivable): number {
  return receivable.payments.reduce((sum, p) => sum + p.amount, 0)
}

export function remainingAmount(receivable: Receivable): number {
  return Math.max(0, receivable.amount - paidAmount(receivable))
}

export function isReceivableComplete(receivable: Receivable): boolean {
  return remainingAmount(receivable) <= 0
}

export function getReceivableDisplayTitle(
  receivable: Pick<Receivable, 'title' | 'debtor'>
): string {
  return receivable.title.trim() || receivable.debtor
}

export function sortReceivables<T extends Receivable>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aComplete = isReceivableComplete(a)

    const bComplete = isReceivableComplete(b)

    if (aComplete !== bComplete) return aComplete ? 1 : -1

    return (b.borrowDate || '').localeCompare(a.borrowDate || '')
  })
}
