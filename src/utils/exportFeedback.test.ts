import { beforeEach, describe, expect, it, vi } from 'vitest'

const toastMocks = vi.hoisted(() => ({
  showError: vi.fn(),
  showInfo: vi.fn(),
  showSuccess: vi.fn()
}))

vi.mock('./toast', () => toastMocks)

const { NOTHING_TO_EXPORT_MESSAGE, runExport } = await import('./exportFeedback')

beforeEach(() => vi.clearAllMocks())

describe('runExport', () => {
  it('says there is nothing to export instead of running the task', async () => {
    const task = vi.fn(async () => 'x.csv')

    await runExport(task, 'خطا', { empty: true })

    expect(task).not.toHaveBeenCalled()
    expect(toastMocks.showInfo).toHaveBeenCalledWith(NOTHING_TO_EXPORT_MESSAGE)
    expect(NOTHING_TO_EXPORT_MESSAGE).toBe('چیزی برای خروجی نیست')
  })

  it('reports the saved file name', async () => {
    await runExport(async () => 'x.csv', 'خطا')

    expect(toastMocks.showSuccess).toHaveBeenCalledWith('ذخیره شد: x.csv')
  })

  it('stays silent when the share sheet is dismissed', async () => {
    await runExport(async () => null, 'خطا')

    expect(toastMocks.showSuccess).not.toHaveBeenCalled()
    expect(toastMocks.showInfo).not.toHaveBeenCalled()
    expect(toastMocks.showError).not.toHaveBeenCalled()
  })

  it('shows an error when the export fails', async () => {
    await runExport(async () => {
      throw new Error('boom')
    }, 'خطا')

    expect(toastMocks.showError).toHaveBeenCalled()
  })
})
