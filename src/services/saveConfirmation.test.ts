import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const flush = vi.hoisted(() => vi.fn())
const pending = vi.hoisted(() => ({ value: false }))

vi.mock('./sheetSyncOutbox', () => ({ flushOutbox: flush }))
vi.mock('./syncOutbox', () => ({ hasPendingOutbox: () => pending.value }))

const { QUEUED_SAVE_MESSAGE, savedInSheetMessage, waitForSheetConfirmation } = await import(
  './saveConfirmation'
)

describe('the save toast only claims the sheet after the outbox confirmed', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    flush.mockReset()
    pending.value = false
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  afterEach(() => vi.useRealTimers())

  it('confirms when the flush finishes in time', async () => {
    flush.mockResolvedValue(true)

    await expect(waitForSheetConfirmation('s')).resolves.toBe(true)
  })

  it('does not confirm while a write is still queued', async () => {
    flush.mockResolvedValue(true)
    pending.value = true

    await expect(waitForSheetConfirmation('s')).resolves.toBe(false)
  })

  it('does not confirm a flush that was blocked or refused', async () => {
    flush.mockResolvedValue(false)
    await expect(waitForSheetConfirmation('s')).resolves.toBe(false)
    flush.mockRejectedValue(new Error('network'))
    await expect(waitForSheetConfirmation('s')).resolves.toBe(false)
  })

  it('gives up waiting when googleapis never answers', async () => {
    flush.mockReturnValue(new Promise(() => undefined))

    const result = waitForSheetConfirmation('s', 1500)

    await vi.advanceTimersByTimeAsync(1500)
    await expect(result).resolves.toBe(false)
  })

  it('does not even try offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

    await expect(waitForSheetConfirmation('s')).resolves.toBe(false)
    expect(flush).not.toHaveBeenCalled()
  })

  it('words the toast by what is known', () => {
    expect(savedInSheetMessage('هزینه', true)).toBe('در شیت «هزینه» ذخیره شد')
    expect(savedInSheetMessage('هزینه', false)).toBe(QUEUED_SAVE_MESSAGE)
    expect(QUEUED_SAVE_MESSAGE).not.toMatch(/^در شیت/)
  })
})
