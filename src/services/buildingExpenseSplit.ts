import type { SplitMode } from '../components/buildings/buildingOptions'
import {
  BUILDING_FIELD_IDS,
  EXPENSE_KIND_FIELD_ID,
  isNonFundPayer,
  PAYER_FIELD_ID,
  SPLIT_FIELD_ID
} from '../components/form/buildingFields'
import { WALLET_ACCOUNT_FIELD_ID } from '../components/form/fieldUtils'
import { formatPersianNumber } from '../utils/formatMoney'
import { parseNumeric } from '../utils/parseNumeric'

/**
 * What the «تقسیم» column of an expense record holds (JSON): how the amount was divided over the
 * units, and whether the shares were issued to them as receivables. Kept free of heavy imports:
 * the records list reads it too.
 */
export interface ExpenseSplit {
  mode: SplitMode
  shares: Record<string, number>
  charge: boolean
}

const MODES: SplitMode[] = ['equal', 'area', 'people', 'manual']

export function parseSplit(raw: unknown): ExpenseSplit | null {
  const text = String(raw ?? '').trim()

  if (!text) return null

  try {
    const parsed = JSON.parse(text) as Partial<ExpenseSplit> | null

    if (!parsed || typeof parsed !== 'object' || !parsed.shares) return null

    const shares: Record<string, number> = {}

    for (const [unitId, amount] of Object.entries(parsed.shares)) {
      shares[unitId] = Math.max(0, Math.round(Number(amount) || 0))
    }

    return {
      mode: MODES.includes(parsed.mode as SplitMode) ? (parsed.mode as SplitMode) : 'equal',
      shares,
      charge: parsed.charge !== false
    }
  } catch {
    return null
  }
}

export const serializeSplit = (split: ExpenseSplit | null): string =>
  split ? JSON.stringify(split) : ''

/** `share:<unitId>:<recordId>`: the key that makes issuing a record's shares idempotent. */
export const EXPENSE_SHARE_PREFIX = 'share:'

export const shareReference = (unitId: string, recordId: string) =>
  `${EXPENSE_SHARE_PREFIX}${unitId}:${recordId}`

/** The debt a non-fund payer leaves has a fixed id, so saving the record again finds it. */
const EXPENSE_DANG_PREFIX = 'exp-'

export const dangIdForExpense = (recordId: string) => `${EXPENSE_DANG_PREFIX}${recordId}`

/** The expense record a debt was made from ('' for a debt entered by hand). */
export const expenseIdOfDang = (dangId: string) =>
  dangId.startsWith(EXPENSE_DANG_PREFIX) ? dangId.slice(EXPENSE_DANG_PREFIX.length) : ''

/** Amount minus the sum of the shares: 0 when the split is complete. */
export function splitDifference(amount: number, shares: Record<string, number>): number {
  return Math.round(amount) - Object.values(shares).reduce((sum, share) => sum + (share || 0), 0)
}

type Values = Record<string, string | number | undefined>

/** True for a record that carries any of the three building columns. */
export const isBuildingExpenseValues = (values: Values): boolean =>
  BUILDING_FIELD_IDS.some(id => String(values[id] ?? '').trim() !== '')

/**
 * A building expense about to be written: a payer other than the fund moves no balance (the money
 * is a debt to that person), so the account is dropped; an empty split stays empty. Other records
 * pass through untouched.
 */
export function prepareBuildingExpenseValues<T extends Values>(values: T): T {
  const payer = String(values[PAYER_FIELD_ID] ?? '').trim()

  if (!payer && !String(values[EXPENSE_KIND_FIELD_ID] ?? '').trim()) return values

  return isNonFundPayer(payer) ? { ...values, [WALLET_ACCOUNT_FIELD_ID]: '' } : values
}

/** Why a building expense cannot be saved yet (a manual split that does not add up), or null. */
export function buildingExpenseError(values: Values): string | null {
  const split = parseSplit(values[SPLIT_FIELD_ID])

  if (!split?.charge || split.mode !== 'manual') return null

  const difference = splitDifference(parseNumeric(values.amount), split.shares)

  return difference === 0
    ? null
    : `جمع سهم‌ها ${formatPersianNumber(Math.abs(difference))} ${
        difference > 0 ? 'کمتر' : 'بیشتر'
      } از مبلغ هزینه است`
}
