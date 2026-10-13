import { useCallback, useMemo, useState } from 'react'

import { formatPersianNumber } from '../../utils/formatMoney'
import { initialDrafts } from '../attachments/attachmentDraft'
import AttachmentThumb from '../attachments/AttachmentThumb'
import AttachmentViewerSheet from '../attachments/AttachmentViewerSheet'
import { usePendingAttachments } from '../attachments/usePendingAttachments'
import {
  recordDetailLinkClass,
  recordDetailSectionClass,
  recordDetailSectionTitleClass,
  recordDetailThumbButtonClass,
  recordDetailThumbsClass
} from '../ui/recordDetailStyles'

const NO_IDS: readonly string[] = []

interface RecordDetailAttachmentsProps {
  sheetName: string
  entityId: string
  fileIds?: readonly string[]
  /** Heading of the viewer, e.g. the record title. */
  title: string
  /** «افزودن پیوست» / «+»: where the owner lets the user attach more. */
  onAdd?: () => void
}

/** «پیوست‌ها · N»: thumbnails of a row's receipts; a tap opens the viewer on that file. */
export default function RecordDetailAttachments({
  sheetName,
  entityId,
  fileIds = NO_IDS,
  title,
  onAdd
}: RecordDetailAttachmentsProps) {
  const pending = usePendingAttachments(entityId)
  const drafts = useMemo(() => initialDrafts(fileIds, pending), [fileIds, pending])
  const [openKey, setOpenKey] = useState<string | null>(null)
  const close = useCallback(() => setOpenKey(null), [])

  if (!drafts.length) {
    return onAdd ? (
      <div className={recordDetailSectionClass}>
        <button type="button" className={recordDetailLinkClass} onClick={onAdd}>
          + افزودن پیوست
        </button>
      </div>
    ) : null
  }

  return (
    <div className={recordDetailSectionClass}>
      <h3 className={recordDetailSectionTitleClass}>
        {`پیوست‌ها · ${formatPersianNumber(drafts.length)}`}
      </h3>
      <div className={recordDetailThumbsClass}>
        {drafts.map(draft => (
          <button
            key={draft.key}
            type="button"
            className={recordDetailThumbButtonClass}
            onClick={() => setOpenKey(draft.key)}
            aria-label="باز کردن پیوست"
          >
            <AttachmentThumb draft={draft} />
          </button>
        ))}
        {onAdd ? (
          <button type="button" className={recordDetailLinkClass} onClick={onAdd}>
            + افزودن
          </button>
        ) : null}
      </div>
      {openKey ? (
        <AttachmentViewerSheet
          open
          onClose={close}
          title={title || 'پیوست'}
          sheetName={sheetName}
          entityId={entityId}
          fileIds={fileIds}
          initialKey={openKey}
        />
      ) : null}
    </div>
  )
}
