import { useState } from 'react'

import type { FundAccountDraft } from './journeyDraft'
import { rememberActiveWorkspaceCards } from '../../services/bankSmsRouting'
import {
  createFundAccount,
  recordFundCorrection,
  renameFundAccount
} from '../../services/buildingFund'
import { can } from '../../services/buildingRoles'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { getTodayIso } from '../../utils/jalaliDate'
import { handleSheetError } from '../../utils/sheetError'
import { showError, showSuccess } from '../../utils/toast'
import type { WalletAccountWithRow } from '../wallet/types'

/** Which sheet of the fund page is open: an account's sheet, its reconcile or edit form, or «+ حساب». */
export type FundSheet =
  | { kind: 'detail' | 'reconcile' | 'edit'; accountId: string }
  | { kind: 'new' }
  | null

/**
 * The writes of the fund page. Each one checks the permission again before it writes
 * (`record` for a correction, `settings` for an account) and reads the page again afterwards.
 */
export function useFundActions(accounts: WalletAccountWithRow[], reload: () => Promise<void>) {
  const [sheet, setSheet] = useState<FundSheet>(null)
  const [saving, setSaving] = useState(false)

  const find = (id: string) => accounts.find(account => account.id === id) ?? null

  const accountOf = sheet && 'accountId' in sheet ? find(sheet.accountId) : null

  const run = async (write: (spreadsheetId: string) => Promise<void>, failure: string) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    setSaving(true)
    try {
      await write(spreadsheetId)
      rememberActiveWorkspaceCards()
      setSheet(null)
      await reload()
    } catch (err) {
      if (!handleSheetError(err, { fallbackMessage: failure })) showError(failure)
    } finally {
      setSaving(false)
    }
  }

  const saveCorrection = async (account: WalletAccountWithRow, real: number, note: string) => {
    if (!can('record')) return showError('دسترسی ندارید')

    await run(async id => {
      await recordFundCorrection(id, account, real, note, getTodayIso())
      showSuccess(`موجودی «${account.title}» با بانک یکی شد`)
    }, 'خطا در ثبت اصلاح موجودی')
  }

  const saveAccount = async (draft: FundAccountDraft) => {
    if (!can('settings')) return showError('دسترسی ندارید')

    const editing = sheet?.kind === 'edit' ? accountOf : null

    await run(async id => {
      if (editing) await renameFundAccount(id, editing, draft)
      else await createFundAccount(id, draft)
      showSuccess('حساب ذخیره شد')
    }, 'خطا در ذخیرهٔ حساب')
  }

  return {
    sheet,
    setSheet,
    saving,
    accountOf,
    saveCorrection,
    saveAccount
  }
}
