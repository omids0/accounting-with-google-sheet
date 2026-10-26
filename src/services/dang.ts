import type { Dang } from '../types'
import { logItemActivity } from './activityLog'
import { dangSettlementCategory } from './buildingDang'
import { DangPaymentError } from './dangPaymentError'
import { dangToRow, fetchDangs, withDangPaidState } from './dangRow'
import { dangPrefixes, dangSettlementTitle } from './dangTitles'
import { migrateDangPaymentsColumn } from './migrateDangPaymentsColumn'
import { deleteLinkedExpenseRecord } from './paymentTransactions'
import type { SettleOptions, UnlinkChoice } from './settleOptions'
import { createLinkedRecordWithWallet, deleteLinkedRecordWithWallet } from './settleRecords'
import { DANG_HEADERS } from './sheetHeaders'
import { DANG_SHEET } from './sheetNames'
import { appendSheetRow, ensureSheetWithHeaders, updateSheetRow, deleteSheetRow } from './sheets'
import { getActiveWorkspaceType } from './workspace'
import {
  canSetDangAmount,
  dangPaidAmount,
  dangRemaining,
  unpaidDangTotal
} from '../utils/dangLedger'
import { formatMoney } from '../utils/formatMoney'
import { getTodayIso } from '../utils/jalaliDate'

export { DANG_SHEET, DANG_HEADERS, unpaidDangTotal }
export { DangPaymentError } from './dangPaymentError'
export { addDangPayment, removeDangPayment, settleRestOfDang } from './dangPayments'
export { exportDangsCsv, exportDangsPdf, importDangsCsv } from './dangExport'
export { fetchDangs, isLegacyDangRow, rowToDang, sortDangs } from './dangRow'

export async function ensureDangSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, DANG_SHEET, DANG_HEADERS)
  // Older tabs lack the «پرداخت‌ها» label; a failure (offline) is retried next session.
  await migrateDangPaymentsColumn(spreadsheetId).catch(() => undefined)
}

export async function createDang(
  spreadsheetId: string,
  data: {
    title: string
    category: string
    subCategory?: string
    counterparty: string
    amount: number
    date: string
    note: string
    /** A fixed id, for a debt another record owns (a building expense paid out of pocket). */
    id?: string
  }
): Promise<Dang> {
  const dang: Dang = {
    id: data.id ?? crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    title: data.title,
    category: data.category,
    subCategory: data.subCategory ?? '',
    counterparty: data.counterparty,
    amount: data.amount,
    date: data.date,
    note: data.note,
    paid: false,
    paidAt: '',
    payments: []
  }

  await appendSheetRow(spreadsheetId, DANG_SHEET, dangToRow(dang))
  logItemActivity(spreadsheetId, 'create', 'dang', dang.id, dang.title)

  return dang
}

export async function updateDang(
  spreadsheetId: string,
  rowNumber: number,
  dang: Dang,
  /** False for bulk rewrites (a category rename logs once itself). */
  log = true
): Promise<void> {
  if (!canSetDangAmount(dang, dang.amount)) {
    throw new DangPaymentError(
      `مبلغ بدهی نمی‌تواند کمتر از ${formatMoney(dangPaidAmount(dang))} (پرداخت‌شده تا حالا) باشد`,
      'below-paid'
    )
  }
  await updateSheetRow(spreadsheetId, DANG_SHEET, rowNumber, dangToRow(dang))
  if (log) logItemActivity(spreadsheetId, 'update', 'dang', dang.id, dang.title)
}

export async function deleteDang(
  spreadsheetId: string,
  rowNumber: number,
  dang?: Dang,
  /** Keep the expense records its payments made (they stay as ordinary expenses). */
  keepLinkedRecords = false
): Promise<void> {
  if (dang && !keepLinkedRecords) {
    // The row on the sheet may hold payments this screen has not seen yet.
    const fresh = (await fetchDangs(spreadsheetId).catch(() => [])).find(
      item => item.id === dang.id
    )

    const ids = new Set(
      [...dang.payments, ...(fresh?.payments ?? [])]
        .map(payment => payment.transactionRecordId)
        .concat(dang.transactionRecordId)
        .filter((id): id is string => Boolean(id))
    )

    for (const id of ids) await deleteLinkedExpenseRecord(spreadsheetId, id)
  }
  await deleteSheetRow(spreadsheetId, DANG_SHEET, rowNumber)
  if (dang) logItemActivity(spreadsheetId, 'delete', 'dang', dang.id, dang.title)
}

/**
 * The building workspace still settles a debt in one go (a single full payment) and un-settles it
 * by dropping the payments. The personal debt page pays in pieces: see dangPayments.ts.
 */
export async function toggleDangPaid(
  spreadsheetId: string,
  dang: Dang & { rowNumber: number },
  paid: boolean,
  options?: SettleOptions,
  unlink?: UnlinkChoice
): Promise<Dang> {
  const building = getActiveWorkspaceType() === 'building'

  if (paid && !dang.paid) {
    const amount = dangRemaining(dang)

    const transactionRecordId = await createLinkedRecordWithWallet(
      spreadsheetId,
      'expense',
      {
        title: dangSettlementTitle(dang, building),
        amount,
        ...dangSettlementCategory(dang, building),
        note: dang.note
      },
      options
    )

    const updated = withDangPaidState({
      ...dang,
      payments: [
        ...dang.payments,
        {
          id: crypto.randomUUID(),
          amount,
          paidAt: options?.date || getTodayIso(),
          note: '',
          transactionRecordId
        }
      ]
    })

    await updateSheetRow(spreadsheetId, DANG_SHEET, dang.rowNumber, dangToRow(updated))
    logItemActivity(spreadsheetId, 'pay', 'dang', dang.id, `بدهی «${dang.title}»`)

    return updated
  }

  if (!paid && dang.paid) {
    const recordIds = dang.payments.length
      ? dang.payments.map(payment => payment.transactionRecordId ?? '')
      : [dang.transactionRecordId ?? '']

    for (const recordId of recordIds) {
      await deleteLinkedRecordWithWallet(
        spreadsheetId,
        'expense',
        recordId,
        dangPrefixes(building),
        unlink
      )
    }

    // The stale payments must not survive: they would keep the derived «paid» true.
    const updated: Dang = {
      ...dang,
      paid: false,
      paidAt: '',
      transactionRecordId: '',
      payments: []
    }

    await updateSheetRow(spreadsheetId, DANG_SHEET, dang.rowNumber, dangToRow(updated))
    logItemActivity(spreadsheetId, 'unpay', 'dang', dang.id, `بدهی «${dang.title}»`)

    return updated
  }

  return dang
}
