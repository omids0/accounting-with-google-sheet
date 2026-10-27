import { useCallback, useMemo, useRef } from 'react'

import { deleteStoredRecord } from './recordsMutations'
import { getFormField, type StoredRecord } from './recordsUtils'
import {
  removeParentAttachments,
  useAttachmentDeleteQuestion
} from '../../hooks/useAttachmentDeleteQuestion'
import { useSharedDeleteChoice } from '../../hooks/useSharedDeleteChoice'
import { useShareDeleteQuestion } from '../../hooks/useShareDeleteQuestion'
import { useUndoableDelete } from '../../hooks/useUndoableDelete'
import { isBuildingExpenseValues } from '../../services/buildingExpenseSplit'
import { hasSharedAccount } from '../../services/workspace'
import type { CustomForm } from '../../types'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { confirmDelete, undoableDeleteMessage } from '../../utils/confirmDelete'
import { isLinked } from '../form/sharedFields'

type UseRecordsDeleteOptions = {
  forms: CustomForm[]
  records: StoredRecord[]
  loadRecords: () => Promise<void>
}

/** Deletes a record once confirmed, with a five-second «بازگردانی» window before the sheet write. */
export function useRecordsDelete({ forms, records, loadRecords }: UseRecordsDeleteOptions) {
  const { schedule, visible, flush } = useUndoableDelete()
  // Rows shift after every delete (and may move to a yearly archive tab); the write
  // looks the record up again by id for its current row and tab.
  const recordsRef = useRef(records)
  const formsRef = useRef(forms)
  const loadRecordsRef = useRef(loadRecords)

  recordsRef.current = records
  formsRef.current = forms
  loadRecordsRef.current = loadRecords

  // Same array between renders, so memoized filters downstream do not rerun.
  const visibleRecords = useMemo(() => visible(records), [visible, records])

  const { ask, modalProps } = useAttachmentDeleteQuestion()
  const { ask: askShares, modalProps: shareQuestionModal } = useShareDeleteQuestion()
  const { ask: askShared, sheetProps: sharedDeleteSheet } = useSharedDeleteChoice()

  // Stable: each memoized records row receives it as a prop.
  const requestDelete = useCallback(
    async (record: StoredRecord) => {
      const form = formsRef.current.find(item => item.id === record.formId)

      if (!form) return

      const spreadsheetId = requireSpreadsheetId()

      if (!spreadsheetId) return

      const titleFieldId = getFormField(form, 'title')?.id
      const title = titleFieldId ? String(record.values[titleFieldId] ?? '').trim() : ''
      const label = title ? `تراکنش «${title}»` : 'تراکنش'

      if (!(await confirmDelete({ label, message: undoableDeleteMessage(label) }))) return

      const answer = await ask(record.attachments ?? [])

      if (!answer) return

      // A building expense with unit shares: the unpaid ones go with it, so ask first.
      if (form.type === 'expense' && isBuildingExpenseValues(record.values)) {
        const { countUnpaidExpenseShares } = await import('../../services/buildingExpenseActions')

        const unpaid = await countUnpaidExpenseShares(spreadsheetId, record.id).catch(() => 0)

        if (!(await askShares(unpaid))) return
      }

      // A record with a copy in the shared account: from both, or from the personal one only.
      const sharedAnswer =
        isLinked(record.values) && hasSharedAccount() ? await askShared(title) : 'one'

      if (!sharedAnswer) return

      void schedule({
        id: record.id,
        label,
        errorMessage: 'خطا در حذف تراکنش',
        commit: async () => {
          const current = recordsRef.current.find(item => item.id === record.id) ?? record

          await deleteStoredRecord({ spreadsheetId, record: current, form, sharedAnswer })
          void removeParentAttachments(current.attachments, answer)
          await loadRecordsRef.current()
        }
      })
    },
    [schedule, ask, askShares, askShared]
  )

  return {
    requestDelete,
    /** Writes the pending delete now, e.g. before the list is swapped for another form. */
    flushPendingDelete: flush,
    visibleRecords,
    attachmentQuestionModal: modalProps,
    shareQuestionModal,
    sharedDeleteSheet
  }
}
