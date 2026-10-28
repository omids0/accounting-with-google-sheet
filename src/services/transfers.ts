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
import { reversalLegs } from './transfersReversal'
import { fetchWalletAccounts } from './wallet'
import { refreshWalletAccounts } from './walletFresh'
import { fetchAllLedger } from './walletLedger'
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
export {
  describeTransfer,
  transferIsReversible,
  transferLegInfo,
  transferLegState,
  type TransferLegInfo,
  type TransferLegState
} from './transfersModel'
export { fetchTransferLegInfos } from './transfersReversal'

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
  /**
   * A fixed id, for a transfer that must not be registered twice (the same bank-SMS pair confirmed
   * on two devices, or again after a failed confirm): when a row with this id exists, nothing is
   * written and that transfer is returned. Without it a new id is made.
   */
  id?: string
  /**
   * Accounts whose balance already holds this transfer (a newer bank-SMS «مانده» includes it): their
   * side is only written to the history as «بدون اثر», the balance is left alone.
   */
  settledAccountIds?: readonly string[]
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
 * The transfer with this id when it is already registered: in the local copy of the tab, or in the
 * sheet itself (another device). Its fields are those of the row when this device has it.
 */
async function findExistingTransfer(
  spreadsheetId: string,
  id: string
): Promise<Transfer | undefined> {
  const local = (await readRows(spreadsheetId)).find(item => item.transfer.id === id)

  if (local) return local.transfer
  if ((await sheetHasRowId(spreadsheetId, TRANSFERS_SHEET, id)) !== true) return undefined

  // Only on the sheet so far: the caller needs to know it exists, not its fields.
  return {
    id,
    createdAt: '',
    date: '',
    fromAccountId: '',
    toAccountId: '',
    amount: 0,
    note: '',
    createdBy: ''
  }
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
  const id = input.id?.trim() || crypto.randomUUID()
  const existing = input.id ? await findExistingTransfer(spreadsheetId, id) : undefined

  if (existing) return existing

  const gone = await refreshWalletAccounts(spreadsheetId, [fromAccountId, toAccountId])
  const accounts = await fetchWalletAccounts(spreadsheetId)
  const from = accounts.find(item => item.id === fromAccountId && !gone.has(item.id))
  const to = accounts.find(item => item.id === toAccountId && !gone.has(item.id))

  if (!from || !to) throw new Error(ACCOUNT_GONE_MESSAGE)

  const transfer: Transfer = {
    id,
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

  const settled = new Set(input.settledAccountIds ?? [])
  const legs: TransferLeg[] = [
    {
      accountId: from.id,
      delta: -transfer.amount,
      title: `انتقال به «${to.title}»`,
      undoTitle: `بازگرداندن انتقال به «${to.title}»`,
      settled: settled.has(from.id)
    },
    {
      accountId: to.id,
      delta: transfer.amount,
      title: `انتقال از «${from.title}»`,
      undoTitle: `بازگرداندن انتقال از «${from.title}»`,
      settled: settled.has(to.id)
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
 * Deletes a transfer and takes back what it really did to the balances: the net of its «گردش حساب»
 * rows (source `transfer`, its id) per account, each as a change on the balance the sheet holds
 * now with a row that says «لغو انتقال …». So a phantom transfer (a closed page cut the save off
 * before the money moved) just loses its row, a half-done one gives back only the side that moved,
 * and one already reversed is never reversed twice. The row goes first, so a second call (or another
 * device) can never reverse it twice; if a reversal then fails, the finished one is taken back and
 * the row is put back so the user can try again. A transfer whose row is already gone does nothing.
 * When an account it moved was deleted since, only the row is removed: that account's share of the
 * money left with it, and moving the other side alone would create money.
 */
export async function deleteTransfer(spreadsheetId: string, id: string): Promise<void> {
  assertPersonal(spreadsheetId)

  const found = (await readRows(spreadsheetId)).find(item => item.transfer.id === id)

  if (!found) return
  // Deleted on another device meanwhile: its balances were already put back there.
  if ((await sheetHasRowId(spreadsheetId, TRANSFERS_SHEET, id)) === false) return

  const { transfer } = found
  // Read before anything changes: an unreadable history must stop the delete, not guess.
  const history = await fetchAllLedger(spreadsheetId)
  const gone = await refreshWalletAccounts(spreadsheetId, [
    transfer.fromAccountId,
    transfer.toAccountId
  ])
  const accounts = await fetchWalletAccounts(spreadsheetId)
  const from = accounts.find(item => item.id === transfer.fromAccountId && !gone.has(item.id))
  const to = accounts.find(item => item.id === transfer.toAccountId && !gone.has(item.id))
  const legs = reversalLegs(transfer, history, from, to)

  await deleteSheetRow(spreadsheetId, TRANSFERS_SHEET, found.rowNumber)

  if (legs.length) {
    try {
      await applyLegs(
        spreadsheetId,
        legs,
        { transferId: transfer.id, date: transfer.date },
        [from, to].flatMap(account => (account ? [account] : []))
      )
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
