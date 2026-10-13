import { useEffect, useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { initialDrafts, isPdfDraft } from './attachmentDraft'
import AttachmentThumb from './AttachmentThumb'
import { attachmentBlob, useAttachmentPreview } from './useAttachmentPreview'
import { usePendingAttachments } from './usePendingAttachments'
import { useModalLock } from '../../hooks/useModalLock'
import { deleteAttachment } from '../../services/attachmentUpload'
import { driveViewLink } from '../../services/driveFiles'
import { shareAttachmentFile } from '../../utils/attachmentFile'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { cn } from '../../utils/cn'
import { showError, showSuccess } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'
import AppIcon from '../AppIcon'
import ConfirmDeleteModal from '../ConfirmDeleteModal'
import {
  attachmentViewerActionsClass,
  attachmentViewerImageClass,
  attachmentViewerNoteClass,
  attachmentViewerPdfClass,
  attachmentViewerPreviewClass,
  attachmentViewerStripClass,
  attachmentViewerStripItemClass
} from '../ui/attachmentStyles'
import Button from '../ui/Button'
import {
  formModalBackdropClass,
  formModalBodyClass,
  formModalCloseClass,
  formModalHeaderClass,
  formModalPanelClass,
  formModalRootClass,
  formModalTitleClass
} from '../ui/modalStyles'

export interface AttachmentViewerProps {
  open: boolean
  onClose: () => void
  title: string
  sheetName: string
  entityId: string
  fileIds: readonly string[]
}

/** Bottom sheet behind «📎 N»: preview, «باز کردن در Drive», «اشتراک», «حذف». */
export default function AttachmentViewerSheet({
  open,
  onClose,
  title,
  sheetName,
  entityId,
  fileIds
}: AttachmentViewerProps) {
  const pending = usePendingAttachments(entityId)
  const items = useMemo(() => initialDrafts(fileIds, pending), [fileIds, pending])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { panelRef } = useModalLock({ open, onClose, blocked: busy })
  const titleId = useId()
  const selected = items.find(item => item.key === selectedKey) ?? items[0] ?? null
  const preview = useAttachmentPreview(open ? selected : null)
  const isPdf = selected ? isPdfDraft(selected) || preview.mimeType === 'application/pdf' : false

  useEffect(() => {
    if (open && !items.length) onClose()
  }, [open, items.length, onClose])

  if (!open || !selected) return null

  const run = async (task: () => Promise<void>, failure: string) => {
    setBusy(true)
    try {
      await task()
    } catch (err) {
      showError(toUserMessage(err, failure))
    } finally {
      setBusy(false)
    }
  }

  const openInDrive = () => {
    if (selected.kind !== 'saved') return
    window.open(driveViewLink(preview.info ?? { id: selected.fileId }), '_blank', 'noopener')
  }

  const share = () =>
    run(async () => shareAttachmentFile(await attachmentBlob(selected)), 'اشتراک فایل ممکن نشد')

  const remove = () =>
    run(async () => {
      const spreadsheetId = requireSpreadsheetId()

      if (!spreadsheetId) return
      await deleteAttachment(
        spreadsheetId,
        sheetName,
        entityId,
        selected.kind === 'saved'
          ? { fileId: selected.fileId }
          : { pendingId: selected.kind === 'pending' ? selected.pending.id : '' }
      )
      setConfirmOpen(false)
      setSelectedKey(null)
      showSuccess('پیوست حذف شد')
    }, 'حذف پیوست ممکن نشد؛ اتصال اینترنت را بررسی کن.')

  return createPortal(
    // React bubbles portal clicks to the list row that renders the badge: stop them here.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <div
      className={formModalRootClass}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={event => event.stopPropagation()}
    >
      <button
        type="button"
        className={formModalBackdropClass}
        onClick={() => !busy && onClose()}
        aria-label="بستن"
      />
      <div ref={panelRef} className={formModalPanelClass}>
        <div className={formModalHeaderClass}>
          <h2 id={titleId} className={formModalTitleClass}>
            {title}
          </h2>
          <button
            type="button"
            className={formModalCloseClass}
            onClick={onClose}
            disabled={busy}
            aria-label="بستن"
            data-modal-close
          >
            <AppIcon name="close" size={18} />
          </button>
        </div>
        <div className={formModalBodyClass} aria-busy={busy || preview.loading}>
          <div className={attachmentViewerPreviewClass}>
            {preview.url ? (
              <img src={preview.url} alt={preview.name} className={attachmentViewerImageClass} />
            ) : (
              <div className={attachmentViewerPdfClass}>
                <AppIcon name={isPdf ? 'pdf' : 'image'} size={40} />
                <span>
                  {preview.loading
                    ? 'در حال بارگذاری…'
                    : preview.failed
                    ? 'پیش‌نمایش در دسترس نیست'
                    : preview.name}
                </span>
              </div>
            )}
          </div>
          {items.length > 1 ? (
            <div className={attachmentViewerStripClass}>
              {items.map((item, index) => (
                <button
                  key={item.key}
                  type="button"
                  className={cn(attachmentViewerStripItemClass, 'p-0')}
                  aria-current={item.key === selected.key}
                  aria-label={`پیوست ${(index + 1).toLocaleString('fa-IR')}`}
                  onClick={() => setSelectedKey(item.key)}
                >
                  <AttachmentThumb draft={item} />
                </button>
              ))}
            </div>
          ) : null}
          {selected.kind === 'pending' ? (
            <p className={attachmentViewerNoteClass}>
              هنوز به Drive نرسیده؛ با اتصال اینترنت خودکار فرستاده می‌شود.
            </p>
          ) : null}
          <div className={attachmentViewerActionsClass}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={openInDrive}
              disabled={busy || selected.kind !== 'saved'}
            >
              <AppIcon name="external" size={16} />
              باز کردن در Drive
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={share} disabled={busy}>
              <AppIcon name="share" size={16} />
              اشتراک
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={busy}
            >
              <AppIcon name="trash" size={16} />
              حذف
            </Button>
          </div>
        </div>
      </div>
      <ConfirmDeleteModal
        open={confirmOpen}
        title="حذف پیوست"
        message="این فایل از Google Drive و از این مورد پاک شود؟"
        deleting={busy}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void remove()}
      />
    </div>,
    document.body
  )
}
