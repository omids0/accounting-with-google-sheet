import { useId, useRef, type ChangeEvent } from 'react'

import AttachmentThumb from './AttachmentThumb'
import type { AttachmentDraftsState } from './useAttachmentDrafts'
import AppIcon from '../AppIcon'
import { attachmentAddButtonClass, attachmentFieldRowClass } from '../ui/attachmentStyles'
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
  const cameraRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLInputElement>(null)
  const { drafts, preparing, remaining, addFiles, remove } = state
  const busy = disabled || preparing

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])

    // Same file again later must still fire a change.
    event.target.value = ''
    void addFiles(files)
  }

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
          <>
            <button
              type="button"
              className={attachmentAddButtonClass}
              onClick={() => cameraRef.current?.click()}
              disabled={busy}
              aria-label="عکس با دوربین"
              title="عکس با دوربین"
            >
              <AppIcon name="camera" size={22} />
            </button>
            <button
              type="button"
              className={attachmentAddButtonClass}
              onClick={() => pickerRef.current?.click()}
              disabled={busy}
              aria-label="انتخاب عکس یا PDF"
              title="انتخاب عکس یا PDF"
            >
              <AppIcon name="image" size={22} />
            </button>
          </>
        ) : null}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          tabIndex={-1}
          onChange={onPick}
        />
        <input
          ref={pickerRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          hidden
          tabIndex={-1}
          onChange={onPick}
        />
      </div>
      <p className={formHintClass} aria-live="polite">
        {preparing ? 'در حال فشرده‌سازی…' : 'حداکثر ۳ · فشرده می‌شود'}
      </p>
    </div>
  )
}
