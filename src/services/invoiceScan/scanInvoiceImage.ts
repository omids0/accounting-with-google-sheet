import { OCR_MODEL_FOLDER, type OcrRequest, type OcrResponse } from './ocrMessages'
import { fitWithin } from '../../utils/imageResize'

export type ScanStage = 'preparing' | 'loading' | 'reading'

/** Longest side given to the reader: sharper than the attachment copy, small enough for a phone. */
const OCR_MAX_SIDE = 2000

const OCR_JPEG_QUALITY = 0.95

/** A cold start reads about 12 MB of models; past this the scan gives up. */
const SCAN_TIMEOUT_MS = 90_000

async function downscale(file: Blob): Promise<ArrayBuffer> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = fitWithin(bitmap.width, bitmap.height, OCR_MAX_SIDE)
  const canvas = new OffscreenCanvas(width, height)

  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: OCR_JPEG_QUALITY })

  return blob.arrayBuffer()
}

/**
 * Text lines of an invoice photo, read on the phone. The original file is read, not the
 * compressed attachment copy: small digits do not survive the 300 KB budget. One worker per
 * scan; it is stopped when the scan ends so the models do not stay in memory. Aborting the
 * `signal` stops the worker at once and rejects with an `AbortError`.
 */
export async function scanInvoiceImage(
  file: Blob,
  onStage?: (stage: ScanStage) => void,
  signal?: AbortSignal
): Promise<string[]> {
  onStage?.('preparing')

  const image = await downscale(file)

  if (signal?.aborted) throw signal.reason

  const worker = new Worker(new URL('./ocr.worker.ts', import.meta.url), { type: 'module' })

  try {
    return await new Promise<string[]>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('خواندن فاکتور طول کشید')), SCAN_TIMEOUT_MS)

      worker.onmessage = ({ data }: MessageEvent<OcrResponse>) => {
        if (data.type === 'stage') return onStage?.(data.stage)

        clearTimeout(timer)

        if (data.type === 'done') resolve(data.lines)
        else reject(new Error(data.message))
      }

      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer)
          reject(signal.reason)
        },
        { once: true }
      )

      worker.onerror = event => {
        clearTimeout(timer)
        reject(new Error(event.message || 'اجرای خواندن فاکتور ممکن نشد'))
      }

      const request: OcrRequest = {
        image,
        modelBase: `${import.meta.env.BASE_URL}${OCR_MODEL_FOLDER}`
      }

      worker.postMessage(request, [image])
    })
  } finally {
    worker.terminate()
  }
}
