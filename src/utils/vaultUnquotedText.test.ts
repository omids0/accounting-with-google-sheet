import { describe, expect, it } from 'vitest'

import { unquotedBreakdownNote, unquotedHeroNote } from './vaultUnquotedText'

describe('unquoted vault notes', () => {
  it('say nothing when every asset is valued', () => {
    expect(unquotedBreakdownNote([])).toBeUndefined()
    expect(unquotedHeroNote(undefined)).toBeUndefined()
  })

  it('name the assets that were left out', () => {
    expect(unquotedHeroNote(['نیم سکه'])).toBe('ارزش نیم سکه حساب نشده (قیمت در دسترس نیست)')
    expect(unquotedBreakdownNote(['نیم سکه', 'دلار'])).toBe(
      'قیمت لحظه‌ای نیم سکه، دلار در دسترس نیست؛ ارزش آن‌ها حساب نشده'
    )
  })
})
