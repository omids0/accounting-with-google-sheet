import { describe, expect, it } from 'vitest'

import {
  firstCompressionStep,
  fitWithin,
  IMAGE_BYTE_BUDGET,
  MAX_IMAGE_SIDE,
  nextCompressionStep,
  PDF_BYTE_LIMIT,
  stepSize,
  validateAttachmentFile,
  type CompressionStep
} from './imageResize'

describe('fitWithin', () => {
  it('shrinks the longest side to 1600 px and keeps the ratio', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 })
  })

  it('never enlarges a small picture', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
  })

  it('keeps at least one pixel on a very thin picture', () => {
    expect(fitWithin(16000, 2)).toEqual({ width: MAX_IMAGE_SIDE, height: 1 })
  })
})

describe('nextCompressionStep', () => {
  it('starts at JPEG quality 0.8 and full size', () => {
    expect(firstCompressionStep()).toEqual({ quality: 0.8, scale: 1 })
  })

  it('stops as soon as an encode fits the ~300 KB budget', () => {
    expect(nextCompressionStep(firstCompressionStep(), IMAGE_BYTE_BUDGET)).toBeNull()
    expect(nextCompressionStep(firstCompressionStep(), 120_000)).toBeNull()
  })

  it('steps quality down first, then shrinks the picture', () => {
    const big = IMAGE_BYTE_BUDGET * 4
    const steps: CompressionStep[] = []
    let step: CompressionStep | null = firstCompressionStep()

    while (step && steps.length < 6) {
      steps.push(step)
      step = nextCompressionStep(step, big)
    }

    expect(steps.map(item => item.quality)).toEqual([0.8, 0.7, 0.6, 0.5, 0.7, 0.6])
    expect(steps.map(item => item.scale)).toEqual([1, 1, 1, 1, 0.8, 0.8])
  })

  it('gives up below 40 % of the fitted size instead of looping forever', () => {
    let step: CompressionStep | null = firstCompressionStep()
    let tries = 0

    while (step) {
      tries += 1
      step = nextCompressionStep(step, Number.MAX_SAFE_INTEGER)
    }

    expect(tries).toBeLessThan(20)
  })

  it('applies the scale to the fitted canvas size', () => {
    expect(stepSize(4000, 3000, { quality: 0.7, scale: 0.5 })).toEqual({ width: 800, height: 600 })
  })
})

describe('validateAttachmentFile', () => {
  it('accepts images of any size (they are compressed)', () => {
    expect(validateAttachmentFile({ type: 'image/png', size: 20_000_000 })).toEqual({
      kind: 'image'
    })
  })

  it('accepts a PDF up to 5 MB, by type or by name', () => {
    expect(validateAttachmentFile({ type: 'application/pdf', size: PDF_BYTE_LIMIT })).toEqual({
      kind: 'pdf'
    })
    expect(validateAttachmentFile({ type: '', size: 10, name: 'فاکتور.PDF' })).toEqual({
      kind: 'pdf'
    })
  })

  it('refuses a larger PDF with a clear message', () => {
    const result = validateAttachmentFile({ type: 'application/pdf', size: PDF_BYTE_LIMIT + 1 })

    expect(result).toEqual({ error: expect.stringContaining('۵ مگابایت') })
  })

  it('refuses other file types', () => {
    expect(validateAttachmentFile({ type: 'text/plain', size: 10 })).toHaveProperty('error')
  })
})
