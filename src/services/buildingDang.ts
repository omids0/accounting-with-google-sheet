import { expenseIdOfDang } from './buildingExpenseSplit'
import type { Dang } from '../types'
import { TRANSFER_EXPENSE_CATEGORY } from '../utils/protectedCategories'

/** Chips of «بدهی ساختمان»: what the building owes, to whom, and what is settled. */
export type DangChip = 'open' | 'settled' | 'manager' | 'contractor'

export const DANG_CHIPS: { value: DangChip; label: string }[] = [
  { value: 'open', label: 'پرداخت‌نشده' },
  { value: 'settled', label: 'تسویه‌شده' },
  { value: 'manager', label: 'به مدیر' },
  { value: 'contractor', label: 'پیمانکار' }
]

type DangLike = Pick<Dang, 'paid' | 'counterparty'>

const namesOf = (managerNames: string[]) =>
  new Set(managerNames.map(name => name.trim()).filter(Boolean))

/**
 * A debt is owed to the manager when its creditor is the payer «مدیر» or a person flagged `me`
 * (a dang stores the creditor as text); every other open debt is owed to a contractor.
 */
export function filterDangs<T extends DangLike>(
  items: T[],
  chip: DangChip,
  managerNames: string[]
): T[] {
  const managers = namesOf(managerNames)

  const toManager = (item: T) => managers.has(item.counterparty.trim())

  switch (chip) {
    case 'settled':
      return items.filter(item => item.paid)
    case 'manager':
      return items.filter(item => !item.paid && toManager(item))
    case 'contractor':
      return items.filter(item => !item.paid && !toManager(item))
    default:
      return items.filter(item => !item.paid)
  }
}

/** The number shown after each chip. */
export function dangChipCounts<T extends DangLike>(
  items: T[],
  managerNames: string[]
): Record<DangChip, number> {
  return {
    open: filterDangs(items, 'open', managerNames).length,
    settled: filterDangs(items, 'settled', managerNames).length,
    manager: filterDangs(items, 'manager', managerNames).length,
    contractor: filterDangs(items, 'contractor', managerNames).length
  }
}

/** The subcategory of the transfer that repays a debt: «انتقال › بازپرداخت به مدیر». */
export const repaymentSubCategory = (creditor: string) => `بازپرداخت به ${creditor.trim()}`

/**
 * The category of the record a settlement writes. A personal debt is an expense of its category;
 * a building's debt came from an expense already (the one the payer fronted), so repaying it is
 * a transfer out of the fund: one outflow, never a second expense.
 */
export function dangSettlementCategory(
  dang: Pick<Dang, 'category' | 'subCategory' | 'counterparty'>,
  building: boolean
): { category: string; subCategory: string } {
  return building
    ? { category: TRANSFER_EXPENSE_CATEGORY, subCategory: repaymentSubCategory(dang.counterparty) }
    : { category: dang.category, subCategory: dang.subCategory ?? '' }
}

/**
 * The expense records the building's debts came from. The settle sheet must not offer them as
 * «the payment is already recorded»: they are the cost, not the repayment.
 */
export function dangOriginRecordIds(dangs: Pick<Dang, 'id'>[]): string[] {
  return dangs.map(item => expenseIdOfDang(item.id)).filter(Boolean)
}
