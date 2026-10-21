import { logActivity } from './activityLog'
import type { IssuePlan } from './buildingChargePlan'
import { chargeReference, CREDIT_REFERENCE_PREFIX, dedupeChargeReferences } from './buildingCharges'
import { monthName } from './buildingMonths'
import {
  createReceivable,
  deleteReceivable,
  fetchReceivables,
  updateReceivable
} from './receivablesCrud'
import { remainingAmount } from './receivablesRow'
import type { Receivable, ReceivablePayment } from '../types'
import { getTodayIso } from '../utils/jalaliDate'
import { toPersianDigits } from '../utils/normalizeDigits'
import { BUILDING_CHARGE_CATEGORY } from '../utils/protectedCategories'

type Row = Receivable & { rowNumber: number }

const fa = (value: number) => toPersianDigits(String(value))

/** Subcategory of a monthly charge («جاری»); capital shares (Step 5) carry their kind's label. */
export const CHARGE_SUBCATEGORY = 'جاری'

/**
 * Spends a unit's credit rows (oldest first) on up to `need` of a new charge. Returns the payment
 * to put on the charge and the credit rows that changed.
 */
function spendCredit(
  credits: Row[],
  unitId: string,
  need: number,
  paidAt: string,
  note: string
): { payment: ReceivablePayment | null; changed: Row[] } {
  const changed: Row[] = []

  let left = need

  for (const credit of credits) {
    if (left <= 0) break
    if (credit.reference !== `${CREDIT_REFERENCE_PREFIX}${unitId}`) continue

    const use = Math.min(remainingAmount(credit), left)

    if (use <= 0) continue

    credit.payments = [
      ...credit.payments,
      { id: crypto.randomUUID(), amount: use, paidAt, note, fromCredit: true }
    ]
    left -= use
    changed.push(credit)
  }

  const used = need - left

  return {
    payment: used
      ? {
          id: crypto.randomUUID(),
          amount: used,
          paidAt,
          note: 'از اعتبار واحد',
          fromCredit: true
        }
      : null,
    changed
  }
}

/**
 * Writes the plan: one receivable per row that is not skipped, the unit's credit paying first
 * (the charge is born part- or fully paid and the credit row is reduced; no income record is
 * written, the money came in with the overpayment). The receivables are read again first, so a
 * month another device issued meanwhile is skipped rather than doubled. Returns how many
 * receivables were written.
 */
export async function issueCharges(
  spreadsheetId: string,
  plan: IssuePlan,
  dueDate: string,
  note: string
): Promise<number> {
  const fresh = await fetchReceivables(spreadsheetId)

  const issued = new Set(fresh.map(item => item.reference))

  const rows = plan.rows.filter(
    row => !row.skip && row.debtor && !issued.has(chargeReference(row.unit.id, plan.monthKey))
  )

  if (!rows.length) return 0

  const credits = fresh.filter(
    item => item.reference?.startsWith(CREDIT_REFERENCE_PREFIX) && remainingAmount(item) > 0
  )

  const changed = new Map<string, Row>()

  const today = getTodayIso()

  const month = monthName(plan.monthKey)

  for (const row of rows) {
    const debtor = row.debtor!

    const spent = spendCredit(credits, row.unit.id, row.amount, today, `شارژ ${month}`)

    spent.changed.forEach(item => changed.set(item.id, item))

    await createReceivable(
      spreadsheetId,
      {
        title: `شارژ ${month} · واحد ${toPersianDigits(row.unit.number)}`,
        debtor: debtor.name,
        debtorId: debtor.id,
        category: BUILDING_CHARGE_CATEGORY,
        subCategory: CHARGE_SUBCATEGORY,
        amount: row.amount,
        borrowDate: dueDate,
        note,
        reference: chargeReference(row.unit.id, plan.monthKey),
        payments: spent.payment ? [spent.payment] : []
      },
      false
    )
  }

  for (const credit of changed.values()) {
    await updateReceivable(spreadsheetId, credit.rowNumber, credit, false)
  }

  logActivity(spreadsheetId, {
    action: 'create',
    module: 'receivables',
    itemId: '',
    summary: `شارژ ${month} برای ${fa(rows.length)} واحد صادر شد`
  })

  return rows.length
}

/**
 * Removes the later, unpaid duplicates two devices left for the same `مرجع` (the earliest row
 * stays). Rows go from the bottom up so the row numbers of the others stay valid. Returns how
 * many were removed.
 */
export async function removeDuplicateCharges(spreadsheetId: string): Promise<number> {
  const { removeUnpaid } = dedupeChargeReferences(await fetchReceivables(spreadsheetId))

  for (const item of [...removeUnpaid].sort((a, b) => b.rowNumber - a.rowNumber)) {
    await deleteReceivable(spreadsheetId, item.rowNumber)
  }

  if (removeUnpaid.length) {
    logActivity(spreadsheetId, {
      action: 'delete',
      module: 'receivables',
      itemId: '',
      summary: `صدور تکراری حذف شد (${fa(removeUnpaid.length)})`
    })
  }

  return removeUnpaid.length
}
