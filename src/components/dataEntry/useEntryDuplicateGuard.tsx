import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'

import DuplicateRecordCard from './DuplicateRecordCard'
import { recordFocusPath } from '../../routes/paths'
import { getDateFieldId } from '../../services/dashboardAggregation'
import type { LedgerEntry } from '../../services/recordDuplicates'
import {
  duplicateReason,
  findDuplicateBeforeWrite,
  type WriteCandidate
} from '../../services/recordWriteGuard'
import { getSettings } from '../../services/settings'
import type { CustomForm } from '../../types'
import { parseNumeric } from '../../utils/parseNumeric'
import { normalizeSheetDate } from '../../utils/sheetValues'
import ConfirmActionModal from '../ConfirmActionModal'
import { WALLET_ACCOUNT_FIELD_ID } from '../form/fieldUtils'

/** What the entry form is about to write, in the terms of the shared duplicate rule. */
export function entryWriteCandidate(
  form: CustomForm,
  values: Record<string, string | number>
): WriteCandidate | null {
  if (form.type !== 'income' && form.type !== 'expense') return null

  return {
    type: form.type,
    amount: parseNumeric(values.amount),
    date: normalizeSheetDate(values[getDateFieldId(form)] ?? ''),
    accountId: String(values[WALLET_ACCOUNT_FIELD_ID] ?? ''),
    category: String(values.category ?? ''),
    title: String(values.title ?? '')
  }
}

interface Pending {
  record: LedgerEntry
  type: LedgerEntry['type']
  /** Day of the entry being saved, to say how close the existing record is. */
  date: string
  run: () => Promise<void>
}

/**
 * «قبلاً ثبت شده؟» for the entry form (manual entry and a bank SMS opened in it). `ask` looks for a
 * probable duplicate with the shared rule (`recordWriteGuard`) and, when one exists, opens a question
 * instead of saving: «فرق دارد، ثبت کن» runs the save once, «دیدن آن رکورد» opens the existing record.
 * It never blocks: with nothing found, or the records unreadable, `ask` answers false and the caller saves.
 */
export function useEntryDuplicateGuard(form: CustomForm) {
  const navigate = useNavigate()
  const [pending, setPending] = useState<Pending | null>(null)
  const [confirming, setConfirming] = useState(false)

  const ask = useCallback(
    async (values: Record<string, string | number>, run: () => Promise<void>) => {
      const candidate = entryWriteCandidate(form, values)
      const settings = getSettings()

      if (!candidate || !settings?.spreadsheetId) return false

      const record = await findDuplicateBeforeWrite(settings, candidate).catch(() => null)

      if (!record) return false
      setPending({ record, type: candidate.type, date: candidate.date, run })

      return true
    },
    [form]
  )

  const close = () => {
    if (!confirming) setPending(null)
  }

  const modal = (
    <ConfirmActionModal
      open={pending !== null}
      title="قبلاً ثبت شده؟"
      message={`به نظر این همان است: ${
        pending ? duplicateReason(pending.date, pending.record) : ''
      } اگر مورد جدایی است «فرق دارد، ثبت کن» را بزنید.`}
      confirmLabel="فرق دارد، ثبت کن"
      cancelLabel="دیدن آن رکورد"
      confirming={confirming}
      onClose={close}
      onCancel={() => {
        if (!pending?.record.id) return
        const target = recordFocusPath(pending.type, pending.record.id)

        setPending(null)
        navigate(target)
      }}
      onConfirm={async () => {
        if (!pending) return
        setConfirming(true)
        try {
          await pending.run()
          setPending(null)
        } finally {
          setConfirming(false)
        }
      }}
    >
      {pending ? <DuplicateRecordCard record={pending.record} /> : null}
    </ConfirmActionModal>
  )

  return { ask, modal }
}
