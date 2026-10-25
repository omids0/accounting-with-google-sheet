import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { appendSharedRecord, deleteSharedRecord, saveSharedAmount } from './sharedRecordWrites'
import {
  canEditRecord,
  latestRecord,
  personName,
  sharedPair,
  type PersonNames
} from './sharedViewModel'
import { useSharing } from '../../hooks/useSharing'
import { useUndoableDelete } from '../../hooks/useUndoableDelete'
import { getUserEmail } from '../../services/auth'
import { can, members, roleOf } from '../../services/buildingRoles'
import { useDataRevision } from '../../services/dataRevision'
import type { SharedRole, WorkspaceMember } from '../../services/memberRegistry'
import { getSettings } from '../../services/settings'
import {
  balanceOfRows,
  settlementOf,
  settlementRecord,
  type SharedRow
} from '../../services/sharedSettlement'
import { fetchRecords } from '../../services/sheets'
import type { CustomForm } from '../../types'
import { handleSheetError } from '../../utils/sheetError'
import { showError, showSuccess } from '../../utils/toast'
import { SHARED_CREATOR_FIELD_ID, SHARED_PAYER_FIELD_ID } from '../form/sharedFields'
import { enrichRecord, sortRecords, type StoredRecord } from '../records/recordsUtils'

const NO_ACCESS = 'دسترسی ندارید'

const isRecordForm = (form: CustomForm) => form.type === 'income' || form.type === 'expense'

const refuse = () => {
  showError(NO_ACCESS)

  return false
}

/**
 * The shared account's records for its three pages: both record forms read from the mirror
 * (again after every sync or write), the two people of the balance (owner and partner, from the
 * member rows), the balance from the raw rows (`balanceOfRows`, so a settlement counts once), the
 * signed-in user's rights, and the writes (add, settle, amount edit, undoable delete).
 */
export function useSharedRecords() {
  const revision = useDataRevision()
  const { label } = useSharing()
  const [forms, setForms] = useState<CustomForm[]>([])
  const [raw, setRaw] = useState<StoredRecord[]>([])
  const [loading, setLoading] = useState(true)
  const { schedule, visible } = useUndoableDelete()

  const spreadsheetId = getSettings()?.spreadsheetId ?? ''

  useEffect(() => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) {
      setLoading(false)

      return
    }

    let live = true
    const recordForms = settings.forms.filter(isRecordForm)

    void Promise.all(
      recordForms.map(async form =>
        (await fetchRecords(settings.spreadsheetId, form)).map(record => enrichRecord(record, form))
      )
    )
      .then(batches => {
        if (!live) return
        setForms(recordForms)
        setRaw(sortRecords(batches.flat(), recordForms))
      })
      .catch(err => live && handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری' }))
      .finally(() => live && setLoading(false))

    return () => {
      live = false
    }
  }, [revision])

  // Rows shift after every delete: the write looks the record up again by id.
  const rawRef = useRef(raw)

  rawRef.current = raw

  const records = useMemo(() => visible(raw), [visible, raw])

  const me = (getUserEmail() ?? '').trim().toLowerCase()
  const pair = sharedPair(members<WorkspaceMember>(spreadsheetId))
  const role = roleOf<SharedRole>(me, spreadsheetId)
  const access = {
    canRecord: can('record'),
    canSettle: can('settle'),
    canEditOthers: can('editOthers')
  }

  const rows: SharedRow[] = useMemo(
    () =>
      records.flatMap(record =>
        record.formType === 'income' || record.formType === 'expense'
          ? [{ type: record.formType, values: record.values }]
          : []
      ),
    [records]
  )

  const pairKey = pair?.join('|') ?? ''

  const balance = useMemo(
    () => (pair ? balanceOfRows(rows, pair) : null),
    // `pair` is rebuilt every render; its e-mails are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, pairKey]
  )

  const settlements = useMemo(
    () =>
      records.flatMap(record => {
        const settlement = record.formType === 'expense' ? settlementOf(record.values) : null

        return settlement ? [{ record, settlement }] : []
      }),
    [records]
  )

  const entries = useMemo(
    () => records.filter(record => !settlements.some(item => item.record.id === record.id)),
    [records, settlements]
  )

  const names: PersonNames = useMemo(() => {
    const emails = new Set(
      [
        me,
        ...(pair ?? []),
        ...records.flatMap(r => [
          r.values[SHARED_CREATOR_FIELD_ID],
          r.values[SHARED_PAYER_FIELD_ID]
        ])
      ].map(email =>
        String(email ?? '')
          .trim()
          .toLowerCase()
      )
    )

    return Object.fromEntries([...emails].filter(Boolean).map(email => [email, label(email).name]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, pairKey, label, me])

  const nameOf = useCallback((email: string) => personName(email, me, names), [me, names])

  const formOf = (type: 'income' | 'expense') => forms.find(form => form.type === type)

  const editable = (record: StoredRecord) =>
    canEditRecord({
      me,
      creator: record.values[SHARED_CREATOR_FIELD_ID] ?? '',
      canRecord: settlementOf(record.values) ? can('settle') : can('record'),
      canEditOthers: can('editOthers')
    })

  const write = async (task: () => Promise<unknown>, done: string, failed: string) => {
    try {
      await task()
      showSuccess(done)

      return true
    } catch (err) {
      handleSheetError(err, { fallbackMessage: failed })

      return false
    }
  }

  const add = async (type: 'income' | 'expense', values: Record<string, string | number>) => {
    const form = formOf(type)

    if (!form || !can('record')) return refuse()

    return write(() => appendSharedRecord(spreadsheetId, form, values), 'ثبت شد', 'خطا در ثبت')
  }

  const settle = async (from: string, to: string, amount: number, dateIso: string) => {
    const form = formOf('expense')

    if (!form || !can('settle')) return refuse()

    return write(
      () =>
        appendSharedRecord(spreadsheetId, form, settlementRecord(from, to, amount, dateIso, me)),
      'تسویه ثبت شد',
      'خطا در ثبت تسویه'
    )
  }

  const saveAmount = async (record: StoredRecord, amount: number) => {
    const form = forms.find(item => item.id === record.formId)

    if (!form || !editable(record)) return refuse()

    // The row as the latest read has it: a shifted row must not take the amount.
    const latest = latestRecord(rawRef.current, record.id)

    if (!latest) {
      showError('این ثبت دیگر در حساب مشترک نیست')

      return false
    }

    return write(
      () => saveSharedAmount(spreadsheetId, form, latest, amount),
      'مبلغ به‌روز شد',
      'خطا در ویرایش مبلغ'
    )
  }

  const remove = (record: StoredRecord) => {
    const form = forms.find(item => item.id === record.formId)

    if (!form || !editable(record)) {
      refuse()

      return
    }

    const title = String(record.values.title || record.values.category || '').trim()

    void schedule({
      id: record.id,
      label: title ? `ثبت «${title}»` : 'ثبت',
      errorMessage: 'خطا در حذف ثبت',
      commit: async () => {
        const latest = latestRecord(rawRef.current, record.id)

        // Already gone (deleted on another device): no stale row is deleted.
        if (latest) await deleteSharedRecord(spreadsheetId, form, latest)
      }
    })
  }

  return {
    loading,
    forms,
    /** Every record but the settlements, newest first. */
    entries,
    settlements,
    rows,
    me,
    role,
    pair,
    balance,
    names,
    nameOf,
    access,
    editable,
    add,
    settle,
    saveAmount,
    remove
  }
}

export type SharedRecords = ReturnType<typeof useSharedRecords>
