import type { Dang } from '../types'
import { logActivity } from './activityLog'
import { dangSettlementCategory } from './buildingDang'
import { DangPaymentError } from './dangPaymentError'
import { fetchDangs, dangToRow, withDangPaidState } from './dangRow'
import { dangPrefixes, dangSettlementTitle } from './dangTitles'
import type { SettleOptions, UnlinkChoice } from './settleOptions'
import { createLinkedRecordWithWallet, deleteLinkedRecordWithWallet } from './settleRecords'
import { DANG_SHEET } from './sheetNames'
import { updateSheetRow } from './sheets'
import { getActiveWorkspaceType } from './workspace'
import { dangRemaining } from '../utils/dangLedger'
import { formatMoney } from '../utils/formatMoney'
import { formatAmountWords } from '../utils/insightText'
import { getTodayIso } from '../utils/jalaliDate'

type DangRow = Dang & { rowNumber: number }

/**
 * The debt as the sheet holds it now (the local mirror), found by id. Payments are computed on
 * this copy, never on the screen's: another device may have added one since the list loaded.
 */
async function readFreshDang(spreadsheetId: string, dangId: string): Promise<DangRow> {
  const fresh = (await fetchDangs(spreadsheetId)).find(item => item.id === dangId)

  if (!fresh) throw new DangPaymentError('این بدهی پیدا نشد؛ شاید حذف شده باشد.', 'missing')

  return fresh
}

/**
 * Pays a piece of a debt: 0 < amount <= remaining. Creates the expense record that is the money
 * leaving (nothing when `options.linkRecordId` points at an existing one), then writes the row.
 */
export async function addDangPayment(
  spreadsheetId: string,
  dang: DangRow,
  payment: { amount: number; note?: string },
  options?: SettleOptions
): Promise<DangRow> {
  const fresh = await readFreshDang(spreadsheetId, dang.id)

  const remaining = dangRemaining(fresh)

  if (!(payment.amount > 0)) {
    throw new DangPaymentError('مبلغ پرداخت باید بیشتر از صفر باشد.', 'amount')
  }
  if (payment.amount > remaining) {
    throw new DangPaymentError(
      `مبلغ پرداخت از باقی‌ماندهٔ بدهی (${formatMoney(remaining)}) بیشتر است.`,
      'over-remaining'
    )
  }

  const building = getActiveWorkspaceType() === 'building'

  const paidAt = options?.date || getTodayIso()

  const transactionRecordId = await createLinkedRecordWithWallet(
    spreadsheetId,
    'expense',
    {
      title: dangSettlementTitle(fresh, building),
      amount: payment.amount,
      ...dangSettlementCategory(fresh, building),
      date: paidAt,
      note: payment.note ?? fresh.note
    },
    options
  )

  const updated = withDangPaidState({
    ...fresh,
    payments: [
      ...fresh.payments,
      {
        id: crypto.randomUUID(),
        amount: payment.amount,
        paidAt,
        note: payment.note ?? '',
        transactionRecordId
      }
    ]
  })

  await updateSheetRow(spreadsheetId, DANG_SHEET, fresh.rowNumber, dangToRow(updated))
  logActivity(spreadsheetId, {
    action: 'pay',
    module: 'dang',
    itemId: fresh.id,
    summary: `${formatAmountWords(payment.amount)} از بدهی «${fresh.title}» را پرداخت کرد`
  })

  return updated
}

/** Pays everything that is left of the debt in one payment. */
export function settleRestOfDang(
  spreadsheetId: string,
  dang: DangRow,
  note?: string,
  options?: SettleOptions
): Promise<DangRow> {
  return addDangPayment(spreadsheetId, dang, { amount: dangRemaining(dang), note }, options)
}

/**
 * Takes one payment back: its expense record goes with its balance effect (a linked record stays
 * unless `unlink` is 'delete'), and the row is rewritten without it.
 */
export async function removeDangPayment(
  spreadsheetId: string,
  dang: DangRow,
  paymentId: string,
  unlink?: UnlinkChoice
): Promise<DangRow> {
  const fresh = await readFreshDang(spreadsheetId, dang.id)

  const payment = fresh.payments.find(item => item.id === paymentId)

  if (!payment) return fresh

  await deleteLinkedRecordWithWallet(
    spreadsheetId,
    'expense',
    payment.transactionRecordId ?? '',
    dangPrefixes(getActiveWorkspaceType() === 'building'),
    unlink
  )

  const updated = withDangPaidState({
    ...fresh,
    payments: fresh.payments.filter(item => item.id !== paymentId)
  })

  await updateSheetRow(spreadsheetId, DANG_SHEET, fresh.rowNumber, dangToRow(updated))
  logActivity(spreadsheetId, {
    action: 'unpay',
    module: 'dang',
    itemId: fresh.id,
    summary: `پرداخت ${formatAmountWords(payment.amount)} از بدهی «${fresh.title}» را حذف کرد`
  })

  return updated
}
