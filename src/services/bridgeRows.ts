import { linkedRecordValues } from './paymentTransactions'
import { receivableToRow, remainingAmount, rowToReceivable } from './receivablesRow'
import { RECEIVABLES_SHEET, WALLET_LEDGER_SHEET, WALLET_SHEET } from './sheetNames'
import { buildHeaders, buildRecordRow } from './sheetsHeaders'
import type { OutboxOperation } from './syncOutbox'
import { ledgerEntry, ledgerRow } from './walletLedger'
import { WALLET_APPLY_YES } from '../components/form/fieldUtils'
import type { CustomForm, Receivable } from '../types'
import { parseNumeric } from '../utils/parseNumeric'

/**
 * Row shapes of the two bridges to the manager's personal spreadsheet (round 11, Step 8). Pure: the
 * target spreadsheet is not loaded here, so every row is built from fixed layouts and what a direct
 * read returned, never from the single in-memory mirror.
 */

/** Category of the personal receivable «طلب از <building>». */
export const POCKET_RECEIVABLE_CATEGORY = 'طلب'

/** Personal expense «خانه › شارژ» of the manager's own unit. */
export const OWN_CHARGE_CATEGORY = 'خانه'

export const OWN_CHARGE_SUBCATEGORY = 'شارژ'

/** A bridged write is not a new user action: it must not stamp «آخرین عملیات» again. */
const QUIET = { skipActivity: true } as const

/** `bridge:<recordId>` in the receivable's «مرجع» finds it again when the debt is settled. */
export const bridgeReference = (recordId: string) => `bridge:${recordId}`

export interface PocketReceivableInput {
  /** The building expense record the money was fronted for. */
  recordId: string
  building: string
  title: string
  amount: number
  /** ISO date of the expense. */
  date: string
  email: string
}

/** Bridge A: what the manager is owed by the building, as a receivable of the personal sheet. */
export function pocketReceivable(input: PocketReceivableInput): Receivable {
  return {
    id: `bridge-${input.recordId}`,
    createdAt: new Date().toLocaleString('fa-IR'),
    title: `${input.title} · ${input.building}`,
    debtor: input.building,
    category: POCKET_RECEIVABLE_CATEGORY,
    subCategory: '',
    amount: input.amount,
    borrowDate: input.date,
    note: `پرداخت از جیب برای ساختمان · شناسهٔ هزینه: ${input.recordId}`,
    payments: [],
    writer: input.email.trim().toLowerCase(),
    reference: bridgeReference(input.recordId)
  }
}

export function pocketReceivableOperation(input: PocketReceivableInput): OutboxOperation {
  return {
    type: 'append',
    sheetName: RECEIVABLES_SHEET,
    row: receivableToRow(pocketReceivable(input)),
    writeOptions: QUIET
  }
}

export interface OwnChargeInput {
  building: string
  unitNumber: string
  amount: number
  /** ISO date of the payment. */
  date: string
}

/** Bridge B: the manager's own charge as a personal expense «خانه › شارژ», with no account moved. */
export function ownChargeOperation(
  expenseForm: CustomForm,
  input: OwnChargeInput,
  ids: { recordId: string; createdAt: string } = {
    recordId: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR')
  }
): OutboxOperation {
  const values = linkedRecordValues({
    title: 'شارژ ساختمان',
    amount: input.amount,
    category: OWN_CHARGE_CATEGORY,
    subCategory: OWN_CHARGE_SUBCATEGORY,
    note: `شارژ واحد ${input.unitNumber} · ${input.building}`,
    date: input.date
  })

  return {
    type: 'append',
    sheetName: expenseForm.sheetName,
    row: buildRecordRow(
      buildHeaders(expenseForm.fields),
      expenseForm.fields,
      ids.recordId,
      ids.createdAt,
      values
    ),
    writeOptions: QUIET
  }
}

export interface BridgePaymentInput {
  recordId: string
  amount: number
  date: string
  /** Personal wallet account that receives the money ('' = recorded without an account). */
  account: string
  /** Header included, as a direct read of the personal sheet returned them. */
  receivableRows: string[][]
  walletRows: string[][]
  incomeForm: CustomForm
}

/**
 * Settling the building's debt to the manager pays the bridged receivable too: one income record
 * (into the chosen personal account, whose balance and history follow), and the payment on the
 * receivable row. `null` when the receivable is gone or already paid. Edits carry the row as it was
 * read, so a change made elsewhere meanwhile becomes a conflict instead of being overwritten.
 */
export function bridgePaymentOperations(input: BridgePaymentInput): OutboxOperation[] | null {
  const found = input.receivableRows
    .map((row, index) => ({ row, index }))
    .find(
      ({ row, index }) =>
        index > 0 && rowToReceivable(row, index + 1).reference === bridgeReference(input.recordId)
    )

  if (!found) return null

  const receivable = rowToReceivable(found.row, found.index + 1)

  const pay = Math.min(input.amount, remainingAmount(receivable))

  if (!(pay > 0)) return null

  const incomeId = crypto.randomUUID()

  const title = `طلب: ${receivable.title.trim() || receivable.debtor}`

  const values = linkedRecordValues({
    title,
    amount: pay,
    category: receivable.category,
    subCategory: receivable.subCategory,
    note: receivable.note,
    date: input.date,
    walletAccount: input.account,
    walletApply: input.account ? WALLET_APPLY_YES : ''
  })

  const operations: OutboxOperation[] = [
    {
      type: 'append',
      sheetName: input.incomeForm.sheetName,
      row: buildRecordRow(
        buildHeaders(input.incomeForm.fields),
        input.incomeForm.fields,
        incomeId,
        new Date().toLocaleString('fa-IR'),
        values
      ),
      writeOptions: QUIET
    },
    {
      type: 'update',
      sheetName: RECEIVABLES_SHEET,
      rowNumber: found.index + 1,
      expectedRow: found.row,
      row: receivableToRow({
        ...receivable,
        payments: [
          ...receivable.payments,
          {
            id: crypto.randomUUID(),
            amount: pay,
            paidAt: input.date,
            note: '',
            transactionRecordId: incomeId
          }
        ]
      }),
      writeOptions: QUIET
    }
  ]

  const walletIndex = input.account
    ? input.walletRows.findIndex((row, index) => index > 0 && row[0] === input.account)
    : -1

  if (walletIndex > 0) {
    const walletRow = input.walletRows[walletIndex]

    const balance = parseNumeric(walletRow[3]) + pay

    const next = [...walletRow]

    next[3] = String(balance)
    operations.push(
      {
        type: 'update',
        sheetName: WALLET_SHEET,
        rowNumber: walletIndex + 1,
        expectedRow: walletRow,
        row: next,
        writeOptions: QUIET
      },
      {
        type: 'append',
        sheetName: WALLET_LEDGER_SHEET,
        row: ledgerRow(
          ledgerEntry(input.account, pay, balance, {
            title,
            date: input.date,
            source: 'ثبت',
            recordId: incomeId
          })
        ),
        writeOptions: QUIET
      }
    )
  }

  return operations
}
