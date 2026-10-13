import { validateAttachmentFile } from './imageResize'
import type { AttachmentFile } from '../services/attachmentUpload'

function jpegName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').trim() || 'رسید'

  return `${base}.jpg`
}

/**
 * A picked file, ready to queue: an image re-encoded by the canvas compressor
 * (loaded only when an image is picked), a PDF as is. Throws with a message
 * the form can show.
 */
export async function prepareAttachmentFile(file: File): Promise<AttachmentFile> {
  const checked = validateAttachmentFile(file)

  if ('error' in checked) throw new Error(checked.error)

  if (checked.kind === 'pdf') {
    return { blob: file, name: file.name || 'سند.pdf', mimeType: 'application/pdf' }
  }

  const { compressImage } = await import('./imageCompress')
  const blob = await compressImage(file)

  return { blob, name: jpegName(file.name), mimeType: 'image/jpeg' }
}

/**
 * «اشتراک»: the browser share sheet when it takes files, else the export path
 * (`saveExportFile`: Android share sheet in the APK, a download on the web).
 */
export async function shareAttachmentFile(file: AttachmentFile): Promise<void> {
  const { Capacitor } = await import('@capacitor/core')

  if (!Capacitor.isNativePlatform() && typeof navigator.canShare === 'function') {
    const shared = new File([file.blob], file.name, { type: file.mimeType })

    if (navigator.canShare({ files: [shared] })) {
      try {
        await navigator.share({ files: [shared], title: file.name })
      } catch (err) {
        if ((err as { name?: string })?.name !== 'AbortError') throw err
      }

      return
    }
  }

  const { saveExportFile } = await import('./saveFile')

  await saveExportFile(file.name, file.blob)
}
