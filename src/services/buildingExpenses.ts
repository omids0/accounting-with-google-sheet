import { chargeDebtor, type ChargeDebtor, type ChargeResident } from './buildingCharges'
import { dangIdForExpense, type ExpenseSplit } from './buildingExpenseSplit'
import { FUND_PAYER, type ManagedItem } from './buildingLists'
import type { BuildingUnit } from './buildingUnits'
import { paidAmount } from './receivablesRow'
import type { SplitMode } from '../components/buildings/buildingOptions'
import type { Dang, Receivable } from '../types'
import { toPersianDigits } from '../utils/normalizeDigits'

export {
  dangIdForExpense,
  EXPENSE_SHARE_PREFIX,
  parseSplit,
  serializeSplit,
  shareReference,
  splitDifference,
  type ExpenseSplit
} from './buildingExpenseSplit'

type Weighted = Pick<BuildingUnit, 'id' | 'area' | 'people'>

/**
 * Splits `amount` over the units. «equal» is one weight each, «area» / «people» use the unit's
 * figure (all zero falls back to equal), «manual» takes the given amounts as they are. The parts
 * of the other modes always sum exactly: the remainder of the rounding goes to the first unit
 * that carries weight.
 */
export function splitExpense(
  amount: number,
  units: Weighted[],
  mode: SplitMode,
  manual: Record<string, number> = {}
): Record<string, number> {
  const shares: Record<string, number> = {}

  if (!units.length) return shares

  if (mode === 'manual') {
    for (const unit of units)
      shares[unit.id] = Math.max(0, Math.round(Number(manual[unit.id]) || 0))

    return shares
  }

  const total = Math.max(0, Math.round(amount) || 0)

  const figure = (unit: Weighted) =>
    mode === 'area' ? unit.area : mode === 'people' ? unit.people : 1

  let weights = units.map(unit => Math.max(0, figure(unit) || 0))

  if (!weights.some(weight => weight > 0)) weights = units.map(() => 1)

  const sum = weights.reduce((acc, weight) => acc + weight, 0)

  let used = 0

  units.forEach((unit, index) => {
    shares[unit.id] = Math.floor((total * weights[index]) / sum)
    used += shares[unit.id]
  })

  const first = units[weights.findIndex(weight => weight > 0)]

  shares[first.id] += total - used

  return shares
}

/**
 * Who a unit's share of an expense is addressed to, by the «سهم به نام» rule of the expense kind
 * (the managed list decides, nothing is hard-coded): «owner» → the unit's current owner;
 * «resident» (the default) → the tenant or, without one, the owner. Null when nobody qualifies.
 */
export function shareDebtor(
  kind: Pick<ManagedItem, 'chargeTo'> | null | undefined,
  unit: { id: string },
  residents: ChargeResident[]
): ChargeDebtor | null {
  if (kind?.chargeTo !== 'owner') return chargeDebtor(unit, residents)

  const owner = residents.find(
    item => item.unitId === unit.id && item.current && item.role === 'owner'
  )

  return owner ? { id: owner.personId, name: owner.name, role: owner.role } : null
}

/** The expense record, as far as shares and the debt need it. */
export interface ExpenseRecordInput {
  id: string
  title: string
  amount: number
  date: string
  category: string
  subCategory: string
  /** A key of the managed kind list ('' when unset). */
  kind: string
  /** A key of the managed payer list; '' counts as the fund. */
  payer: string
  split: ExpenseSplit | null
}

export interface ShareDraft {
  reference: string
  unitId: string
  title: string
  debtor: string
  debtorId: string
  subCategory: string
  amount: number
  borrowDate: string
}

type Row = Receivable & { rowNumber: number }

export interface ExpenseSyncPlan {
  create: ShareDraft[]
  update: { row: Row; draft: ShareDraft }[]
  /** Unpaid shares that no longer belong (split turned off, unit left out). */
  remove: Row[]
  /** The unit shares that cannot be addressed to anyone (no owner / resident). */
  noDebtor: string[]
  dang:
    | { action: 'none' }
    | { action: 'create'; dang: Dang }
    | { action: 'update'; row: Dang & { rowNumber: number }; next: Dang }
    | { action: 'remove'; row: Dang & { rowNumber: number } }
}

const shareTitle = (title: string, unitNumber: string) =>
  `سهم ${title} · واحد ${toPersianDigits(unitNumber)}`

/** Rows of this record's unit shares (`share:<unitId>:<recordId>`). */
export const sharesOfRecord = <T extends Receivable>(receivables: T[], recordId: string): T[] =>
  receivables.filter(
    item => item.reference?.startsWith('share:') && item.reference.endsWith(`:${recordId}`)
  )

const sameDraft = (row: Receivable, draft: ShareDraft) =>
  row.amount === draft.amount &&
  row.title === draft.title &&
  row.debtor === draft.debtor &&
  (row.debtorId ?? '') === draft.debtorId &&
  (row.subCategory ?? '') === draft.subCategory &&
  row.borrowDate === draft.borrowDate

export function planExpenseSync(input: {
  record: ExpenseRecordInput
  units: BuildingUnit[]
  residents: ChargeResident[]
  kinds: ManagedItem[]
  payers: ManagedItem[]
  receivables: Row[]
  dangs: (Dang & { rowNumber: number })[]
}): ExpenseSyncPlan {
  const { record, units, residents, kinds, payers, receivables, dangs } = input

  const kind = kinds.find(item => item.value === record.kind)

  const existing = sharesOfRecord(receivables, record.id)

  const plan: ExpenseSyncPlan = {
    create: [],
    update: [],
    remove: [],
    noDebtor: [],
    dang: { action: 'none' }
  }

  const wanted = new Set<string>()

  if (record.split?.charge) {
    for (const unit of units.filter(item => item.active)) {
      const amount = Math.round(record.split.shares[unit.id] ?? 0)

      if (amount <= 0) continue

      const debtor = shareDebtor(kind, unit, residents)

      if (!debtor) {
        plan.noDebtor.push(unit.number)
        continue
      }

      const draft: ShareDraft = {
        reference: `share:${unit.id}:${record.id}`,
        unitId: unit.id,
        title: shareTitle(record.title, unit.number),
        debtor: debtor.name,
        debtorId: debtor.id,
        subCategory: kind?.label ?? '',
        amount,
        borrowDate: record.date
      }

      wanted.add(draft.reference)

      const row = existing.find(item => item.reference === draft.reference)

      if (!row) plan.create.push(draft)
      // A share with any payment is the unit's own money by now: only unpaid ones follow the record.
      else if (paidAmount(row) === 0 && !sameDraft(row, draft)) plan.update.push({ row, draft })
    }
  }

  plan.remove = existing.filter(row => !wanted.has(row.reference ?? '') && paidAmount(row) === 0)

  const fundPaid = !record.payer || record.payer === FUND_PAYER

  const debt = dangs.find(item => item.id === dangIdForExpense(record.id))

  if (fundPaid) {
    if (debt && !debt.paid) plan.dang = { action: 'remove', row: debt }
  } else {
    const label = payers.find(item => item.value === record.payer)?.label ?? record.payer

    const next: Dang = {
      id: dangIdForExpense(record.id),
      createdAt: debt?.createdAt ?? new Date().toLocaleString('fa-IR'),
      title: record.title,
      category: record.category,
      subCategory: record.subCategory,
      counterparty: label,
      amount: record.amount,
      date: record.date,
      note: debt?.note ?? '',
      paid: debt?.paid ?? false,
      paidAt: debt?.paidAt ?? ''
    }

    if (!debt) plan.dang = { action: 'create', dang: next }
    else if (
      !debt.paid &&
      (debt.title !== next.title ||
        debt.counterparty !== next.counterparty ||
        debt.amount !== next.amount ||
        debt.date !== next.date ||
        debt.category !== next.category ||
        (debt.subCategory ?? '') !== (next.subCategory ?? ''))
    ) {
      plan.dang = { action: 'update', row: debt, next: { ...debt, ...next } }
    }
  }

  return plan
}
