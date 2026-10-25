import { describe, expect, it } from 'vitest'

import { validateTimesheetEntryCsvCells } from './timesheetEntryCsvValidate'

const row = (overrides: Record<number, string> = {}) => {
  const cells = [
    'x',
    'ts',
    '',
    'جلسه',
    '2026-10-20T08:00:00',
    '2026-10-20T09:30:00',
    '90',
    '',
    'false'
  ]

  Object.entries(overrides).forEach(([index, value]) => {
    cells[Number(index)] = value
  })

  return cells
}

describe('validateTimesheetEntryCsvCells', () => {
  it('accepts a valid row', () => {
    expect(validateTimesheetEntryCsvCells(row()).slice(3, 6)).toEqual([
      'جلسه',
      '2026-10-20T08:00:00',
      '2026-10-20T09:30:00'
    ])
  })

  it('reads Jalali date-times with Persian digits', () => {
    const cells = validateTimesheetEntryCsvCells(
      row({ 4: '۱۴۰۵/۰۸/۰۲ ۰۸:۰۰', 5: '۱۴۰۵-۸-۲ ۱۰:۱۵' })
    )

    expect(cells.slice(4, 6)).toEqual(['2026-10-24T08:00:00', '2026-10-24T10:15:00'])
  })

  it.each([
    [3, ' ', 'عنوان خالی است'],
    [4, '', 'شروع خالی است'],
    [5, '', 'پایان خالی است'],
    [4, 'صبح', 'شروع معتبر نیست'],
    [5, '2026-10-20 25:00', 'پایان معتبر نیست'],
    [5, '2026-02-30 10:00', 'پایان معتبر نیست'],
    [5, '2026-10-20T08:00:00', 'پایان باید بعد از شروع باشد'],
    [5, '2026-10-19T09:00:00', 'پایان باید بعد از شروع باشد']
  ])('rejects cell %i = «%s» with «%s»', (index, value, reason) => {
    expect(() => validateTimesheetEntryCsvCells(row({ [index]: value }))).toThrow(reason)
  })
})
