import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { smsBulkItems } from './smsBulkItems'
import { useBankSmsContext } from './useBankSmsContext'
import { useBuildingSmsUnits } from './useBuildingSmsUnits'
import { useSmsTemplates } from './useSmsTemplates'
import { useBuildingAccess } from '../../hooks/useBuildingAccess'
import { useRoutedPendingSms } from '../../hooks/useRoutedPendingSms'
import { useUndoableDelete } from '../../hooks/useUndoableDelete'
import { getPathForTab } from '../../routes/paths'
import {
  confirmSmsEntry,
  confirmSmsTransfer,
  dismissSms,
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
import { unitSuggestionTitle, type SmsUnitInput } from '../../services/buildingSmsMatch'
import { payUnitFromSms } from '../../services/buildingSmsPayment'
import { useBankSmsStore } from '../../stores/bankSmsStore'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { getCurrency } from '../../utils/formatMoney'
import { haptic } from '../../utils/haptics'
import { toPersianDigits } from '../../utils/normalizeDigits'
import { BUILDING_CHARGE_CATEGORY } from '../../utils/protectedCategories'
import { handleSheetError } from '../../utils/sheetError'
import { showError, showSuccess } from '../../utils/toast'
import { isVehicleExpenseCategory } from '../../utils/vehicleExpenseUtils'
import type { BuildingSetupData } from '../buildings/useBuildingSetupData'

/** The card's category: the suggestion, or what the user picked instead (no `source`). */
export type SmsChoice = SmsCategoryChoice & Partial<Omit<SmsCategorySuggestion, 'category'>>

export const smsRecordType = (entry: ConfirmableSms) =>
  entry.result.direction === 'debit' ? ('expense' as const) : ('income' as const)

/** Everything the «پیامک‌های بانکی» page shows and does. */
/** `sinceMs`: only SMS received from this moment on are listed (older ones stay queued). */
export function useBankSmsReview(sinceMs: number, building: BuildingSetupData | null = null) {
  const pending = useRoutedPendingSms()
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
  const { can } = useBuildingAccess()
  const units = useBuildingSmsUnits(building, accounts)

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

  /** The category of a deposit/withdrawal as the round-6 rules give it (what «درآمد دیگر» saves). */
  const plainChoiceFor = useCallback(
    (entry: ConfirmableSms): SmsChoice | null =>
      picked[entry.sms.id] ?? suggestSmsCategory(smsSuggestInput(entry), suggestContext),
    [picked, suggestContext]
  )

  /** Same, but a deposit whose payer's card is a unit's says «شارژ ساختمان» (table, form fallback). */
  const choiceFor = useCallback(
    (entry: ConfirmableSms): SmsChoice | null => {
      const offer = units.offerFor(entry)

      return offer?.kind === 'card' && !picked[entry.sms.id]
        ? suggestSmsCategory(
            smsSuggestInput(entry, {
              title: unitSuggestionTitle(offer.candidate),
              category: BUILDING_CHARGE_CATEGORY
            }),
            suggestContext
          )
        : plainChoiceFor(entry)
    },
    [units, picked, suggestContext, plainChoiceFor]
  )

  const titleOf = (accountId: string) =>
    accounts.find(account => account.id === accountId)?.title ?? 'حساب'

  const run = async (
    key: string,
    message: string,
    task: (spreadsheetId: string) => Promise<unknown>
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

  /** A building deposit paid for a unit: `payUnitFromSms` writes the record and the payment. */
  const payForUnit = (spreadsheetId: string, entry: ConfirmableSms, unit: SmsUnitInput) => {
    if (!can('record')) {
      showError('دسترسی ندارید')

      return Promise.resolve()
    }

    return payUnitFromSms(spreadsheetId, entry, {
      unit: { id: unit.id, number: unit.number },
      debtor: unit.debtorId ? { id: unit.debtorId, name: unit.name } : null,
      accountTitle: titleOf(entry.result.accountId)
    })
  }

  const bulk = smsBulkItems(items, units.matchFor, plainChoiceFor)

  const openEntry = (entry: ConfirmableSms, options: BankSmsEntryOptions = {}) => {
    const state = buildBankSmsEntryState(entry, options)

    navigate(getPathForTab('entry', { formType: state.bankSmsEntry.formType }), { state })
  }

  /** Saves a deposit/withdrawal with its round-6 category, or opens the form when unsure. */
  const incomeFlow = (entry: ConfirmableSms, probableDuplicate: boolean) => {
    const choice = plainChoiceFor(entry)

    if (probableDuplicate || !choice || isVehicleExpenseCategory(choice.category)) {
      openEntry(entry, { choice })

      return
    }
    void run(entry.sms.id, `ثبت شد · ${choice.category}`, id =>
      confirmSmsEntry(id, entry, record(entry, choice))
    )
  }

  const payUnit = (entry: ConfirmableSms, unit: SmsUnitInput) =>
    run(entry.sms.id, `پرداخت واحد ${toPersianDigits(unit.number)} ثبت شد`, id =>
      payForUnit(id, entry, unit)
    )

  return {
    items,
    bulkCount: bulk.length,
    bulkUnitCount: bulk.filter(item => item.kind === 'unit').length,
    /** The building whose units deposits are matched to; null in a personal workspace. */
    building,
    accounts,
    busyKey,
    loading: queueLoading,
    templatesApi,
    refresh,
    scanFrom,
    choiceFor,
    pick: (smsId: string, choice: SmsChoice) => setPicked(prev => ({ ...prev, [smsId]: choice })),
    openEntry,
    offerFor: units.offerFor,
    /**
     * Swipe / table button. A deposit that is a unit's payment (card matched) pays the unit; one
     * with only an amount match opens the form (a unit has to be picked on the card).
     */
    primary: (entry: ConfirmableSms, probableDuplicate: boolean) => {
      const offer = units.offerFor(entry)

      if (!offer) return incomeFlow(entry, probableDuplicate)
      if (offer.kind === 'card' && !probableDuplicate)
        return void payUnit(entry, offer.candidate.unit)

      openEntry(entry, { choice: choiceFor(entry) })
    },
    /** The category a deposit would be saved with as plain income («درآمد دیگر» opens the form). */
    plainChoiceFor,
    payUnit,
    confirmAll: () =>
      run('all', `${bulk.length} تراکنش ثبت شد`, async spreadsheetId => {
        for (const item of bulk) {
          if (item.kind === 'unit') {
            await payForUnit(spreadsheetId, item.entry, item.unit)
          } else {
            await confirmSmsEntry(spreadsheetId, item.entry, record(item.entry, item.choice))
          }
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
