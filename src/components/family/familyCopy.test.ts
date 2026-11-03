import { describe, expect, it } from 'vitest'

import {
  ACCESS_END_NOTE,
  CHILDREN_EMPTY,
  CHILD_OWNS_FILE_NOTE,
  PARENT_DOES_NOT_SEE,
  PARENT_DRIVE_WARNING,
  PARENT_RAW_SHEET_NOTE,
  PARENT_SEES,
  PARENT_STATUS_HINTS,
  PARENT_STATUS_LABELS,
  forgetChildQuestion,
  forgetChildResultMessage,
  parentsSummary
} from './familyCopy'
import type { ParentAccess } from '../../services/parentAccess'

const parent = (status: ParentAccess['status']): ParentAccess => ({
  email: 'p@example.com',
  since: null,
  status
})

describe('parentsSummary', () => {
  it('says nobody sees the account when the list is empty or all revoked', () => {
    expect(parentsSummary([])).toBe('در حال حاضر هیچ والدی حساب شما را نمی‌بیند')
    expect(parentsSummary([parent('revoked')])).toContain('هیچ والدی')
  })

  it('counts active and unverified parents as seeing it', () => {
    expect(parentsSummary([parent('active')])).toBe('یک والد همین حالا حساب شما را می‌بیند')
    expect(parentsSummary([parent('active'), parent('unverified'), parent('revoked')])).toContain(
      '۲ والد'
    )
  })
})

describe('status words', () => {
  it('labels every status, with the user-facing «دسترسی قطع شد» for a revoked parent', () => {
    expect(PARENT_STATUS_LABELS.revoked).toBe('دسترسی قطع شد')
    for (const status of ['active', 'revoked', 'unverified'] as const) {
      expect(PARENT_STATUS_LABELS[status]).toBeTruthy()
      expect(PARENT_STATUS_HINTS[status]).toBeTruthy()
    }
  })

  it('is honest: no button in the app, but Drive can end the access', () => {
    expect(ACCESS_END_NOTE).toContain(
      'در اپ دکمهٔ قطع وجود ندارد؛ قطع دسترسی فقط از گوگل‌درایو ممکن است'
    )
    expect(ACCESS_END_NOTE).toContain('«دسترسی قطع شد»')
    expect(ACCESS_END_NOTE).not.toContain('فقط والد')
    expect(PARENT_STATUS_HINTS.revoked).toBe('دسترسی والد برداشته شده و دیگر حساب را نمی‌بیند')
  })
})

describe('what the parent sees', () => {
  it('lists what is and is not visible and admits the raw sheet', () => {
    expect(PARENT_SEES.length).toBeGreaterThan(2)
    expect(PARENT_DOES_NOT_SEE.join(' ')).toContain('پین')
    expect(PARENT_RAW_SHEET_NOTE).toContain('گوگل‌درایو')
    expect(PARENT_SEES.join(' ')).not.toContain('نه شمارهٔ کارت')
    expect(PARENT_DRIVE_WARNING).toContain('شمارهٔ کارت')
  })

  it('starts every line with a Persian letter (RTL lines)', () => {
    const lines = [
      ...PARENT_SEES,
      ...PARENT_DOES_NOT_SEE,
      PARENT_RAW_SHEET_NOTE,
      PARENT_DRIVE_WARNING,
      ACCESS_END_NOTE,
      CHILD_OWNS_FILE_NOTE,
      CHILDREN_EMPTY.message,
      CHILDREN_EMPTY.description,
      forgetChildQuestion('سارا')
    ]

    for (const line of lines) expect(line).toMatch(/^[«؀-ۿ]/)
  })
})

describe('forgetting a child', () => {
  it('names the child and promises the child file is untouched', () => {
    const question = forgetChildQuestion('سارا')

    expect(question).toContain('«سارا»')
    expect(question).toContain('هیچ تغییری نمی‌کند')
  })

  it('tells the three outcomes apart', () => {
    expect(forgetChildResultMessage('removed')).toMatchObject({ kind: 'success' })
    expect(forgetChildResultMessage('local').text).toContain('هنوز در گوگل‌درایو')
    expect(forgetChildResultMessage('blocked').kind).toBe('error')
  })
})
