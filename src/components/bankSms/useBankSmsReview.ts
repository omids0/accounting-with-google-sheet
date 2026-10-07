import { useCallback, useEffect, useMemo, useState } from 'react'

import { useSmsTemplates } from './useSmsTemplates'
import {
  confirmSmsEntry,
  confirmSmsTransfer,
  defaultSmsRecord,
  dismissSms,
  isConfirmable,
  type ConfirmableSms,
  type SmsRecordInput
} from '../../services/bankSmsApply'
import { matchSms } from '../../services/bankSmsMatch'
import { getBankSmsPrefs } from '../../services/bankSmsPrefs'
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
  const { templates, loading: templatesLoading } = templatesApi

  // Not bank-like and fitting no template: nothing to review, drop it from the native queue.
  useEffect(() => {
    if (templatesLoading) return

    const stale = pending
      .filter(sms => matchSms(sms.body, templates, accounts).kind === 'irrelevant')
      .map(sms => sms.id)

    if (stale.length) void dismissSms(stale).then(() => refresh())
  }, [pending, templates, accounts, templatesLoading, refresh])

  const items = useMemo(
    () =>
      buildReviewItems(
        // Prefs change when a template is saved or an SMS confirmed, which also changes these deps.
        reviewSms(pending, templates, accounts, currency, getBankSmsPrefs().refAccounts),
        ledger,
        noPair
      ),
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
      showSuccess(message)
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در ثبت تراکنش پیامکی' })
    } finally {
      // Also after a failure: part of the task may have been written already.
      await Promise.all([refresh(), loadContext()])
      setBusyKey(null)
    }
  }

  /** Recognised, single-account, not a probable duplicate: safe for «ثبت همه». */
  const bulk = items.flatMap(item =>
    item.kind === 'single' && !item.probableDuplicate && isConfirmable(item.entry)
      ? [item.entry]
      : []
  )

  const confirmAll = () =>
    run('all', `${bulk.length} تراکنش ثبت شد`, async spreadsheetId => {
      for (const entry of bulk) {
        const title =
          accounts.find(account => account.id === entry.result.accountId)?.title ?? 'حساب'

        await confirmSmsEntry(spreadsheetId, entry, defaultSmsRecord(entry, title))
      }
    })

  return {
    items,
    bulkCount: bulk.length,
    confirmAll,
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
    dismiss: (key: string, ids: string[], message = 'پیامک نادیده گرفته شد') =>
      run(key, message, () => dismissSms(ids)),
    splitTransfer: (ids: string[]) => setNoPair(prev => new Set([...prev, ...ids]))
  }
}
