import { useCallback, useMemo, useRef } from 'react'

import { deleteStoredRecord } from './recordsMutations'
import { getFormField, type StoredRecord } from './recordsUtils'
import {
  removeParentAttachments,
  useAttachmentDeleteQuestion
} from '../../hooks/useAttachmentDeleteQuestion'
import { useUndoableDelete } from '../../hooks/useUndoableDelete'
import type { CustomForm } from '../../types'
import { requireSpreadsheetId } from '../../utils/authGuard'

type UseRecordsDeleteOptions = {
  forms: CustomForm[]
  records: StoredRecord[]
  loadRecords: () => Promise<void>
}

/** Deletes a record at once with a five-second «بازگردانی» window before the sheet write. */
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

  // Stable: each memoized records row receives it as a prop.
  const requestDelete = useCallback(
    async (record: StoredRecord) => {
      const form = formsRef.current.find(item => item.id === record.formId)

      if (!form) return

      const spreadsheetId = requireSpreadsheetId()

      if (!spreadsheetId) return

      const answer = await ask(record.attachments ?? [])

      if (!answer) return

      const titleFieldId = getFormField(form, 'title')?.id
      const title = titleFieldId ? String(record.values[titleFieldId] ?? '').trim() : ''

      void schedule({
        id: record.id,
        label: title ? `تراکنش «${title}»` : 'تراکنش',
        errorMessage: 'خطا در حذف تراکنش',
        commit: async () => {
          const current = recordsRef.current.find(item => item.id === record.id) ?? record

          await deleteStoredRecord({ spreadsheetId, record: current, form })
          void removeParentAttachments(current.attachments, answer)
          await loadRecordsRef.current()
        }
      })
    },
    [schedule, ask]
  )

  return {
    requestDelete,
    /** Writes the pending delete now, e.g. before the list is swapped for another form. */
    flushPendingDelete: flush,
    visibleRecords,
    attachmentQuestionModal: modalProps
  }
}
