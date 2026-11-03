import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getDefaultSettings, saveSettings } from './settings'
import {
  classifySharedFailure,
  clearSharedAccessLost,
  inaccessibleScreen,
  isRegisteredSharedLost,
  isSharedAccessLost,
  markSharedAccessLost,
  SHARED_LOST_KEY_PREFIX,
  SHARED_NO_ACCESS_MESSAGE,
  sharedNoAccessNamed,
  subscribeSharedAccessLost
} from './sharedAccessLost'
import { SheetsApiError } from './sheetsApi'
import { SPREADSHEET_NO_ACCESS_MESSAGE, SpreadsheetNoAccessError } from './spreadsheetAccess'
import { setWorkspaceType } from './workspace'
import { toUserMessage } from '../utils/userMessage'

beforeEach(() => {
  localStorage.clear()
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
    expect(isRegisteredSharedLost()).toBe(false)
    clearSharedAccessLost('s1')

    expect(isSharedAccessLost('s1')).toBe(false)
  })

  it('survive a reload: the mark is in localStorage under its own key', () => {
    markSharedAccessLost('s1')

    expect(localStorage.getItem(SHARED_LOST_KEY_PREFIX + 's1')).toBe('true')
    expect(isSharedAccessLost('s1')).toBe(true)
    clearSharedAccessLost('s1')

    expect(localStorage.getItem(SHARED_LOST_KEY_PREFIX + 's1')).toBeNull()
  })

  it('make the guard read the registered shared account only', () => {
    saveSettings({
      ...getDefaultSettings(),
      spreadsheets: [{ id: 's1', name: 'حسابداری · مشترک خانه', createdAt: '', kind: 'shared' }]
    })
    expect(isRegisteredSharedLost()).toBe(false)
    markSharedAccessLost('s2')
    expect(isRegisteredSharedLost()).toBe(false)
    markSharedAccessLost('s1')

    expect(isRegisteredSharedLost()).toBe(true)
  })

  it('never mark an empty id', () => {
    markSharedAccessLost('')

    expect(isSharedAccessLost('')).toBe(false)
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

describe('the start screen of a sheet the app could not open', () => {
  it('uses the shared account screen for a registered shared account with a personal sheet', () => {
    expect(inaccessibleScreen({ id: 's1', kind: 'shared' }, { id: 'p1' })).toBe('shared')

    setWorkspaceType('s9', 'shared')

    expect(inaccessibleScreen({ id: 's9' }, { id: 'p1' })).toBe('shared')
  })

  it('keeps the usual screen for a personal or building sheet', () => {
    expect(inaccessibleScreen({ id: 'p2' }, { id: 'p1' })).toBe('default')
    expect(inaccessibleScreen({ id: 'b1', kind: 'building' }, { id: 'p1' })).toBe('default')
  })

  it('keeps the usual screen when there is no personal sheet to go to', () => {
    expect(inaccessibleScreen({ id: 's1', kind: 'shared' }, undefined)).toBe('default')
  })

  it('names the account in plain words', () => {
    expect(sharedNoAccessNamed('خرج خانه')).toBe(
      'به حساب مشترک «خرج خانه» دسترسی نداری. شاید مالک تو را حذف کرده یا این دستگاه اجازه ندارد.'
    )
    expect(sharedNoAccessNamed('x')).not.toMatch(/شیت|اپ|Picker|گوگل/)
  })
})
