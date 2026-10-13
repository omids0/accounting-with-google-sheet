import { useCallback, useRef, useState } from 'react'

import {
  attachmentDeleteMessage,
  fileIdsToDelete,
  shouldAskAttachmentDelete,
  type AttachmentDeleteAnswer
} from '../utils/attachmentDelete'

/**
 * «پیوست هم پاک شود؟» before a record, check or plan with receipts goes into
 * its undo window. `ask` resolves with the answer, or null when the sheet was
 * closed (the delete is called off). Items without receipts get no question.
 */
export function useAttachmentDeleteQuestion() {
  const [count, setCount] = useState(0)
  const resolver = useRef<((answer: AttachmentDeleteAnswer | null) => void) | null>(null)

  const ask = useCallback((fileIds: readonly string[]) => {
    if (!shouldAskAttachmentDelete(fileIds)) return Promise.resolve<AttachmentDeleteAnswer>('keep')

    resolver.current?.(null)

    return new Promise<AttachmentDeleteAnswer | null>(resolve => {
      resolver.current = resolve
      setCount(fileIds.length)
    })
  }, [])

  const answer = (value: AttachmentDeleteAnswer | null) => {
    resolver.current?.(value)
    resolver.current = null
    setCount(0)
  }

  return {
    ask,
    /** Spread into `ConfirmActionModal`. */
    modalProps: {
      open: count > 0,
      title: 'پیوست هم پاک شود؟',
      message: attachmentDeleteMessage(count),
      confirmLabel: 'بله، پاک شود',
      cancelLabel: 'نه، نگه دار',
      onConfirm: () => answer('delete'),
      onCancel: () => answer('keep'),
      onClose: () => answer(null)
    }
  }
}

/** After the parent row is gone: its Drive files, when the answer was «بله». */
export async function removeParentAttachments(
  fileIds: readonly string[] | undefined,
  answer: AttachmentDeleteAnswer
): Promise<void> {
  const doomed = fileIdsToDelete(fileIds ?? [], answer)

  if (!doomed.length) return

  const { deleteDriveFiles } = await import('../services/driveFiles')

  await deleteDriveFiles(doomed)
}
