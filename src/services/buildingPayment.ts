import { creditReference, unitOpenReceivables } from './buildingCharges'
import { itemLabel } from './buildingStatement'
import { addReceivablePayment, createReceivable, fetchReceivables } from './receivablesCrud'
import { remainingAmount } from './receivablesRow'
import type { SettleOptions } from './settleOptions'
import { createLinkedRecordWithWallet } from './settleRecords'
import type { Receivable } from '../types'
import { formatMoney } from '../utils/formatMoney'
import { toPersianDigits } from '../utils/normalizeDigits'
import { BUILDING_CHARGE_CATEGORY } from '../utils/protectedCategories'

export interface PaymentPart<T extends Receivable = Receivable> {
  receivable: T
  use: number
  /** The part pays the receivable off. */
  closes: boolean
}

export interface Allocation<T extends Receivable = Receivable> {
  parts: PaymentPart<T>[]
  /** What is left after every open receivable is paid: the unit's credit if it is kept. */
  overflow: number
}

/**
 * Spreads a payment over the unit's open receivables, oldest debt first (`open` is already in
 * that order, see `unitOpenReceivables`). The last one may be paid in part; whatever is left
 * over is the overflow.
 */
export function allocatePayment<T extends Receivable>(open: T[], amount: number): Allocation<T> {
  const parts: PaymentPart<T>[] = []

  let left = Math.max(0, amount)

  for (const receivable of open) {
    if (left <= 0) break

    const owed = remainingAmount(receivable)

    const use = Math.min(left, owed)

    if (use > 0) parts.push({ receivable, use, closes: use >= owed })
    left -= use
  }

  return { parts, overflow: left }
}

/** «تسویه می‌کند: مرداد ✓ · شهریور ✓ · مهر (۴۰۰٬۰۰۰ می‌ماند)». */
export function allocationText(parts: PaymentPart[]): string {
  if (!parts.length) return ''

  return `تسویه می‌کند: ${parts
    .map(({ receivable, use, closes }) =>
      closes
        ? `${itemLabel(receivable)} ✓`
        : `${itemLabel(receivable)} (${formatMoney(remainingAmount(receivable) - use)} می‌ماند)`
    )
    .join(' · ')}`
}

/** What a saved payment did; the receipt is made from it. */
export interface PaymentResult {
  unitId: string
  unitNumber: string
  debtor: string
  /** ISO date of the payment. */
  date: string
  /** Everything recorded as income: `applied` plus the kept `credit`. */
  amount: number
  applied: number
  credit: number
  /** Labels of what was paid: «مرداد», «بدهی قبلی». */
  months: string[]
  /** Still owed by the unit after this payment. */
  remaining: number
  accountTitle: string
}

export interface UnitPaymentInput {
  unit: { id: string; number: string }
  debtor: { id: string; name: string } | null
  amount: number
  /** An amount over the debt is kept as the unit's credit; off, only the debt is recorded. */
  keepCredit: boolean
  /** The settle sheet's answers: date, fund account, balance switch, or a linked record. */
  options: SettleOptions
  accountTitle: string
}

/**
 * Records a payment for a unit: ONE income record for the deposit (so the fund ledger matches the
 * bank), a payment on each receivable it settles (oldest first, the last one possibly in part),
 * and, when the deposit is more than the debt and `keepCredit` is on, a `credit:<unitId>` row
 * that the next issue spends. The receivables are read again first so an issue or payment from
 * another device is taken into account.
 */
export async function payUnit(
  spreadsheetId: string,
  input: UnitPaymentInput
): Promise<PaymentResult> {
  const { unit, debtor, options } = input

  const open = unitOpenReceivables(unit.id, await fetchReceivables(spreadsheetId))

  const { parts, overflow } = allocatePayment(open, input.amount)

  const applied = input.amount - overflow

  const credit = input.keepCredit ? overflow : 0

  const total = applied + credit

  if (!(total > 0)) throw new Error('مبلغ پرداخت را وارد کنید')

  const name = debtor?.name ?? ''

  const recordId = await createLinkedRecordWithWallet(
    spreadsheetId,
    'income',
    {
      title: `شارژ واحد ${toPersianDigits(unit.number)}${name ? ` · ${name}` : ''}`,
      amount: total,
      category: BUILDING_CHARGE_CATEGORY,
      date: options.date
    },
    options
  )

  for (const part of parts) {
    await addReceivablePayment(
      spreadsheetId,
      part.receivable,
      { amount: part.use },
      { ...options, linkRecordId: recordId }
    )
  }

  if (credit > 0) {
    await createReceivable(
      spreadsheetId,
      {
        title: `اعتبار واحد ${toPersianDigits(unit.number)}`,
        debtor: name || `واحد ${toPersianDigits(unit.number)}`,
        debtorId: debtor?.id,
        category: BUILDING_CHARGE_CATEGORY,
        subCategory: 'اعتبار',
        amount: credit,
        borrowDate: options.date,
        note: 'اضافه‌پرداخت؛ در صدور بعدی کسر می‌شود',
        reference: creditReference(unit.id)
      },
      false
    )
  }

  return {
    unitId: unit.id,
    unitNumber: unit.number,
    debtor: name,
    date: options.date,
    amount: total,
    applied,
    credit,
    months: [...new Set(parts.map(part => itemLabel(part.receivable)))],
    remaining: open.reduce((sum, item) => sum + remainingAmount(item), 0) - applied,
    accountTitle: input.accountTitle
  }
}
