import {
  firstCompressionStep,
  nextCompressionStep,
  stepSize,
  type CompressionStep
} from './imageResize'

interface DecodedImage {
  source: CanvasImageSource
  width: number
  height: number
  close: () => void
}

async function decodeImage(file: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })

      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close()
      }
    } catch {
      /* fall back to <img>, which some WebViews decode more formats with */
    }
  }

  const url = URL.createObjectURL(file)
  const image = new Image()

  try {
    image.src = url
    await image.decode()
  } catch {
    URL.revokeObjectURL(url)
    throw new Error('این تصویر خوانده نشد؛ عکس دیگری انتخاب کن.')
  }

  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    close: () => URL.revokeObjectURL(url)
  }
}

function encode(
  image: DecodedImage,
  step: CompressionStep
): Promise<{ blob: Blob; width: number; height: number }> {
  const { width, height } = stepSize(image.width, image.height, step)
  const canvas = document.createElement('canvas')

  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')

  if (!context) return Promise.reject(new Error('فشرده‌سازی تصویر روی این دستگاه ممکن نیست.'))

  // JPEG has no alpha: a transparent PNG would turn black without a white base.
  context.fillStyle = '#fff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image.source, 0, 0, width, height)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob =>
        blob ? resolve({ blob, width, height }) : reject(new Error('فشرده‌سازی تصویر ناموفق بود.')),
      'image/jpeg',
      step.quality
    )
  })
}

/**
 * A receipt photo as JPEG: at most 1600 px on the longest side and about
 * 300 KB (quality from 0.8 down, then a smaller picture). Canvas only.
 */
export async function compressImage(file: Blob): Promise<Blob> {
  const image = await decodeImage(file)

  try {
    let step = firstCompressionStep()
    let result = await encode(image, step)
    let next = nextCompressionStep(step, result.blob.size)

    while (next) {
      step = next
      result = await encode(image, step)
      next = nextCompressionStep(step, result.blob.size)
    }

    return result.blob
  } finally {
    image.close()
  }
}
