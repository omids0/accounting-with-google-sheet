import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const flush = vi.hoisted(() => vi.fn())
const pending = vi.hoisted(() => ({ value: false }))
const stuck = vi.hoisted(() => ({
  failed: [] as { id: string }[],
  conflicts: [] as { id: string }[]
}))

vi.mock('./sheetSyncOutbox', () => ({ flushOutbox: flush }))
vi.mock('./syncOutbox', () => ({
  hasPendingOutbox: () => pending.value,
  getFailedOutboxEntries: () => stuck.failed,
  getConflictEntries: () => stuck.conflicts
}))

const {
  QUEUED_SAVE_MESSAGE,
  REFUSED_SAVE_MESSAGE,
  SAVE_CONFIRM_WAIT_MS,
  savedInSheetMessage,
  waitForSheetConfirmation
} = await import('./saveConfirmation')

const setOnline = (value: boolean) =>
  Object.defineProperty(navigator, 'onLine', { value, configurable: true })

/** A flush that answers `result` after `ms` of (fake) time. */
const flushTakes = (ms: number, result: boolean, after?: () => void) =>
  flush.mockImplementation(
    () =>
      new Promise(resolve =>
        setTimeout(() => {
          after?.()
          resolve(result)
        }, ms)
      )
  )

describe('the save toast only claims the sheet after the outbox confirmed', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    flush.mockReset()
    pending.value = false
    stuck.failed = []
    stuck.conflicts = []
    setOnline(true)
  })

  afterEach(() => vi.useRealTimers())

  it('online and fast: confirmed as soon as the flush ends', async () => {
    flush.mockResolvedValue(true)

    await expect(waitForSheetConfirmation('s')).resolves.toBe('confirmed')
  })

  it('online and slow (3 s): keeps waiting and then confirms, never the offline wording', async () => {
    flushTakes(3000, true)

    const result = waitForSheetConfirmation('s')

    await vi.advanceTimersByTimeAsync(1500)
    // Past the old 1.5 s cap the answer is still open.
    await vi.advanceTimersByTimeAsync(1500)
    await expect(result).resolves.toBe('confirmed')
  })

  it('online but silent for the whole cap: queued', async () => {
    flush.mockReturnValue(new Promise(() => undefined))

    const result = waitForSheetConfirmation('s')

    await vi.advanceTimersByTimeAsync(SAVE_CONFIRM_WAIT_MS)
    await expect(result).resolves.toBe('queued')
    expect(SAVE_CONFIRM_WAIT_MS).toBe(10_000)
  })

  it('offline: queued at once, without trying', async () => {
    setOnline(false)

    await expect(waitForSheetConfirmation('s')).resolves.toBe('queued')
    expect(flush).not.toHaveBeenCalled()
  })

  it('a write the sheet refused for good: refused, even though the queue is empty', async () => {
    flushTakes(500, true, () => {
      stuck.failed = [{ id: 'refused' }]
    })

    const result = waitForSheetConfirmation('s')

    await vi.advanceTimersByTimeAsync(500)
    await expect(result).resolves.toBe('refused')
  })

  it('a write that landed in a conflict: refused', async () => {
    flush.mockImplementation(async () => {
      stuck.conflicts = [{ id: 'clash' }]

      return true
    })

    await expect(waitForSheetConfirmation('s')).resolves.toBe('refused')
  })

  it('an old parked write that was already there does not count', async () => {
    stuck.failed = [{ id: 'old' }]
    flush.mockResolvedValue(true)

    await expect(waitForSheetConfirmation('s')).resolves.toBe('confirmed')
  })

  it('a write still waiting, or a network failure, leaves the row queued', async () => {
    flush.mockResolvedValue(true)
    pending.value = true
    await expect(waitForSheetConfirmation('s')).resolves.toBe('queued')

    pending.value = false
    flush.mockResolvedValue(false)
    await expect(waitForSheetConfirmation('s')).resolves.toBe('queued')

    flush.mockRejectedValue(new Error('network'))
    await expect(waitForSheetConfirmation('s')).resolves.toBe('queued')
  })

  it('words the toast by what is known', () => {
    expect(savedInSheetMessage('هزینه', 'confirmed')).toBe('در شیت «هزینه» ذخیره شد')
    expect(savedInSheetMessage('هزینه', 'queued')).toBe(QUEUED_SAVE_MESSAGE)
    expect(savedInSheetMessage('هزینه', 'refused')).toBe(REFUSED_SAVE_MESSAGE)
    expect(QUEUED_SAVE_MESSAGE).not.toMatch(/^در شیت/)
  })
})
