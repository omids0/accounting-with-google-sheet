import { settleEntryWallet } from './entryWallet'
import {
  createLinkedExpenseRecord,
  createLinkedIncomeRecord,
  deleteLinkedRecord,
  linkedRecordValues,
  type LinkedRecordParams
} from './paymentTransactions'
import { getSettings } from './settings'
import type { SettleOptions, UnlinkChoice } from './settleOptions'
import { fetchRecords } from './sheets'
import { WALLET_APPLY_YES } from '../components/form/fieldUtils'

type SettleType = 'expense' | 'income'

/**
 * The record of a settlement. With `options.linkRecordId` an existing record is the payment:
 * nothing is created and no balance moves. Otherwise the record takes the chosen date and
 * account, and the account's balance moves when «اثر بر موجودی» is on.
 */
export async function createLinkedRecordWithWallet(
  spreadsheetId: string,
  type: SettleType,
  params: LinkedRecordParams,
  options?: SettleOptions
): Promise<string> {
  if (options?.linkRecordId) return options.linkRecordId

  const full: LinkedRecordParams = options
    ? {
        ...params,
        date: options.date,
        walletAccount: options.walletAccount,
        walletApply: options.walletAccount ? options.walletApply : ''
      }
    : params

  const create = type === 'expense' ? createLinkedExpenseRecord : createLinkedIncomeRecord
  const recordId = await create(spreadsheetId, full)

  if (full.walletAccount && full.walletApply === WALLET_APPLY_YES) {
    await settleEntryWallet(spreadsheetId, type, linkedRecordValues(full), undefined, recordId)
  }

  return recordId
}

/** The title prefix(es) of the records this app creates for a module. */
export type SettlePrefix = string | readonly string[]

const hasPrefix = (title: string, prefix: SettlePrefix) =>
  (typeof prefix === 'string' ? [prefix] : prefix).some(item => title.startsWith(item))

/** The linked record when it was not created by this app (its title lacks the module prefix). */
async function findForeignRecord(
  spreadsheetId: string,
  type: SettleType,
  recordId: string,
  prefix: SettlePrefix
) {
  const form = getSettings()?.forms.find(item => item.type === type)

  if (!form || !recordId) return null

  const match = (await fetchRecords(spreadsheetId, form)).find(record => record.id === recordId)

  return match && !hasPrefix(match.values.title ?? '', prefix) ? match : null
}

/** True when `recordId` is a record the user linked (so unpaying must ask before deleting it). */
export async function isLinkedForeignRecord(
  spreadsheetId: string,
  type: SettleType,
  recordId: string,
  prefix: SettlePrefix
): Promise<boolean> {
  return (await findForeignRecord(spreadsheetId, type, recordId, prefix)) !== null
}

/**
 * Unpay: a record this app created is deleted with its balance effect; a linked one stays
 * unless the user chose to delete it too. A record that is not in the expected form is looked
 * for in the other one (an older app build wrote a received check as an expense) and reversed
 * there with that form's balance effect. False when no record was found at all.
 */
export async function deleteLinkedRecordWithWallet(
  spreadsheetId: string,
  type: SettleType,
  recordId: string,
  prefix: SettlePrefix,
  unlink: UnlinkChoice = 'keep'
): Promise<boolean> {
  if (!recordId) return true
  if (unlink === 'keep' && (await findForeignRecord(spreadsheetId, type, recordId, prefix))) {
    return true
  }

  if ((await deleteLinkedRecord(spreadsheetId, type, recordId))?.found !== false) return true

  const other: SettleType = type === 'expense' ? 'income' : 'expense'

  if (unlink === 'keep' && (await findForeignRecord(spreadsheetId, other, recordId, prefix))) {
    return true
  }

  return (await deleteLinkedRecord(spreadsheetId, other, recordId))?.found !== false
}
