import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  classifySharedFailure,
  clearSharedAccessLost,
  isSharedAccessLost,
  markSharedAccessLost,
  SHARED_NO_ACCESS_MESSAGE,
  subscribeSharedAccessLost
} from './sharedAccessLost'
import { SheetsApiError } from './sheetsApi'
import { SPREADSHEET_NO_ACCESS_MESSAGE, SpreadsheetNoAccessError } from './spreadsheetAccess'
import { toUserMessage } from '../utils/userMessage'

beforeEach(() => {
  clearSharedAccessLost('s1')
  clearSharedAccessLost('s2')
})

describe('classifySharedFailure', () => {
  it('reads the error activateSpreadsheet throws as no access', () => {
    expect(classifySharedFailure(new SpreadsheetNoAccessError())).toBe('denied')
  })

  it('reads a refused or hidden file from the Sheets API as no access', () => {
    expect(
      classifySharedFailure(new SheetsApiError('The caller does not have permission', 403))
    ).toBe('denied')
    expect(classifySharedFailure(new SheetsApiError('Requested entity was not found.', 404))).toBe(
      'denied'
    )
  })

  it('keeps offline, quota, server and unrelated 403 failures apart', () => {
    expect(classifySharedFailure(new TypeError('Failed to fetch'))).toBe('other')
    expect(classifySharedFailure(new SheetsApiError('Quota exceeded', 429))).toBe('other')
    expect(classifySharedFailure(new SheetsApiError('Backend error', 500))).toBe('other')
    expect(classifySharedFailure(new SheetsApiError('API has not been used', 403))).toBe('other')
    expect(classifySharedFailure(undefined)).toBe('other')
  })
})

describe('the no-access words', () => {
  it('are calm and carry no technical words', () => {
    expect(SHARED_NO_ACCESS_MESSAGE).toBe(
      'به این حساب مشترک دسترسی نداری. شاید مالک تو را حذف کرده یا این دستگاه اجازه ندارد.'
    )
    expect(SHARED_NO_ACCESS_MESSAGE).not.toMatch(/شیت|اپ|گوگل/)
  })

  it('keep the technical message for the sheet setup screen', () => {
    const err = new SpreadsheetNoAccessError()

    expect(err.message).toBe(SPREADSHEET_NO_ACCESS_MESSAGE)
    expect(toUserMessage(err, 'x')).toBe(SPREADSHEET_NO_ACCESS_MESSAGE)
  })
})

describe('lost accounts', () => {
  it('are remembered per account and cleared again', () => {
    expect(isSharedAccessLost('s1')).toBe(false)
    markSharedAccessLost('s1')

    expect(isSharedAccessLost('s1')).toBe(true)
    expect(isSharedAccessLost('s2')).toBe(false)
    expect(isSharedAccessLost()).toBe(true)
    clearSharedAccessLost('s1')

    expect(isSharedAccessLost()).toBe(false)
  })

  it('tell listeners only about real changes', () => {
    const listener = vi.fn()
    const off = subscribeSharedAccessLost(listener)

    markSharedAccessLost('s1')
    markSharedAccessLost('s1')
    clearSharedAccessLost('s2')
    clearSharedAccessLost('s1')
    off()
    markSharedAccessLost('s1')

    expect(listener).toHaveBeenCalledTimes(2)
  })
})
