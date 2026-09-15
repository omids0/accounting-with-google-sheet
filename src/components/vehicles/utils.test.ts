import { describe, expect, it } from 'vitest'

import {
  buildDeadlineDetailLines,
  formatDeadlineRemainingSubtitle,
  formatPeriodicRemainingSubtitle,
  getUrgencyFromDays,
  getUrgencyFromKm,
  shouldShowVehicleDeadlineReminder
} from './utils'
import { formatIsoDatePersian } from '../../utils/jalaliDate'

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

  it('shows passed label with persian end date instead of gregorian', () => {
    expect(formatDeadlineRemainingSubtitle(-3, '2026-03-01')).toBe(
      `گذشته · پایان: ${formatIsoDatePersian('2026-03-01')}`
    )
  })

  it('builds deadline card detail lines with dates, amount, and reminder', () => {
    const lines = buildDeadlineDetailLines({
      id: '1',
      vehicleId: 'v1',
      createdAt: '',
      category: 'بیمه',
      startDate: '2026-01-01',
      endDate: '2026-03-01',
      amount: 5_000_000,
      notes: 'نمایندگی مرکزی',
      expenseRecordId: '',
      active: true,
      reminderEnabled: true,
      daysBefore: 7
    })

    expect(lines[0]).toContain(formatIsoDatePersian('2026-01-01'))
    expect(lines[0]).toContain(formatIsoDatePersian('2026-03-01'))
    expect(lines.some(line => line.includes('مبلغ یادداشت'))).toBe(true)
    expect(lines.some(line => line.includes('یادآوری: فعال'))).toBe(true)
    expect(lines.at(-1)).toBe('نمایندگی مرکزی')
  })

  it('shows dashboard reminder only when enabled and within daysBefore window', () => {
    expect(
      shouldShowVehicleDeadlineReminder(
        { reminderEnabled: false, daysBefore: 7, endDate: '2026-03-10' },
        '2026-03-05'
      )
    ).toBe(false)

    expect(
      shouldShowVehicleDeadlineReminder(
        { reminderEnabled: true, daysBefore: 7, endDate: '2026-03-10' },
        '2026-03-01'
      )
    ).toBe(false)

    expect(
      shouldShowVehicleDeadlineReminder(
        { reminderEnabled: true, daysBefore: 7, endDate: '2026-03-10' },
        '2026-03-05'
      )
    ).toBe(true)
  })

  it('marks negative remaining days as overdue', () => {
    expect(getUrgencyFromDays(-1)).toBe('overdue')
  })
})
