import { useRef, type ChangeEvent } from 'react'

import AppIcon from '../AppIcon'
import { attachmentAddButtonClass } from '../ui/attachmentStyles'

interface PhotoSourceButtonsProps {
  onFiles: (files: File[]) => void
  disabled?: boolean
  /** Picker accepts PDFs and several files (attachments); off: one image (invoice scan). */
  pickerAcceptsPdf?: boolean
  /** Replaces the square icon tile, for a roomier layout. */
  buttonClassName?: string
  /** Text beside each icon; none keeps the icon-only tile. */
  labels?: { camera: string; picker: string }
}

/**
 * 📷 opens the camera (`capture`, which the Android WebView hands to the camera app), 🖼 the file
 * picker. Shared by «پیوست» and «اسکن فاکتور», so both behave the same in the app and the PWA.
 */
export default function PhotoSourceButtons({
  onFiles,
  disabled = false,
  pickerAcceptsPdf = true,
  buttonClassName = attachmentAddButtonClass,
  labels
}: PhotoSourceButtonsProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLInputElement>(null)

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])

    // Same file again later must still fire a change.
    event.target.value = ''
    onFiles(files)
  }

  return (
    <>
      <button
        type="button"
        className={buttonClassName}
        onClick={() => cameraRef.current?.click()}
        disabled={disabled}
        aria-label="عکس با دوربین"
        title="عکس با دوربین"
      >
        <AppIcon name="camera" size={22} />
        {labels ? <span>{labels.camera}</span> : null}
      </button>
      <button
        type="button"
        className={buttonClassName}
        onClick={() => pickerRef.current?.click()}
        disabled={disabled}
        aria-label={pickerAcceptsPdf ? 'انتخاب عکس یا PDF' : 'انتخاب عکس'}
        title={pickerAcceptsPdf ? 'انتخاب عکس یا PDF' : 'انتخاب عکس'}
      >
        <AppIcon name="image" size={22} />
        {labels ? <span>{labels.picker}</span> : null}
      </button>
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
        accept={pickerAcceptsPdf ? 'image/*,application/pdf' : 'image/*'}
        multiple={pickerAcceptsPdf}
        hidden
        tabIndex={-1}
        onChange={onPick}
      />
    </>
  )
}
