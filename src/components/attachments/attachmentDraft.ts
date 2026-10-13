import type { PendingAttachment } from '../../services/attachmentBlobs'
import type { AttachmentChanges, AttachmentFile } from '../../services/attachmentUpload'
import { MAX_ATTACHMENTS } from '../../utils/attachmentIds'

/** One thumbnail of the «پیوست» field. */
export type AttachmentDraft =
  /** Already on Drive (an id in the row). */
  | { key: string; kind: 'saved'; fileId: string }
  /** Waiting in the outbox from an earlier save. */
  | { key: string; kind: 'pending'; pending: PendingAttachment }
  /** Picked in this form, not saved yet. */
  | { key: string; kind: 'new'; file: AttachmentFile }

export function initialDrafts(
  fileIds: readonly string[],
  pending: readonly PendingAttachment[]
): AttachmentDraft[] {
  return [
    ...fileIds.map(fileId => ({ key: `saved:${fileId}`, kind: 'saved' as const, fileId })),
    ...pending.map(item => ({ key: `pending:${item.id}`, kind: 'pending' as const, pending: item }))
  ]
}

export function remainingSlots(drafts: readonly AttachmentDraft[]): number {
  return Math.max(0, MAX_ATTACHMENTS - drafts.length)
}

/** What saving the form must do on Drive and in the row, compared with how it opened. */
export function draftChanges(
  initial: readonly AttachmentDraft[],
  current: readonly AttachmentDraft[]
): Omit<AttachmentChanges, 'sheetName' | 'entityId'> {
  const kept = new Set(current.map(draft => draft.key))
  const removed = initial.filter(draft => !kept.has(draft.key))

  return {
    removedFileIds: removed.flatMap(draft => (draft.kind === 'saved' ? [draft.fileId] : [])),
    cancelledPendingIds: removed.flatMap(draft =>
      draft.kind === 'pending' ? [draft.pending.id] : []
    ),
    newFiles: current.flatMap(draft => (draft.kind === 'new' ? [draft.file] : []))
  }
}

export function hasDraftChanges(changes: ReturnType<typeof draftChanges>): boolean {
  return Boolean(
    changes.removedFileIds.length || changes.cancelledPendingIds.length || changes.newFiles.length
  )
}

export function isPdfDraft(draft: AttachmentDraft): boolean {
  const mime =
    draft.kind === 'new'
      ? draft.file.mimeType
      : draft.kind === 'pending'
      ? draft.pending.mimeType
      : ''

  return mime === 'application/pdf'
}
