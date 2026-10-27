import { logActivity } from './activityLog'
import { getUserEmail } from './auth'
import { sheetHasRowId } from './freshRow'
import { exportSheetCsv } from './importExport'
import { appendSheetRow, deleteSheetRow, ensureSheetWithHeaders, fetchSheetRows } from './sheets'
import {
  ACCOUNT_GONE_MESSAGE,
  applyLegs,
  TransferWriteError,
  wasRolledBack,
  type TransferLeg
} from './transfersLegs'
import {
  DELETED_ACCOUNT_TITLE,
  TRANSFERS_HEADERS,
  TRANSFERS_SHEET,
  rowToTransfer,
  sortTransfers,
  transferActivitySummary,
  transferToRow,
  type Transfer
} from './transfersModel'
import { fetchWalletAccounts } from './wallet'
import { refreshWalletAccounts } from './walletFresh'
import { isPersonalWorkspace } from './workspace'
import { validatePositiveAmount } from '../utils/formValidation'
import { roundMoney } from '../utils/roundMoney'
import { normalizeSheetDate } from '../utils/sheetValues'

export {
  DELETED_ACCOUNT_TITLE,
  TRANSFERS_HEADERS,
  TRANSFERS_SHEET,
  TransferWriteError,
  wasRolledBack,
  type Transfer
}
export { describeTransfer, transferIsReversible } from './transfersModel'

export const SAME_ACCOUNT_MESSAGE = 'حساب مبدأ و حساب مقصد نباید یکی باشند'

export const TRANSFERS_PERSONAL_ONLY_MESSAGE = 'انتقال بین حساب‌ها فقط در دفتر شخصی انجام می‌شود'

export interface CreateTransferInput {
  spreadsheetId: string
  fromAccountId: string
  toAccountId: string
  /** > 0. A source balance that ends up negative is allowed. */
  amount: number
  /** `YYYY-MM-DD` */
  date: string
  note?: string
}

function assertPersonal(spreadsheetId: string): void {
  if (!isPersonalWorkspace(spreadsheetId)) throw new Error(TRANSFERS_PERSONAL_ONLY_MESSAGE)
}

async function readRows(
  spreadsheetId: string
): Promise<{ transfer: Transfer; rowNumber: number }[]> {
  await ensureSheetWithHeaders(spreadsheetId, TRANSFERS_SHEET, TRANSFERS_HEADERS)

  const rows = await fetchSheetRows(spreadsheetId, TRANSFERS_SHEET)

  return rows.flatMap((row, index) => {
    const transfer = rowToTransfer(row)

    return transfer ? [{ transfer, rowNumber: index + 2 }] : []
  })
}

/**
 * Every transfer, newest first. Empty for a building or a shared account, which have no such tab.
 * Throws when the tab cannot be read (callers use `handleSheetError`).
 */
export async function fetchTransfers(spreadsheetId: string): Promise<Transfer[]> {
  if (!isPersonalWorkspace(spreadsheetId)) return []

  return sortTransfers((await readRows(spreadsheetId)).map(item => item.transfer))
}

/** Removes the row with this id from the tab; false when it is not there (already gone). */
async function removeRow(spreadsheetId: string, id: string): Promise<boolean> {
  const found = (await readRows(spreadsheetId)).find(item => item.transfer.id === id)

  if (!found) return false
  await deleteSheetRow(spreadsheetId, TRANSFERS_SHEET, found.rowNumber)

  return true
}

/**
 * Registers a transfer: one row in «انتقال‌ها», then the source balance goes down and the
 * destination balance goes up by the same amount, each with a «گردش حساب» row (source `transfer`,
 * the transfer's id as record). The row is written first; if a balance or history write then
 * fails, what was done is taken back and the row is removed, so no one-sided move stays behind
 * (`TransferWriteError.rolledBack` says whether the take-back worked). A source balance that
 * becomes negative is allowed. Validation errors are plain Persian `Error`s.
 */
export async function createTransfer(input: CreateTransferInput): Promise<Transfer> {
  const { spreadsheetId, fromAccountId, toAccountId } = input

  assertPersonal(spreadsheetId)

  const amountCheck = validatePositiveAmount(input.amount)

  if (amountCheck !== true) throw new Error(amountCheck)
  if (fromAccountId === toAccountId) throw new Error(SAME_ACCOUNT_MESSAGE)

  const date = normalizeSheetDate(input.date)

  if (!date) throw new Error('تاریخ الزامی است')

  // The balances the sheet holds now, not the page's copy (another device may have moved them).
  const gone = await refreshWalletAccounts(spreadsheetId, [fromAccountId, toAccountId])
  const accounts = await fetchWalletAccounts(spreadsheetId)
  const from = accounts.find(item => item.id === fromAccountId && !gone.has(item.id))
  const to = accounts.find(item => item.id === toAccountId && !gone.has(item.id))

  if (!from || !to) throw new Error(ACCOUNT_GONE_MESSAGE)

  const transfer: Transfer = {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    date,
    fromAccountId,
    toAccountId,
    amount: roundMoney(input.amount),
    note: (input.note ?? '').trim(),
    createdBy: (getUserEmail() ?? '').trim().toLowerCase()
  }

  await ensureSheetWithHeaders(spreadsheetId, TRANSFERS_SHEET, TRANSFERS_HEADERS)
  await appendSheetRow(spreadsheetId, TRANSFERS_SHEET, transferToRow(transfer))

  const legs: TransferLeg[] = [
    {
      accountId: from.id,
      delta: -transfer.amount,
      title: `انتقال به «${to.title}»`,
      undoTitle: `بازگرداندن انتقال به «${to.title}»`
    },
    {
      accountId: to.id,
      delta: transfer.amount,
      title: `انتقال از «${from.title}»`,
      undoTitle: `بازگرداندن انتقال از «${from.title}»`
    }
  ]

  try {
    await applyLegs(spreadsheetId, legs, { transferId: transfer.id, date }, [from, to])
  } catch (failure) {
    // The row must not outlive a move that did not happen.
    await removeRow(spreadsheetId, transfer.id).catch(() => undefined)
    throw failure
  }

  logActivity(spreadsheetId, {
    action: 'create',
    module: 'wallet',
    itemId: transfer.id,
    summary: transferActivitySummary('ثبت کرد', transfer.amount, from.title, to.title)
  })

  return transfer
}

/**
 * Deletes a transfer and takes both balance moves back (each a change on the balance the sheet
 * holds now, with a «گردش حساب» row of source `transfer` that says «لغو انتقال …»). The row goes
 * first, so a second call (or another device) can never reverse it twice; if a reversal then
 * fails, the finished one is taken back and the row is put back so the user can try again. A
 * transfer whose row is already gone does nothing. When one of its accounts was deleted since,
 * only the row is removed: that account's share of the money left with it, and moving the other
 * side alone would create money (see `transferIsReversible`).
 */
export async function deleteTransfer(spreadsheetId: string, id: string): Promise<void> {
  assertPersonal(spreadsheetId)

  const found = (await readRows(spreadsheetId)).find(item => item.transfer.id === id)

  if (!found) return
  // Deleted on another device meanwhile: its balances were already put back there.
  if ((await sheetHasRowId(spreadsheetId, TRANSFERS_SHEET, id)) === false) return

  const { transfer } = found
  const gone = await refreshWalletAccounts(spreadsheetId, [
    transfer.fromAccountId,
    transfer.toAccountId
  ])
  const accounts = await fetchWalletAccounts(spreadsheetId)
  const from = accounts.find(item => item.id === transfer.fromAccountId && !gone.has(item.id))
  const to = accounts.find(item => item.id === transfer.toAccountId && !gone.has(item.id))

  await deleteSheetRow(spreadsheetId, TRANSFERS_SHEET, found.rowNumber)

  if (from && to) {
    const legs: TransferLeg[] = [
      {
        accountId: from.id,
        delta: transfer.amount,
        title: `لغو انتقال به «${to.title}»`,
        undoTitle: `بازگرداندن لغو انتقال به «${to.title}»`
      },
      {
        accountId: to.id,
        delta: -transfer.amount,
        title: `لغو انتقال از «${from.title}»`,
        undoTitle: `بازگرداندن لغو انتقال از «${from.title}»`
      }
    ]

    try {
      await applyLegs(spreadsheetId, legs, { transferId: transfer.id, date: transfer.date }, [
        from,
        to
      ])
    } catch (failure) {
      // Everything undone: the transfer is still a transfer, so the row comes back.
      if (wasRolledBack(failure)) {
        await appendSheetRow(spreadsheetId, TRANSFERS_SHEET, transferToRow(transfer)).catch(
          () => undefined
        )
      }
      throw failure
    }
  }

  logActivity(spreadsheetId, {
    action: 'delete',
    module: 'wallet',
    itemId: transfer.id,
    summary: transferActivitySummary(
      'حذف کرد',
      transfer.amount,
      from?.title ?? DELETED_ACCOUNT_TITLE,
      to?.title ?? DELETED_ACCOUNT_TITLE
    )
  })
}

export async function exportTransfersCsv(spreadsheetId: string): Promise<string | null> {
  return exportSheetCsv(spreadsheetId, TRANSFERS_SHEET, TRANSFERS_HEADERS, 'انتقال‌ها.csv')
}
