import { useRef, type ChangeEvent, type ReactNode } from 'react'

interface PhotoInputOptions {
  onFiles: (files: File[]) => void
  /** Hands the camera app the shot (`capture`); off: the file picker. */
  camera?: boolean
  /** Picker also takes PDFs and several files (attachments); off: one image. */
  acceptsPdf?: boolean
}

/**
 * One hidden file input and the call that opens it. `open` must run inside the tap handler itself
 * (no await or navigation before it), or Android blocks the camera. A cancelled camera fires no
 * change event, so `onFiles` simply never runs.
 */
export function usePhotoInput({ onFiles, camera = false, acceptsPdf = false }: PhotoInputOptions): {
  open: () => void
  input: ReactNode
} {
  const ref = useRef<HTMLInputElement>(null)

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])

    // Same file again later must still fire a change.
    event.target.value = ''
    onFiles(files)
  }

  const input = (
    <input
      ref={ref}
      type="file"
      accept={acceptsPdf ? 'image/*,application/pdf' : 'image/*'}
      capture={camera ? 'environment' : undefined}
      multiple={acceptsPdf}
      hidden
      tabIndex={-1}
      onChange={onPick}
    />
  )

  return { open: () => ref.current?.click(), input }
}
