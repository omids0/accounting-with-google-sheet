import { useCallback, useEffect, useRef, useState } from 'react'

import {
  draftChanges,
  hasDraftChanges,
  initialDrafts,
  remainingSlots,
  type AttachmentDraft
} from './attachmentDraft'
import { usePendingAttachments } from './usePendingAttachments'
import { commitAttachmentChanges } from '../../services/attachmentUpload'
import { prepareAttachmentFile } from '../../utils/attachmentFile'
import { showError } from '../../utils/toast'

interface UseAttachmentDraftsOptions {
  /** The form is on screen; the drafts restart each time it opens. */
  open: boolean
  /** Another item in the same form also restarts them. */
  resetKey: string
  /** Ids already in the row (edit forms); [] for a new item. */
  fileIds?: readonly string[]
  /** Id of the edited row, to list its waiting uploads; null for a new item. */
  entityId?: string | null
}

const NO_IDS: readonly string[] = []

/** State of one form's «پیوست» field and the save step that applies it. */
export function useAttachmentDrafts({
  open,
  resetKey,
  fileIds = NO_IDS,
  entityId = null
}: UseAttachmentDraftsOptions) {
  const pending = usePendingAttachments(entityId)
  const [initial, setInitial] = useState<AttachmentDraft[]>([])
  const [drafts, setDrafts] = useState<AttachmentDraft[]>([])
  const [preparing, setPreparing] = useState(false)
  const source = useRef({ fileIds, pending })

  source.current = { fileIds, pending }

  const restart = useCallback(() => {
    const next = initialDrafts(source.current.fileIds, source.current.pending)

    setInitial(next)
    setDrafts(next)
  }, [])

  useEffect(() => {
    if (open) restart()
  }, [open, resetKey, restart])

  const draftsRef = useRef(drafts)

  draftsRef.current = drafts

  const addFiles = useCallback(async (files: readonly File[]) => {
    if (!files.length) return

    const room = remainingSlots(draftsRef.current)

    if (files.length > room) showError('حداکثر ۳ پیوست می‌شود؛ بقیه اضافه نشد.')
    if (room <= 0) return

    setPreparing(true)
    try {
      for (const file of files.slice(0, room)) {
        try {
          const prepared = await prepareAttachmentFile(file)

          setDrafts(current =>
            remainingSlots(current) > 0
              ? [...current, { key: `new:${crypto.randomUUID()}`, kind: 'new', file: prepared }]
              : current
          )
        } catch (err) {
          showError(err instanceof Error ? err.message : 'این فایل اضافه نشد.')
        }
      }
    } finally {
      setPreparing(false)
    }
  }, [])

  const remove = useCallback((key: string) => {
    setDrafts(current => current.filter(draft => draft.key !== key))
  }, [])

  /**
   * After the item itself was saved: removals, cancellations and new uploads.
   * The item stays saved when this fails; the user only loses the receipts.
   */
  const commit = async (
    spreadsheetId: string,
    sheetName: string,
    savedEntityId: string
  ): Promise<void> => {
    const changes = draftChanges(initial, drafts)

    if (!hasDraftChanges(changes)) return

    try {
      await commitAttachmentChanges(spreadsheetId, {
        sheetName,
        entityId: savedEntityId,
        ...changes
      })
    } catch (err) {
      showError(err instanceof Error ? `پیوست ذخیره نشد: ${err.message}` : 'پیوست ذخیره نشد')
    }
  }

  return {
    drafts,
    preparing,
    remaining: remainingSlots(drafts),
    addFiles,
    remove,
    commit,
    /** Empties the field (a create form that stays open for the next entry). */
    reset: restart
  }
}

export type AttachmentDraftsState = ReturnType<typeof useAttachmentDrafts>
