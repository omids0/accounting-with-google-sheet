import { unitOpenReceivables, type UnitCredit } from './buildingCharges'
import { monthName } from './buildingMonths'
import { unitOfReference } from './buildingSummary'
import { paidAmount, remainingAmount } from './receivablesRow'
import type { Receivable } from '../types'
import { formatMoney } from '../utils/formatMoney'
import { addJalaliMonths, isoToJalali } from '../utils/jalaliDate'
import { toPersianDigits } from '../utils/normalizeDigits'

/** How far back «پرداخت‌های اخیر» looks. */
const RECENT_MONTHS = 3

/** «مهر» for a month's charge, «بدهی قبلی», «سهم عمرانی»: the receivable without its unit suffix. */
export function itemLabel(item: Receivable): string {
  const reference = item.reference ?? ''

  if (reference.startsWith('charge:')) return monthName(reference.split(':')[2] ?? '')
  if (reference.startsWith('opening:')) return 'بدهی قبلی'
  if (reference.startsWith('share:')) return `سهم ${item.subCategory || 'هزینه'}`

  return item.title
}

export type StatementKind = 'charge' | 'share' | 'opening'

export interface StatementItem {
  id: string
  label: string
  kind: StatementKind
  /** A capital share addressed to the owner («به نام مالک»). */
  ownerNamed: boolean
  due: string
  open: number
  paid: number
}

export interface PaidItem {
  id: string
  label: string
  paidAt: string
  amount: number
  fromCredit: boolean
}

export interface UnitStatementData {
  items: StatementItem[]
  /** Payments of the last three months, newest first. */
  paid: PaidItem[]
  totalOpen: number
  credit: number
}

/** The statement of one unit: what is open (oldest first), what was paid lately, the credit. */
export function buildStatement(input: {
  unitId: string
  receivables: Receivable[]
  credits: UnitCredit[]
  /** Counterparty id of the unit's current owner. */
  ownerId: string
  todayIso: string
}): UnitStatementData {
  const { unitId, receivables, credits, ownerId, todayIso } = input

  const own = receivables.filter(item => unitOfReference(item.reference ?? '') === unitId)

  const since = addJalaliMonths(todayIso, -RECENT_MONTHS, isoToJalali(todayIso).day)

  const items = unitOpenReceivables(unitId, own).map<StatementItem>(item => {
    const kind = (item.reference ?? '').split(':')[0] as StatementKind

    return {
      id: item.id,
      label: itemLabel(item),
      kind,
      ownerNamed: kind === 'share' && !!ownerId && item.debtorId === ownerId,
      due: item.borrowDate,
      open: remainingAmount(item),
      paid: paidAmount(item)
    }
  })

  return {
    items,
    paid: own
      .flatMap(item =>
        item.payments
          .filter(payment => payment.paidAt.slice(0, 10) >= since.slice(0, 10))
          .map<PaidItem>(payment => ({
            id: payment.id,
            label: itemLabel(item),
            paidAt: payment.paidAt,
            amount: payment.amount,
            fromCredit: payment.fromCredit === true
          }))
      )
      .sort((a, b) => b.paidAt.localeCompare(a.paidAt)),
    totalOpen: items.reduce((sum, item) => sum + item.open, 0),
    credit: credits
      .filter(item => item.unitId === unitId)
      .reduce((sum, item) => sum + item.amount, 0)
  }
}

/** Who and where a statement or reminder is for. */
export interface StatementHeader {
  building: string
  unitNumber: string
  debtor: string
  /** The fund account's card number, '' when it has none. */
  card: string
}

const unitLine = ({ unitNumber, debtor }: StatementHeader) =>
  `واحد ${toPersianDigits(unitNumber)}${debtor ? ` · ${debtor}` : ''}`

/** The text «اشتراک صورت‌حساب» shares. */
export function statementText(header: StatementHeader, data: UnitStatementData): string {
  const lines = data.items.map(
    item => `• ${item.label}${item.ownerNamed ? ' (به نام مالک)' : ''}: ${formatMoney(item.open)}`
  )

  return [
    `صورت‌حساب ساختمان ${header.building}`,
    unitLine(header),
    ...(lines.length ? lines : ['بدهی باز ندارید ✓']),
    '—',
    `جمع بدهی: ${formatMoney(data.totalOpen)}`,
    data.credit ? `اعتبار: ${formatMoney(data.credit)}` : '',
    header.card ? `کارت صندوق: ${toPersianDigits(header.card)}` : ''
  ]
    .filter(Boolean)
    .join('\n')
}

/** The text «یادآوری» shares: a polite one-liner with the amount and the card. */
export function reminderText(header: StatementHeader, open: number): string {
  return [
    `سلام${header.debtor ? ` ${header.debtor}` : ''} عزیز، یادآوری شارژ ساختمان ${
      header.building
    }:`,
    `بدهی واحد ${toPersianDigits(header.unitNumber)} مبلغ ${formatMoney(open)} است.`,
    header.card ? `شماره کارت: ${toPersianDigits(header.card)}` : ''
  ]
    .filter(Boolean)
    .join('\n')
}
