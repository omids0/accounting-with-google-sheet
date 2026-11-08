import { useEffect, useId } from 'react'

import AttachmentThumb from './AttachmentThumb'
import { useEntryAttachmentSink } from './entryAttachmentSink'
import PhotoSourceButtons from './PhotoSourceButtons'
import type { AttachmentDraftsState } from './useAttachmentDrafts'
import { attachmentFieldRowClass } from '../ui/attachmentStyles'
import { formFieldClass, formHintClass, formLabelClass } from '../ui/formStyles'

/**
 * «پیوست» in the record, check, plan and vehicle-expense forms: up to three
 * images or PDFs. 📷 opens the camera (`capture`, which the Android WebView
 * hands to the camera app), 🖼 the file picker.
 */
export default function AttachmentField({
  state,
  disabled = false
}: {
  state: AttachmentDraftsState
  disabled?: boolean
}) {
  const labelId = useId()
  const { drafts, preparing, remaining, addFiles, remove } = state
  const busy = disabled || preparing

  // «اسکن فاکتور» attaches its photo through this field: it is the one place that knows the drafts.
  useEffect(() => {
    useEntryAttachmentSink.setState({ add: addFiles, remaining })

    return () => useEntryAttachmentSink.setState({ add: null, remaining: 0 })
  }, [addFiles, remaining])

  return (
    <div className={formFieldClass}>
      <span id={labelId} className={formLabelClass}>
        پیوست
      </span>
      <div className={attachmentFieldRowClass} role="group" aria-labelledby={labelId}>
        {drafts.map(draft => (
          <AttachmentThumb
            key={draft.key}
            draft={draft}
            disabled={busy}
            onRemove={() => remove(draft.key)}
          />
        ))}
        {remaining > 0 ? (
          <PhotoSourceButtons onFiles={files => void addFiles(files)} disabled={busy} />
        ) : null}
      </div>
      <p className={formHintClass} aria-live="polite">
        {preparing ? 'در حال فشرده‌سازی…' : 'حداکثر ۳ · فشرده می‌شود'}
      </p>
    </div>
  )
}
