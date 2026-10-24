import { describe, expect, it } from 'vitest'

import {
  pasteExceedsTitleLimit,
  titleCounterText,
  TITLE_COUNTER_FROM,
  TITLE_MAX_LENGTH
} from './titleLimit'

describe('titleCounterText', () => {
  it('shows nothing until the title reaches 150 characters', () => {
    expect(titleCounterText(0)).toBe('')
    expect(titleCounterText(TITLE_COUNTER_FROM - 1)).toBe('')
  })

  it('shows length and cap from 150 on', () => {
    expect(titleCounterText(150)).toMatch(/^[۱1][۵5][۰0] \/ [۲2][۰0][۰0]$/)
    expect(titleCounterText(186)).toMatch(/^[۱1][۸8][۶6] \/ [۲2][۰0][۰0]$/)
  })
})

describe('pasteExceedsTitleLimit', () => {
  it('is false while the result fits', () => {
    expect(pasteExceedsTitleLimit(10, 0, TITLE_MAX_LENGTH - 10)).toBe(false)
  })

  it('is true when the result passes the cap', () => {
    expect(pasteExceedsTitleLimit(10, 0, TITLE_MAX_LENGTH)).toBe(true)
    expect(pasteExceedsTitleLimit(0, 0, 667)).toBe(true)
  })

  it('counts the selection that the paste replaces', () => {
    expect(pasteExceedsTitleLimit(TITLE_MAX_LENGTH, TITLE_MAX_LENGTH, TITLE_MAX_LENGTH)).toBe(false)
  })
})
