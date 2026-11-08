import { usePhotoInput } from '../../hooks/usePhotoInput'
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
  const camera = usePhotoInput({ onFiles, camera: true })
  const picker = usePhotoInput({ onFiles, acceptsPdf: pickerAcceptsPdf })

  return (
    <>
      <button
        type="button"
        className={buttonClassName}
        onClick={camera.open}
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
        onClick={picker.open}
        disabled={disabled}
        aria-label={pickerAcceptsPdf ? 'انتخاب عکس یا PDF' : 'انتخاب عکس'}
        title={pickerAcceptsPdf ? 'انتخاب عکس یا PDF' : 'انتخاب عکس'}
      >
        <AppIcon name="image" size={22} />
        {labels ? <span>{labels.picker}</span> : null}
      </button>
      {camera.input}
      {picker.input}
    </>
  )
}
