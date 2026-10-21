import { logActivity } from './activityLog'
import {
  parseSplit,
  planExpenseSync,
  sharesOfRecord,
  type ExpenseRecordInput,
  type ExpenseSyncPlan
} from './buildingExpenses'
import { getManagedList } from './buildingLists'
import { chargeResidents, fetchStays } from './buildingResidents'
import { fetchUnits } from './buildingUnits'
import { fetchCounterparties } from './counterparties'
import { createDang, deleteDang, ensureDangSheet, fetchDangs, updateDang } from './dang'
import {
  createReceivable,
  deleteReceivable,
  fetchReceivables,
  updateReceivable
} from './receivablesCrud'
import { paidAmount } from './receivablesRow'
import {
  EXPENSE_KIND_FIELD_ID,
  PAYER_FIELD_ID,
  SPLIT_FIELD_ID
} from '../components/form/buildingFields'
import { SUBCATEGORY_FIELD_ID } from '../components/form/fieldUtils'
import { toPersianDigits } from '../utils/normalizeDigits'
import { parseNumeric } from '../utils/parseNumeric'
import { BUILDING_CHARGE_CATEGORY } from '../utils/protectedCategories'

type Values = Record<string, string | number | undefined>

/** The expense record as the sync reads it from the row's form values. */
export function expenseRecordInput(
  recordId: string,
  values: Values,
  dateFieldId = 'date'
): ExpenseRecordInput {
  return {
    id: recordId,
    title: String(values.title ?? '').trim() || String(values.category ?? ''),
    amount: parseNumeric(values.amount),
    date: String(values[dateFieldId] ?? ''),
    category: String(values.category ?? ''),
    subCategory: String(values[SUBCATEGORY_FIELD_ID] ?? ''),
    kind: String(values[EXPENSE_KIND_FIELD_ID] ?? '').trim(),
    payer: String(values[PAYER_FIELD_ID] ?? '').trim(),
    split: parseSplit(values[SPLIT_FIELD_ID])
  }
}

async function loadPlan(
  spreadsheetId: string,
  record: ExpenseRecordInput,
  options: { dropped?: boolean } = {}
): Promise<ExpenseSyncPlan> {
  await ensureDangSheet(spreadsheetId)

  const [units, stays, persons, receivables, dangs] = await Promise.all([
    fetchUnits(spreadsheetId),
    fetchStays(spreadsheetId),
    fetchCounterparties(spreadsheetId),
    fetchReceivables(spreadsheetId),
    fetchDangs(spreadsheetId)
  ])

  return planExpenseSync({
    // A deleted record wants nothing: no shares, and (fund-like) no debt.
    record: options.dropped ? { ...record, split: null, payer: '' } : record,
    units,
    residents: chargeResidents(stays, persons),
    kinds: getManagedList('EXPENSE_KINDS', spreadsheetId),
    payers: getManagedList('EXPENSE_PAYERS', spreadsheetId),
    receivables,
    dangs
  })
}

async function applyPlan(
  spreadsheetId: string,
  record: ExpenseRecordInput,
  plan: ExpenseSyncPlan
): Promise<number> {
  for (const draft of plan.create) {
    await createReceivable(
      spreadsheetId,
      {
        title: draft.title,
        debtor: draft.debtor,
        debtorId: draft.debtorId,
        category: BUILDING_CHARGE_CATEGORY,
        subCategory: draft.subCategory,
        amount: draft.amount,
        borrowDate: draft.borrowDate,
        note: '',
        reference: draft.reference
      },
      false
    )
  }

  for (const { row, draft } of plan.update) {
    await updateReceivable(
      spreadsheetId,
      row.rowNumber,
      {
        ...row,
        title: draft.title,
        debtor: draft.debtor,
        debtorId: draft.debtorId,
        subCategory: draft.subCategory,
        amount: draft.amount,
        borrowDate: draft.borrowDate
      },
      false
    )
  }

  if (plan.dang.action === 'create') {
    const { dang } = plan.dang

    await createDang(spreadsheetId, {
      id: dang.id,
      title: dang.title,
      category: dang.category,
      subCategory: dang.subCategory,
      counterparty: dang.counterparty,
      amount: dang.amount,
      date: dang.date,
      note: dang.note
    })
  } else if (plan.dang.action === 'update') {
    await updateDang(spreadsheetId, plan.dang.row.rowNumber, plan.dang.next)
  }

  // Deletes last and from the bottom up: a removed row shifts the row numbers below it.
  for (const row of [...plan.remove].sort((a, b) => b.rowNumber - a.rowNumber)) {
    await deleteReceivable(spreadsheetId, row.rowNumber)
  }

  if (plan.dang.action === 'remove') {
    await deleteDang(spreadsheetId, plan.dang.row.rowNumber, plan.dang.row)
  }

  const touched = plan.create.length + plan.update.length + plan.remove.length

  if (touched) {
    logActivity(spreadsheetId, {
      action: 'create',
      module: 'receivables',
      itemId: '',
      summary: `سهم هزینهٔ «${record.title}» برای ${toPersianDigits(
        String(touched)
      )} واحد به‌روز شد`
    })
  }

  return touched
}

/**
 * Brings the unit shares and the debt of one building expense in line with the saved record, after
 * it was created or edited. Idempotent: shares are keyed by `share:<unitId>:<recordId>` and the debt
 * by a fixed id, so saving again writes nothing new. Only unpaid shares follow an edit; a share any
 * money was paid on is left as it is. A payer other than the fund makes a debt to that person and
 * touches no account (the entry form drops the account). Returns what changed.
 */
export async function syncBuildingExpense(
  spreadsheetId: string,
  recordId: string,
  values: Values,
  dateFieldId = 'date'
): Promise<{ plan: ExpenseSyncPlan; touched: number }> {
  const record = expenseRecordInput(recordId, values, dateFieldId)

  const plan = await loadPlan(spreadsheetId, record)

  return { plan, touched: await applyPlan(spreadsheetId, record, plan) }
}

/** How many unit shares of a record are still unpaid: what deleting the record would remove. */
export async function countUnpaidExpenseShares(
  spreadsheetId: string,
  recordId: string
): Promise<number> {
  return sharesOfRecord(await fetchReceivables(spreadsheetId), recordId).filter(
    row => paidAmount(row) === 0
  ).length
}

/**
 * After a building expense is deleted: its unpaid shares and its unpaid debt go; shares that were
 * paid (in part or fully) and a settled debt stay.
 */
export async function removeBuildingExpenseShares(
  spreadsheetId: string,
  recordId: string,
  values: Values
): Promise<void> {
  const record = expenseRecordInput(recordId, values)

  await applyPlan(spreadsheetId, record, await loadPlan(spreadsheetId, record, { dropped: true }))
}
