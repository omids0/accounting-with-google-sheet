import { describe, expect, it } from 'vitest'

import { donutCenterValue } from './chartUtils'

describe('donutCenterValue', () => {
  it('shows a short amount whole at the normal size', () => {
    const value = donutCenterValue(2_235_000)

    expect(value).toMatchObject({ small: false, compact: false })
    expect(value.text).toBe(value.full)
  })

  it('keeps a long amount whole but smaller, never cut', () => {
    const value = donutCenterValue(57_725_102.8)

    expect(value.small).toBe(true)
    expect(value.compact).toBe(false)
    expect(value.text).toBe(value.full)
    expect(value.full).not.toContain('…')
  })

  it('falls back to the compact form only when the whole amount cannot fit', () => {
    const value = donutCenterValue(123_456_789_012)

    expect(value.compact).toBe(true)
    expect(value.text).not.toBe(value.full)
    expect(value.full.length).toBeGreaterThan(value.text.length)
  })
})
