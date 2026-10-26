import type { Dang } from '../types'
import { logActivity } from './activityLog'
import { dangSettlementCategory } from './buildingDang'
import { DangPaymentError } from './dangPaymentError'
import { fetchDangs, dangToRow, withDangPaidState } from './dangRow'
import { dangPrefixes, dangSettlementTitle } from './dangTitles'
import { refreshRowFromSheet } from './freshRow'
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
 * The debt as the sheet holds it now, found by id: its row is read from Google Sheets into the
 * local mirror first (offline, or with a write still queued, the mirror is what there is).
 * Payments are computed on this copy, never on the screen's: another device may have added one.
 * `fallback` is used when the mirror has no such row (a debt this device only just built).
 */
export async function readFreshDang(
  spreadsheetId: string,
  dangId: string,
  fallback?: DangRow
): Promise<DangRow> {
  if ((await refreshRowFromSheet(spreadsheetId, DANG_SHEET, dangId)) === 'missing') {
    throw new DangPaymentError('این بدهی پیدا نشد؛ شاید حذف شده باشد.', 'missing')
  }

  const found = (await fetchDangs(spreadsheetId)).find(item => item.id === dangId) ?? fallback

  if (!found) throw new DangPaymentError('این بدهی پیدا نشد؛ شاید حذف شده باشد.', 'missing')

  return found
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
