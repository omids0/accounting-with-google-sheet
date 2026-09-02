import type { Receivable, ReceivablePayment } from '../types'

export const RECEIVABLES_SHEET = 'طلب‌ها'

export const RECEIVABLES_HEADERS = [
  'شناسه',
  'زمان ثبت',
  'نام',
  'دسته‌بندی',
  'مبلغ',
  'تاریخ قرض',
  'توضیحات',
  'پرداخت‌ها'
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

function isLegacyReceivableRow(row: string[]): boolean {
  const amountAt3 = Number(row[3])

  return row[3] !== '' && !Number.isNaN(amountAt3)
}

export function rowToReceivable(
  row: string[],
  rowNumber: number
): Receivable & { rowNumber: number } {
  if (isLegacyReceivableRow(row)) {
    return {
      rowNumber,
      id: row[0] ?? '',
      createdAt: row[1] ?? '',
      debtor: row[2] ?? '',
      category: 'سایر',
      amount: Number(row[3]) || 0,
      borrowDate: row[4] ?? '',
      note: row[5] ?? '',
      payments: parsePayments(row[6] ?? '')
    }
  }

  return {
    rowNumber,
    id: row[0] ?? '',
    createdAt: row[1] ?? '',
    debtor: row[2] ?? '',
    category: row[3] ?? 'سایر',
    amount: Number(row[4]) || 0,
    borrowDate: row[5] ?? '',
    note: row[6] ?? '',
    payments: parsePayments(row[7] ?? '')
  }
}

export function receivableToRow(receivable: Receivable): string[] {
  return [
    receivable.id,
    receivable.createdAt,
    receivable.debtor,
    receivable.category,
    String(receivable.amount),
    receivable.borrowDate,
    receivable.note,
    JSON.stringify(receivable.payments)
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

export function sortReceivables<T extends Receivable>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aComplete = isReceivableComplete(a)

    const bComplete = isReceivableComplete(b)

    if (aComplete !== bComplete) return aComplete ? 1 : -1

    return (b.borrowDate || '').localeCompare(a.borrowDate || '')
  })
}
