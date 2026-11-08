import * as ort from 'onnxruntime-web'
import ortWasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'
import { PaddleOcrService, type PaddleOptions } from 'ppu-paddle-ocr/web'

import { toLogicalOrder } from './ocrLineOrder'
import { OCR_MODEL_FILES, type OcrRequest, type OcrResponse } from './ocrMessages'

/** Reads text lines from an invoice photo, fully on the phone: no request leaves the app. */
const scope = self as unknown as {
  postMessage(message: OcrResponse): void
  onmessage: ((event: MessageEvent<OcrRequest>) => void) | null
}

const READING = { minimumConfidence: 0, strategy: 'per-box' } as const

scope.onmessage = async ({ data }) => {
  try {
    scope.postMessage({ type: 'stage', stage: 'loading' })

    // Single thread: the app is not cross-origin isolated, and a blob worker per thread is not needed.
    // Our own copy, not the CDN address the OCR package sets by default.
    ort.env.wasm.wasmPaths = { wasm: ortWasmUrl }
    ort.env.wasm.numThreads = 1
    ort.env.wasm.proxy = false

    const service = new PaddleOcrService({
      model: {
        detection: data.modelBase + OCR_MODEL_FILES.detection,
        recognition: data.modelBase + OCR_MODEL_FILES.recognition,
        charactersDictionary: data.modelBase + OCR_MODEL_FILES.dictionary
      },
      session: { executionProviders: ['wasm'] },
      // The dictionary comes from `model.charactersDictionary`; the typing wants it here too.
      recognition: READING as unknown as PaddleOptions['recognition']
    })

    await service.initialize()
    scope.postMessage({ type: 'stage', stage: 'reading' })

    const result = await service.recognize(data.image, READING)
    const lines = result.text
      .split(/\r?\n/)
      .map(toLogicalOrder)
      .filter(line => line.trim())

    scope.postMessage({ type: 'done', lines })
  } catch (error) {
    scope.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : String(error)
    })
  }
}
