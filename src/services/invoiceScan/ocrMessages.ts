/** Messages between the scan hook and `ocr.worker.ts`. */
export interface OcrRequest {
  /** Image bytes, downscaled to a size the phone can decode. */
  image: ArrayBuffer
  /** Folder of the model files, with a trailing slash (`<base>ocr/v1/`). */
  modelBase: string
}

export type OcrResponse =
  | { type: 'stage'; stage: 'loading' | 'reading' }
  | { type: 'done'; lines: string[] }
  | { type: 'error'; message: string }

/** Names of the shipped files; bump the folder (`v1`) when any of them changes. */
export const OCR_MODEL_FILES = {
  detection: 'PP-OCRv5_mobile_det_infer.onnx',
  recognition: 'arabic_PP-OCRv5_mobile_rec_infer.onnx',
  dictionary: 'ppocrv5_arabic_dict.txt'
} as const

/** Folder under `public/` that holds the models. */
export const OCR_MODEL_FOLDER = 'ocr/v1/'
