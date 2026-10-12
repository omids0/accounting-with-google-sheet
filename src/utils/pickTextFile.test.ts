import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'

import { PICKER_CANCEL_GRACE_MS, pickTextFile } from './csv'

let input: HTMLInputElement

let clickSpy: MockInstance<() => void>

function startPick() {
  const picked = pickTextFile()

  input = clickSpy.mock.contexts.at(-1) as HTMLInputElement

  return picked
}

function selectFile(content: string) {
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [new File([content], 'data.csv', { type: 'text/csv' })]
  })
  input.dispatchEvent(new Event('change'))
}

describe('pickTextFile', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('resolves null when the picker fires cancel', async () => {
    const picked = startPick()

    input.dispatchEvent(new Event('cancel'))

    await expect(picked).resolves.toBeNull()
  })

  it('resolves null when the window regains focus and no file arrives', async () => {
    const picked = startPick()

    window.dispatchEvent(new Event('focus'))
    vi.advanceTimersByTime(PICKER_CANCEL_GRACE_MS)

    await expect(picked).resolves.toBeNull()
  })

  it('resolves the file text when change follows focus within the grace period', async () => {
    const picked = startPick()

    window.dispatchEvent(new Event('focus'))
    vi.advanceTimersByTime(PICKER_CANCEL_GRACE_MS / 2)
    selectFile('a,b\n1,2')
    vi.advanceTimersByTime(PICKER_CANCEL_GRACE_MS)

    await expect(picked).resolves.toBe('a,b\n1,2')
  })

  it('ignores a late cancel after a file was chosen', async () => {
    const picked = startPick()

    selectFile('x')
    input.dispatchEvent(new Event('cancel'))

    await expect(picked).resolves.toBe('x')
  })
})
