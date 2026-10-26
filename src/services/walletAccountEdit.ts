import { fetchWalletAccounts, updateWalletAccount, type WalletAccountInput } from './wallet'
import type { WalletAccount } from '../types'
import { roundMoney } from '../utils/roundMoney'

/**
 * Saves the account edit form. The form carries the balance the page showed when it opened, but
 * another device may have moved the account since. So:
 * - the balance field was NOT changed: the write is a «change of 0» (`mergeBalance`) on the balance
 *   the local copy holds now, and the sheet keeps whatever balance it has when the write is sent;
 * - the balance field WAS changed (a manual correction): the typed balance overwrites, as before.
 * Returns whether the balance was set by hand, so the caller logs «اصلاح دستی» only then.
 */
export async function saveEditedWalletAccount(
  spreadsheetId: string,
  editing: WalletAccount & { rowNumber: number },
  payload: WalletAccountInput
): Promise<{ balanceSet: boolean }> {
  const balanceSet = roundMoney(payload.balance) !== roundMoney(editing.balance)

  if (balanceSet) {
    await updateWalletAccount(spreadsheetId, { ...editing, ...payload })

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
