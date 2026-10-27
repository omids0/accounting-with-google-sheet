import { afterEach, describe, expect, it } from 'vitest'

import { clearReportPeriod, handOffReportPeriod, peekReportPeriod } from './reportPeriodHandoff'

const period = {
  preset: 'last-month' as const,
  customRange: { start: '2026-09-23', end: '2026-10-22' }
}

describe('report period hand-over', () => {
  afterEach(() => clearReportPeriod())

  it('is empty until a page hands a period over', () => {
    expect(peekReportPeriod()).toBeNull()
  })

  it('can be read more than once until it is cleared', () => {
    handOffReportPeriod(period)

    expect(peekReportPeriod()).toEqual(period)
    expect(peekReportPeriod()).toEqual(period)

    clearReportPeriod()

    expect(peekReportPeriod()).toBeNull()
  })

  it('goes stale when no report picked it up', () => {
    handOffReportPeriod(period, 1_000)

    expect(peekReportPeriod(5_000)).toEqual(period)
    expect(peekReportPeriod(20_000)).toBeNull()
  })
})
