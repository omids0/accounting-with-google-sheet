import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { getPathForTab, recordFocusPath } from '../../../routes/paths'
import { confirmSmsEntry, suggestedSmsRecord } from '../../../services/bankSmsApply'
import { buildBankSmsEntryState } from '../../../services/bankSmsEntry'
import { getBankSmsPrefs } from '../../../services/bankSmsPrefs'
import {
  isProbableDuplicate,
  type ConfirmableSms,
  type ReviewedSms
} from '../../../services/bankSmsQueue'
import {
  accountSms,
  matchSmsToRecords,
  reconcileAccount,
  reconcileRangeStart,
  type CorrectionOptions
} from '../../../services/bankSmsReconcile'
import { createReconcileCorrection } from '../../../services/bankSmsReconcileApply'
import { loadReconcileSms, refreshReconcileDigest } from '../../../services/bankSmsReconcileData'
import { readReconcileEntries, saveReconcileSuccess } from '../../../services/bankSmsReconcileStore'
import { smsSuggestInput, suggestSmsCategory } from '../../../services/bankSmsSuggest'
import type { LedgerEntry } from '../../../services/recordDuplicates'
import { getSettings } from '../../../services/settings'
import { useBankSmsStore } from '../../../stores/bankSmsStore'
import { requireSpreadsheetId } from '../../../utils/authGuard'
import { haptic } from '../../../utils/haptics'
import { toIsoDate } from '../../../utils/jalaliDate'
import { isLinkTargetCategory } from '../../../utils/linkTargetKinds'
import { handleSheetError } from '../../../utils/sheetError'
import { showSuccess } from '../../../utils/toast'
import { isVehicleExpenseCategory } from '../../../utils/vehicleExpenseUtils'
import { useBankSmsContext } from '../../bankSms/useBankSmsContext'

/** The «تطبیق <حساب>» wizard: live difference, SMS without records, records without SMS. */
export function useReconcileWizard(accountId: string) {
  const { accounts, ledger, recurring, reload } = useBankSmsContext()
  const navigate = useNavigate()
  const spreadsheetId = getSettings()?.spreadsheetId ?? ''
  const [entry, setEntry] = useState(() => readReconcileEntries(spreadsheetId)[accountId])
  // Fixed for this visit: a success while the wizard is open must not shrink the lists.
  const [startMs] = useState(() => reconcileRangeStart(entry, Date.now()))
  const [sms, setSms] = useState<ReviewedSms[] | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const account = accounts.find(item => item.id === accountId)

  const loadSms = useCallback(async () => {
    if (!spreadsheetId || !accounts.length) return
    setSms(await loadReconcileSms(spreadsheetId, accounts).catch(() => []))
  }, [spreadsheetId, accounts])

  useEffect(() => {
    void loadSms()
  }, [loadSms])

  const view = useMemo(() => {
    if (!account || !sms) return null

    const all = accountSms(sms, accountId)
    const result = reconcileAccount(accountId, account.balance, all, ledger)
    const startDay = toIsoDate(new Date(startMs))
    const inRange = (record: LedgerEntry) => record.date >= startDay
    const match = result?.match ?? matchSmsToRecords(all, ledger, accountId)

    return {
      result,
      smsCount: all.filter(item => item.sms.receivedAt >= startMs).length,
      recordCount: ledger.filter(record => record.accountId === accountId && inRange(record))
        .length,
      missing: match.missingSms.filter(item => item.sms.receivedAt >= startMs),
      unmatched: match.unmatchedRecords.filter(inRange)
    }
  }, [account, sms, accountId, ledger, startMs])

  const result = view?.result ?? null

  // Difference 0 is a successful reconciliation; the next visit starts from this SMS.
  useEffect(() => {
    if (!result || result.difference !== 0 || entry?.smsAt === result.smsAt) return
    saveReconcileSuccess(spreadsheetId, accountId, {
      balance: result.smsBalance,
      smsAt: result.smsAt
    })
    setEntry(readReconcileEntries(spreadsheetId)[accountId])
  }, [result, entry, spreadsheetId, accountId])

  // Keep tonight's digest line in step with what the wizard now knows.
  useEffect(() => {
    if (sms && spreadsheetId) refreshReconcileDigest(spreadsheetId, accounts, sms, ledger)
  }, [sms, spreadsheetId, accounts, ledger, entry])

  /** Resolves `true` when the task went through. */
  const run = async (
    key: string,
    message: string,
    task: (id: string) => Promise<void>
  ): Promise<boolean> => {
    const id = requireSpreadsheetId()

    if (!id) return false
    setBusyKey(key)
    try {
      await task(id)
      showSuccess(message)
      haptic('light')

      return true
    } catch (err) {
      haptic('error')
      handleSheetError(err, { fallbackMessage: 'خطا در ثبت تطبیق' })

      return false
    } finally {
      // Also after a failure: part of the task may have been written already.
      await Promise.all([reload(), loadSms(), useBankSmsStore.getState().refresh()])
      setEntry(readReconcileEntries(id)[accountId])
      setBusyKey(null)
    }
  }

  const choiceFor = (item: ConfirmableSms) => {
    const prefs = getBankSmsPrefs()

    return suggestSmsCategory(smsSuggestInput(item), {
      recurring,
      ledger,
      bySender: prefs.lastCategoryBySender,
      byTemplate: prefs.lastCategory
    })
  }

  return {
    account,
    /** SMS not read yet (they are read once the accounts are in). */
    loading: sms === null,
    view,
    entry,
    startMs,
    busyKey,
    choiceFor,
    /** «ثبت»: exactly the queue card's main button (save, or the form when unsure). */
    save: (item: ConfirmableSms) => {
      const choice = choiceFor(item)

      // A vehicle expense needs its vehicle and mileage, a «بدهی»/«طلب» the debt or receivable it
      // pays: the form asks them, a silent save cannot.
      if (
        !choice ||
        isProbableDuplicate(item, ledger) ||
        isVehicleExpenseCategory(choice.category) ||
        isLinkTargetCategory(
          item.result.direction === 'debit' ? 'expense' : 'income',
          choice.category
        )
      ) {
        const state = buildBankSmsEntryState(item, { choice })

        navigate(getPathForTab('entry', { formType: state.bankSmsEntry.formType }), { state })

        return
      }
      void run(item.sms.id, `ثبت شد · ${choice.category}`, id =>
        confirmSmsEntry(id, item, suggestedSmsRecord(choice, account?.title ?? 'حساب'))
      )
    },
    /** ⋯ on a record without SMS: its edit form on the records page. */
    edit: (record: LedgerEntry) => {
      if (record.id) navigate(recordFocusPath(record.type, record.id, true))
    },
    /** «تنظیم دستی موجودی»: the correction record, in the category the user picked. */
    correct: async (options?: CorrectionOptions): Promise<boolean> => {
      if (!result?.difference) return false

      return run('correct', 'رکورد اصلاحی ثبت شد', id =>
        createReconcileCorrection(id, accountId, result, options)
      )
    }
  }
}

export type ReconcileWizard = ReturnType<typeof useReconcileWizard>
