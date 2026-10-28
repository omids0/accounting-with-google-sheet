import toast from 'react-hot-toast'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { showError } from './toast'

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }))
vi.mock('./haptics', () => ({ haptic: vi.fn() }))

describe('showError', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gives the same message the same id, so repeats collapse into one toast', () => {
    showError('دریافت قیمت از tgju.org بیش از حد طول کشید')
    showError('دریافت قیمت از tgju.org بیش از حد طول کشید')

    const [first, second] = vi.mocked(toast.error).mock.calls

    expect(first[1]?.id).toBeTruthy()
    expect(second[1]?.id).toBe(first[1]?.id)
  })

  it('keeps different messages apart and passes the duration on', () => {
    showError('الف')
    showError('ب', 8000)

    const [first, second] = vi.mocked(toast.error).mock.calls

    expect(second[1]?.id).not.toBe(first[1]?.id)
    expect(second[1]?.duration).toBe(8000)
    expect(first[1]?.duration).toBeUndefined()
  })
})
