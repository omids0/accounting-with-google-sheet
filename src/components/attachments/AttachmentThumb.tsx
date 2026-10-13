import { isPdfDraft, type AttachmentDraft } from './attachmentDraft'
import { useAttachmentPreview } from './useAttachmentPreview'
import AppIcon from '../AppIcon'
import {
  attachmentThumbClass,
  attachmentThumbImageClass,
  attachmentThumbLabelClass,
  attachmentThumbRemoveClass
} from '../ui/attachmentStyles'

/** A 56 px tile: the picture, or a PDF mark; ✕ takes it off the form. */
export default function AttachmentThumb({
  draft,
  onRemove,
  disabled = false
}: {
  draft: AttachmentDraft
  onRemove?: () => void
  disabled?: boolean
}) {
  const preview = useAttachmentPreview(draft)
  const isPdf = isPdfDraft(draft) || preview.mimeType === 'application/pdf'
  const label = preview.name || (isPdf ? 'PDF' : 'تصویر')

  return (
    <div className={attachmentThumbClass} title={label}>
      {preview.url ? (
        <img src={preview.url} alt={label} className={attachmentThumbImageClass} />
      ) : (
        <AppIcon name={isPdf ? 'pdf' : 'image'} size={22} />
      )}
      {draft.kind === 'pending' ? <span className={attachmentThumbLabelClass}>در صف</span> : null}
      {onRemove ? (
        <button
          type="button"
          className={attachmentThumbRemoveClass}
          onClick={onRemove}
          disabled={disabled}
          aria-label={`برداشتن ${label}`}
        >
          <AppIcon name="close" size={12} />
        </button>
      ) : null}
    </div>
  )
}
