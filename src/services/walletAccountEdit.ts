import { fetchWalletAccounts, updateWalletAccount, type WalletAccountInput } from './wallet'
import { refreshWalletAccounts } from './walletFresh'
import { logBalanceSet } from './walletLedger'
import type { WalletAccount } from '../types'
import { roundMoney } from '../utils/roundMoney'

/**
 * A balance typed by hand overwrites the sheet's. The account is read fresh first, so the ledger
 * line «اصلاح دستی» shows the real change (not one against the old copy the form was opened on),
 * and a row another device deleted is not written over.
 */
export async function setBalanceByHand(
  spreadsheetId: string,
  account: WalletAccount & { rowNumber: number },
  next: WalletAccount & { rowNumber: number }
): Promise<WalletAccount> {
  if ((await refreshWalletAccounts(spreadsheetId, [account.id])).size) {
    throw new Error('این حساب در شیت پیدا نشد؛ شاید روی دستگاه دیگری حذف شده باشد.')
  }

  const held = (await fetchWalletAccounts(spreadsheetId)).find(item => item.id === account.id)
  const saved = await updateWalletAccount(spreadsheetId, {
    ...next,
    rowNumber: held?.rowNumber ?? next.rowNumber
  })

  await logBalanceSet(
    spreadsheetId,
    account.id,
    held?.balance ?? account.balance,
    next.balance,
    'اصلاح دستی'
  )

  return saved
}

/**
 * Saves the account edit form. The form carries the balance the page showed when it opened, but
 * another device may have moved the account since. So:
 * - the balance field was NOT changed: the write is a «change of 0» (`mergeBalance`) on the balance
 *   the local copy holds now, and the sheet keeps whatever balance it has when the write is sent;
 * - the balance field WAS changed (a manual correction): the typed balance overwrites, as before.
 * Returns whether the balance was set by hand (the «اصلاح دستی» ledger line is written here).
 */
export async function saveEditedWalletAccount(
  spreadsheetId: string,
  editing: WalletAccount & { rowNumber: number },
  payload: WalletAccountInput
): Promise<{ balanceSet: boolean }> {
  const balanceSet = roundMoney(payload.balance) !== roundMoney(editing.balance)

  if (balanceSet) {
    await setBalanceByHand(spreadsheetId, editing, { ...editing, ...payload })

    return { balanceSet }
  }

  // The same copy the write is checked against (its expected row), so the change is exactly 0.
  const held = (await fetchWalletAccounts(spreadsheetId)).find(item => item.id === editing.id)

  await updateWalletAccount(
    spreadsheetId,
    {
      ...editing,
      ...payload,
      balance: held?.balance ?? editing.balance,
      rowNumber: held?.rowNumber ?? editing.rowNumber
    },
    { mergeBalance: true }
  )

  return { balanceSet }
}
