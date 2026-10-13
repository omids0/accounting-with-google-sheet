import { useCallback, useState, type MouseEvent } from 'react'

import AttachmentViewerSheet from './AttachmentViewerSheet'
import { usePendingAttachments } from './usePendingAttachments'
import AppIcon from '../AppIcon'
import { attachmentBadgeClass } from '../ui/attachmentStyles'

const NO_IDS: readonly string[] = []

/**
 * «📎 N» on a list row: its uploaded receipts plus the ones still waiting on
 * this device. Nothing when it has none. A tap opens the viewer sheet.
 */
export default function AttachmentBadge({
  sheetName,
  entityId,
  fileIds,
  title
}: {
  sheetName: string
  entityId: string
  fileIds?: readonly string[]
  /** Heading of the viewer, e.g. the record title. */
  title: string
}) {
  const [open, setOpen] = useState(false)
  const pending = usePendingAttachments(entityId)
  const ids = fileIds ?? NO_IDS
  const count = ids.length + pending.length
  const close = useCallback(() => setOpen(false), [])

  if (!count && !open) return null

  const label = count.toLocaleString('fa-IR')

  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    // Rows react to taps themselves (edit, expand): the badge is its own action.
    event.stopPropagation()
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        className={attachmentBadgeClass}
        onClick={onClick}
        aria-label={`${label} پیوست`}
      >
        <AppIcon name="paperclip" size={13} />
        {label}
      </button>
      {/* Mounted only while open: a long list keeps one light button per row. */}
      {open ? (
        <AttachmentViewerSheet
          open
          onClose={close}
          title={title || 'پیوست'}
          sheetName={sheetName}
          entityId={entityId}
          fileIds={ids}
        />
      ) : null}
    </>
  )
}
