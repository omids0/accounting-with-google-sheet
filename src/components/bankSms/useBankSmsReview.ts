import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { useBankSmsContext } from './useBankSmsContext'
import { useSmsTemplates } from './useSmsTemplates'
import { useUndoableDelete } from '../../hooks/useUndoableDelete'
import { getPathForTab } from '../../routes/paths'
import {
  confirmSmsEntry,
  confirmSmsTransfer,
  dismissSms,
  isConfirmable,
  suggestedSmsRecord,
  type ConfirmableSms,
  type SmsRecordInput
} from '../../services/bankSmsApply'
import { buildBankSmsEntryState, type BankSmsEntryOptions } from '../../services/bankSmsEntry'
import { matchSms } from '../../services/bankSmsMatch'
import { getBankSmsPrefs } from '../../services/bankSmsPrefs'
import { buildReviewItems, reviewSms } from '../../services/bankSmsQueue'
import {
  smsSuggestInput,
  suggestSmsCategory,
  type SmsCategoryChoice,
  type SmsCategorySuggestion
} from '../../services/bankSmsSuggest'
import { useBankSmsStore } from '../../stores/bankSmsStore'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { getCurrency } from '../../utils/formatMoney'
import { haptic } from '../../utils/haptics'
import { handleSheetError } from '../../utils/sheetError'
import { showSuccess } from '../../utils/toast'
import { isVehicleExpenseCategory } from '../../utils/vehicleExpenseUtils'

/** The card's category: the suggestion, or what the user picked instead (no `source`). */
export type SmsChoice = SmsCategoryChoice & Partial<Omit<SmsCategorySuggestion, 'category'>>

export const smsRecordType = (entry: ConfirmableSms) =>
  entry.result.direction === 'debit' ? ('expense' as const) : ('income' as const)

/** Everything the «پیامک‌های بانکی» page shows and does. */
/** `sinceMs`: only SMS received from this moment on are listed (older ones stay queued). */
export function useBankSmsReview(sinceMs: number) {
  const pending = useBankSmsStore(state => state.pending)
  const queueLoading = useBankSmsStore(state => state.loading)
  const refresh = useBankSmsStore(state => state.refresh)
  const scanFrom = useBankSmsStore(state => state.scanFrom)
  const templatesApi = useSmsTemplates()
  const { accounts, ledger, recurring, reload: loadContext } = useBankSmsContext()
  const [noPair, setNoPair] = useState<ReadonlySet<string>>(new Set())
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [picked, setPicked] = useState<Record<string, SmsChoice>>({})
  const undoable = useUndoableDelete()
  const navigate = useNavigate()

  useEffect(() => {
    void refresh()
  }, [refresh])

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

  const allItems = useMemo(
    () =>
      buildReviewItems(
        // Prefs change when a template is saved or an SMS confirmed, which also changes these deps.
        reviewSms(
          pending.filter(sms => sms.receivedAt >= sinceMs),
          templates,
          accounts,
          currency,
          getBankSmsPrefs().refAccounts
        ),
        ledger,
        noPair
      ),
    [pending, sinceMs, templates, accounts, currency, ledger, noPair]
  )
  // The SMS waiting out its «نادیده» undo window is already gone from the list.
  const items = allItems.filter(item => item.key !== undoable.pendingId)

  const suggestContext = useMemo(() => {
    const prefs = getBankSmsPrefs()

    return {
      recurring,
      ledger,
      bySender: prefs.lastCategoryBySender,
      byTemplate: prefs.lastCategory
    }
    // `pending` changes after every confirm, which is when the remembered categories change.
  }, [recurring, ledger, pending]) // eslint-disable-line react-hooks/exhaustive-deps

  const choiceFor = useCallback(
    (entry: ConfirmableSms): SmsChoice | null =>
      picked[entry.sms.id] ?? suggestSmsCategory(smsSuggestInput(entry), suggestContext),
    [picked, suggestContext]
  )

  const titleOf = (accountId: string) =>
    accounts.find(account => account.id === accountId)?.title ?? 'حساب'

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
      haptic('light')
    } catch (err) {
      haptic('error')
      handleSheetError(err, { fallbackMessage: 'خطا در ثبت تراکنش پیامکی' })
    } finally {
      // Also after a failure: part of the task may have been written already.
      await Promise.all([refresh(), loadContext()])
      setBusyKey(null)
    }
  }

  const record = (entry: ConfirmableSms, choice: SmsChoice): SmsRecordInput =>
    suggestedSmsRecord(choice, titleOf(entry.result.accountId))

  /** Recognised, single-account, not a probable duplicate, with a category: «ثبت همه». */
  const bulk = items.flatMap(item => {
    if (item.kind !== 'single' || item.probableDuplicate || !isConfirmable(item.entry)) return []

    const choice = choiceFor(item.entry)

    // A vehicle expense needs its vehicle, type and mileage, which only the form asks for.
    return choice && !isVehicleExpenseCategory(choice.category)
      ? [{ entry: item.entry, choice }]
      : []
  })

  const openEntry = (entry: ConfirmableSms, options: BankSmsEntryOptions = {}) => {
    const state = buildBankSmsEntryState(entry, options)

    navigate(getPathForTab('entry', { formType: state.bankSmsEntry.formType }), { state })
  }

  return {
    items,
    bulkCount: bulk.length,
    accounts,
    busyKey,
    loading: queueLoading,
    templatesApi,
    refresh,
    scanFrom,
    choiceFor,
    pick: (smsId: string, choice: SmsChoice) => setPicked(prev => ({ ...prev, [smsId]: choice })),
    openEntry,
    /** The card's main button: save with its category, or open the form when unsure. */
    primary: (entry: ConfirmableSms, probableDuplicate: boolean) => {
      const choice = choiceFor(entry)

      if (probableDuplicate || !choice || isVehicleExpenseCategory(choice.category)) {
        openEntry(entry, { choice })

        return
      }
      void run(entry.sms.id, `ثبت شد · ${choice.category}`, id =>
        confirmSmsEntry(id, entry, record(entry, choice))
      )
    },
    confirmAll: () =>
      run('all', `${bulk.length} تراکنش ثبت شد`, async spreadsheetId => {
        for (const { entry, choice } of bulk) {
          await confirmSmsEntry(spreadsheetId, entry, record(entry, choice))
        }
      }),
    balanceOnly: (entry: ConfirmableSms) =>
      run(entry.sms.id, 'موجودی به‌روز شد', id => confirmSmsEntry(id, entry, null)),
    confirmTransfer: (key: string, debit: ConfirmableSms, credit: ConfirmableSms) =>
      run(key, 'انتقال داخلی ثبت شد', id => confirmSmsTransfer(id, debit, credit)),
    /** «قبلاً ثبت شده»: leaves the list at once, nothing else changes. */
    alreadyRecorded: (key: string, ids: string[]) =>
      run(key, 'از لیست خارج شد', () => dismissSms(ids)),
    /** «نادیده» with a five-second «بازگردانی». */
    dismiss: (key: string, ids: string[]) =>
      void undoable.schedule({
        id: key,
        label: 'پیامک',
        message: 'پیامک نادیده گرفته شد',
        errorMessage: 'خطا در نادیده گرفتن پیامک',
        commit: async () => {
          await dismissSms(ids)
          await refresh()
        }
      }),
    splitTransfer: (ids: string[]) => setNoPair(prev => new Set([...prev, ...ids]))
  }
}

export type BankSmsReview = ReturnType<typeof useBankSmsReview>
