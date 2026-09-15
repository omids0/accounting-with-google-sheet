import { describe, expect, it } from 'vitest'

import {
  formatDeadlineRemainingSubtitle,
  formatPeriodicRemainingSubtitle,
  getUrgencyFromDays,
  getUrgencyFromKm
} from './utils'

describe('vehicle urgency helpers', () => {
  it('marks negative remaining km as overdue', () => {
    expect(getUrgencyFromKm(-120)).toBe('overdue')
  })

  it('shows passed label instead of negative km remaining', () => {
    expect(formatPeriodicRemainingSubtitle(-120, 85_000)).toBe('گذشته · بعدی: ۸۵٬۰۰۰ km')
  })

  it('shows km remaining when service is still upcoming', () => {
    expect(formatPeriodicRemainingSubtitle(500, 85_000)).toBe('۵۰۰ km مانده · بعدی: ۸۵٬۰۰۰ km')
  })

  it('shows passed label instead of negative days remaining', () => {
    expect(formatDeadlineRemainingSubtitle(-3, '2026-03-01')).toBe('گذشته · پایان: 2026-03-01')
  })

  it('marks negative remaining days as overdue', () => {
    expect(getUrgencyFromDays(-1)).toBe('overdue')
  })
})
