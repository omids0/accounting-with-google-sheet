import { beforeEach, describe, expect, it, vi } from 'vitest'

import { notifyRejectedWrite } from './failedWriteNotice'
import { showError } from '../utils/toast'

vi.mock('../utils/toast', () => ({ showError: vi.fn() }))

describe('notifyRejectedWrite', () => {
  beforeEach(() => vi.mocked(showError).mockClear())

  it('names the tab, the action and the reason, and says the row was taken back', () => {
    notifyRejectedWrite({ type: 'append', sheetName: 'اقساط', row: ['1'] }, 'دسترسی ندارید', true)

    const message = vi.mocked(showError).mock.calls[0][0]

    expect(message).toContain('ثبت در «اقساط»')
    expect(message).toContain('از اپ هم برداشته شد')
    expect(message).toContain('دسترسی ندارید')
  })

  it('does not claim a removal that did not happen', () => {
    notifyRejectedWrite({ type: 'append', sheetName: 'اقساط', row: ['1'] }, 'خطا', false)

    expect(vi.mocked(showError).mock.calls[0][0]).not.toContain('برداشته شد')
  })
})
