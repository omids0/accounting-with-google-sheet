import { paidAmount, remainingAmount } from './receivablesRow'
import type { Receivable } from '../types'
import { jalaliToIso } from '../utils/jalaliDate'
import { normalizeDigits } from '../utils/normalizeDigits'

const monthOf = (item: Receivable): string =>
  item.reference?.startsWith('charge:') ? item.reference.split(':')[2] ?? '' : ''

/** Every month a charge was issued for, newest first. */
export function chargeMonthKeys(receivables: Receivable[]): string[] {
  return [...new Set(receivables.map(monthOf).filter(Boolean))].sort().reverse()
}

export type ChargeStatus = 'paid' | 'partial' | 'open'

export function chargeStatus(item: Receivable): ChargeStatus {
  if (remainingAmount(item) <= 0) return 'paid'

  return paidAmount(item) > 0 ? 'partial' : 'open'
}

/** One month as its card shows it: «۱۲ واحد · سررسید …», billed, collected, who is left. */
export interface ChargeMonthCardData {
  monthKey: string
  units: number
  /** ISO due date of the month's charges. */
  due: string
  /** ISO day the first charge was written; '' when its `createdAt` cannot be read. */
  issuedAt: string
  billed: number
  collected: number
  /** Units that still owe this month's charge, whole or in part. */
  openUnits: number
  /** Of those, the ones that paid part of it. */
  partialUnits: number
}

/**
 * The ISO day of a `createdAt` stamp written by `toLocaleString('fa-IR')`: «۱۴۰۵/۷/۲۹، ۱۰:۰۷:۰۶»
 * (the separator is an Arabic or a Latin comma depending on the engine).
 */
export function createdDay(createdAt: string): string {
  const match = /(\d{4})\/(\d{1,2})\/(\d{1,2})/.exec(normalizeDigits(createdAt))

  return match ? jalaliToIso(Number(match[1]), Number(match[2]), Number(match[3])) : ''
}

export function chargeMonthCard(receivables: Receivable[], monthKey: string): ChargeMonthCardData {
  const rows = receivables.filter(item => monthOf(item) === monthKey)

  const owing = rows.filter(item => chargeStatus(item) !== 'paid')

  return {
    monthKey,
    units: rows.length,
    due: rows[0]?.borrowDate ?? '',
    issuedAt: createdDay(rows[0]?.createdAt ?? ''),
    billed: rows.reduce((sum, item) => sum + item.amount, 0),
    collected: rows.reduce((sum, item) => sum + paidAmount(item), 0),
    openUnits: owing.length,
    partialUnits: owing.filter(item => chargeStatus(item) === 'partial').length
  }
}

/** The month's charges with their status: open first, then partial, then paid. */
export function monthChargeRows<T extends Receivable>(
  receivables: T[],
  monthKey: string
): { receivable: T; status: ChargeStatus }[] {
  const rank: Record<ChargeStatus, number> = { open: 0, partial: 1, paid: 2 }

  return receivables
    .filter(item => monthOf(item) === monthKey)
    .map(receivable => ({ receivable, status: chargeStatus(receivable) }))
    .sort((a, b) => rank[a.status] - rank[b.status])
}
