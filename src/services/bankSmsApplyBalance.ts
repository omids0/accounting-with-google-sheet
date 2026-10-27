import { balanceAdjustNotice } from './bankSmsBalance'
import { smsRecordDate } from './bankSmsDate'
import { getBankSmsPrefs, learnSmsRef, updateBankSmsPrefs } from './bankSmsPrefs'
import { nextAccountBalance, setsAbsoluteBalance, type ConfirmableSms } from './bankSmsQueue'
import { fetchWalletAccounts, updateWalletAccount } from './wallet'
import { refreshWalletAccounts } from './walletFresh'
import { ledgerEntry, logLedger } from './walletLedger'
import { roundMoney } from '../utils/roundMoney'
import { showInfo } from '../utils/toast'

/**
 * Title and record of the ledger row; the source is always «پیامک». `quiet` keeps the
 * «موجودی تنظیم شد» notice back when the caller already tells the user the balance changed.
 */
export type SmsLedgerNote = { title?: string; recordId?: string; quiet?: boolean }

/**
 * The one place every SMS path (card confirm, transfer, entry form, vehicle/building routes,
 * reconcile wizard) moves the account balance. A balance that jumps to the SMS «مانده» instead of
 * moving by the SMS amount is announced here, so no path can forget it.
 */
export async function applyBalance(
  spreadsheetId: string,
  entry: ConfirmableSms,
  note: SmsLedgerNote = {}
): Promise<void> {
  learnSmsRef(entry.result.ref, entry.result.accountId)

  const accountId = entry.result.accountId
  const state = getBankSmsPrefs().balanceStates[accountId] ?? {}
  // Only an SMS «مانده» sets the balance. Any other SMS moves it by its amount, so it is added to
  // the balance the sheet holds now and sent as a change another device's move survives. The row is
  // read fresh for both, so the ledger line shows the real change, not one from an old local copy.
  const absolute = setsAbsoluteBalance(entry.sms.receivedAt, entry.balance, state)

  if ((await refreshWalletAccounts(spreadsheetId, [accountId])).size) return

  const account = (await fetchWalletAccounts(spreadsheetId)).find(item => item.id === accountId)

  if (!account) return

  const prefs = getBankSmsPrefs()
  const { direction } = entry.result
  const next = nextAccountBalance(
    account.balance,
    { receivedAt: entry.sms.receivedAt, direction, amount: entry.amount },
    entry.balance,
    prefs.balanceStates[account.id] ?? {}
  )

  if (!next) return

  const changed = roundMoney(next.balance) !== roundMoney(account.balance)

  if (changed) {
    await updateWalletAccount(
      spreadsheetId,
      { ...account, balance: next.balance },
      absolute ? undefined : { mergeBalance: true }
    )
  }
  updateBankSmsPrefs({ balanceStates: { ...prefs.balanceStates, [account.id]: next.state } })
  if (!changed) return

  const notice = note.quiet
    ? null
    : balanceAdjustNotice(account.balance, next.balance, entry.amount, direction, account.title)

  if (notice) showInfo(notice, 7000)

  await logLedger(spreadsheetId, [
    ledgerEntry(account.id, next.balance - account.balance, next.balance, {
      title: note.title || `${account.title} — پیامک`,
      date: smsRecordDate(entry.sms.body, entry.sms.receivedAt),
      source: 'پیامک',
      recordId: note.recordId
    })
  ])
}
