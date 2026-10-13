/** Size math of the receipt compressor; no canvas here, so it runs in unit tests. */

export const MAX_IMAGE_SIDE = 1600

/** ~300 KB per image. */
export const IMAGE_BYTE_BUDGET = 300 * 1024

export const PDF_BYTE_LIMIT = 5 * 1024 * 1024

export const START_QUALITY = 0.8

export const MIN_QUALITY = 0.5

const QUALITY_STEP = 0.1

/** Below this the photo is too small to read; the last try is kept as is. */
const MIN_SCALE = 0.4

const SCALE_STEP = 0.8

export interface CompressionStep {
  quality: number
  /** Multiplier on the fitted size (1 = longest side at most {@link MAX_IMAGE_SIDE}). */
  scale: number
}

/** Shrinks to fit `maxSide` on the longest side, keeping the ratio; never enlarges. */
export function fitWithin(
  width: number,
  height: number,
  maxSide = MAX_IMAGE_SIDE
): { width: number; height: number } {
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round(height))
  const ratio = Math.min(1, maxSide / Math.max(w, h))

  return { width: Math.max(1, Math.round(w * ratio)), height: Math.max(1, Math.round(h * ratio)) }
}

export function firstCompressionStep(): CompressionStep {
  return { quality: START_QUALITY, scale: 1 }
}

/**
 * What to try after an encode of `size` bytes: null when it fits the budget
 * (or nothing smaller is worth trying). JPEG quality steps down first, then
 * the picture shrinks and quality starts again a notch lower.
 */
export function nextCompressionStep(
  step: CompressionStep,
  size: number,
  budget = IMAGE_BYTE_BUDGET
): CompressionStep | null {
  if (size <= budget) return null

  const quality = Math.round((step.quality - QUALITY_STEP) * 100) / 100

  if (quality >= MIN_QUALITY) return { quality, scale: step.scale }

  const scale = Math.round(step.scale * SCALE_STEP * 1000) / 1000

  if (scale < MIN_SCALE) return null

  return { quality: Math.round((START_QUALITY - QUALITY_STEP) * 100) / 100, scale }
}

/** The canvas size for one step of an image of `width`×`height`. */
export function stepSize(
  width: number,
  height: number,
  step: CompressionStep
): { width: number; height: number } {
  const fitted = fitWithin(width, height)

  return {
    width: Math.max(1, Math.round(fitted.width * step.scale)),
    height: Math.max(1, Math.round(fitted.height * step.scale))
  }
}

export type AttachmentFileKind = 'image' | 'pdf'

/** Images and PDFs only; a PDF over 5 MB is refused (it is uploaded as is). */
export function validateAttachmentFile(file: {
  type: string
  size: number
  name?: string
}): { kind: AttachmentFileKind } | { error: string } {
  const type = file.type.toLowerCase()
  const isPdf = type === 'application/pdf' || /\.pdf$/i.test(file.name ?? '')

  if (isPdf) {
    return file.size > PDF_BYTE_LIMIT
      ? { error: 'فایل PDF بزرگ‌تر از ۵ مگابایت است؛ فایل کوچک‌تری انتخاب کن.' }
      : { kind: 'pdf' }
  }
  if (type.startsWith('image/')) return { kind: 'image' }

  return { error: 'فقط عکس یا فایل PDF را می‌شود پیوست کرد.' }
}
