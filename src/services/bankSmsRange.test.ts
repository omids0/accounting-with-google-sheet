import { describe, expect, it } from 'vitest'

import { smsRangeStart } from './bankSmsRange'

describe('smsRangeStart', () => {
  const now = new Date(2026, 9, 7, 15, 30)

  it('starts «today» at local midnight, not 24 hours ago', () => {
    expect(smsRangeStart(1, now)).toBe(new Date(2026, 9, 7, 0, 0).getTime())
  })

  it('counts today as the first of N days', () => {
    expect(smsRangeStart(3, now)).toBe(new Date(2026, 9, 5, 0, 0).getTime())
    expect(smsRangeStart(7, now)).toBe(new Date(2026, 9, 1, 0, 0).getTime())
  })
})
