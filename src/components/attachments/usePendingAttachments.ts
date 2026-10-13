import { useEffect, useMemo, useSyncExternalStore } from 'react'

import {
  getPendingAttachmentsSnapshot,
  loadPendingAttachments,
  subscribePendingAttachments,
  type PendingAttachment
} from '../../services/attachmentBlobs'

let requested = false

/** Every receipt still waiting for Drive on this device (read once from IndexedDB). */
export function usePendingAttachmentList(): PendingAttachment[] {
  useEffect(() => {
    if (requested) return
    requested = true
    void loadPendingAttachments()
  }, [])

  return useSyncExternalStore(subscribePendingAttachments, getPendingAttachmentsSnapshot)
}

/** The waiting receipts of one row. */
export function usePendingAttachments(entityId: string | null | undefined): PendingAttachment[] {
  const all = usePendingAttachmentList()

  return useMemo(
    () => (entityId ? all.filter(item => item.entityId === entityId) : []),
    [all, entityId]
  )
}
