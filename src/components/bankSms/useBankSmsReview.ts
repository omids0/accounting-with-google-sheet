import { useCallback, useEffect, useMemo, useState } from 'react'

import { useSmsTemplates } from './useSmsTemplates'
import {
  confirmSmsEntry,
  confirmSmsTransfer,
  dismissSms,
  type ConfirmableSms,
  type SmsRecordInput
} from '../../services/bankSmsApply'
import { buildReviewItems, reviewSms, type LedgerEntry } from '../../services/bankSmsQueue'
import { getSettings } from '../../services/settings'
import { fetchRecords } from '../../services/sheets'
import { fetchWalletAccounts } from '../../services/wallet'
import { useBankSmsStore } from '../../stores/bankSmsStore'
import type { AppSettings } from '../../types'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { getCurrency } from '../../utils/formatMoney'
import { parseNumeric } from '../../utils/parseNumeric'
import { handleSheetError } from '../../utils/sheetError'
import { showSuccess } from '../../utils/toast'
import type { WalletAccountWithRow } from '../wallet/types'

async function loadLedger(settings: AppSettings): Promise<LedgerEntry[]> {
  const forms = settings.forms.filter(form => form.type === 'income' || form.type === 'expense')
  const perForm = await Promise.all(
    forms.map(async form =>
      (
        await fetchRecords(settings.spreadsheetId, form)
      ).map(record => ({
        type: form.type as LedgerEntry['type'],
        amount: parseNumeric(record.values.amount),
        date: record.values.date ?? ''
      }))
    )
  )

  return perForm.flat()
}

/** Everything the «پیامک‌های بانکی» page shows and does. */
export function useBankSmsReview() {
  const pending = useBankSmsStore(state => state.pending)
  const queueLoading = useBankSmsStore(state => state.loading)
  const refresh = useBankSmsStore(state => state.refresh)
  const scanFrom = useBankSmsStore(state => state.scanFrom)
  const templatesApi = useSmsTemplates()
  const [accounts, setAccounts] = useState<WalletAccountWithRow[]>([])
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [noPair, setNoPair] = useState<ReadonlySet<string>>(new Set())
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const loadContext = useCallback(async () => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) return

    try {
      const [walletAccounts, entries] = await Promise.all([
        fetchWalletAccounts(settings.spreadsheetId),
        loadLedger(settings)
      ])

      setAccounts(walletAccounts)
      setLedger(entries)
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در خواندن حساب‌ها' })
    }
  }, [])

  useEffect(() => {
    void loadContext()
    void refresh()
  }, [loadContext, refresh])

  const currency = getCurrency()
  const { templates } = templatesApi

  const items = useMemo(
    () => buildReviewItems(reviewSms(pending, templates, accounts, currency), ledger, noPair),
    [pending, templates, accounts, currency, ledger, noPair]
  )

  const run = async (
    key: string,
    message: string,
    task: (spreadsheetId: string) => Promise<void>
  ) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    setBusyKey(key)
    try {
      await task(spreadsheetId)
      await Promise.all([refresh(), loadContext()])
      showSuccess(message)
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در ثبت تراکنش پیامکی' })
    } finally {
      setBusyKey(null)
    }
  }

  return {
    items,
    accounts,
    currency,
    busyKey,
    loading: queueLoading,
    templatesApi,
    refresh,
    scanFrom,
    confirm: (entry: ConfirmableSms, record: SmsRecordInput | null) =>
      run(entry.sms.id, record ? 'تراکنش ثبت شد' : 'موجودی به‌روز شد', id =>
        confirmSmsEntry(id, entry, record)
      ),
    confirmTransfer: (key: string, debit: ConfirmableSms, credit: ConfirmableSms) =>
      run(key, 'انتقال داخلی ثبت شد', id => confirmSmsTransfer(id, debit, credit)),
    dismiss: (key: string, ids: string[]) =>
      run(key, 'پیامک نادیده گرفته شد', () => dismissSms(ids)),
    splitTransfer: (ids: string[]) => setNoPair(prev => new Set([...prev, ...ids]))
  }
}
