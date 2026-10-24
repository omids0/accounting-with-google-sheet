import { describe, expect, it } from 'vitest'

import {
  installmentHiddenPlanMessage,
  installmentSchedulePreview
} from './installmentSchedulePreview'
import { formatIsoDatePersian, jalaliToIso } from '../utils/jalaliDate'

const start = jalaliToIso(1405, 8, 2) // 2 Aban
const day = (month: number, d: number) => formatIsoDatePersian(jalaliToIso(1405, month, d))

describe('installmentSchedulePreview', () => {
  it('shows the next month when the due day is far from the start day', () => {
    expect(installmentSchedulePreview(start, 3, 15)).toBe(
      `اولین قسط: ${day(9, 15)} · آخرین قسط: ${day(11, 15)}`
    )
  })

  it('keeps the start month when the due day is a few days later', () => {
    expect(installmentSchedulePreview(start, '1', '5')).toBe(
      `اولین قسط: ${day(8, 5)} · آخرین قسط: ${day(8, 5)}`
    )
  })

  it('stays empty while a field is missing or invalid', () => {
    expect(installmentSchedulePreview('', 3, 15)).toBe('')
    expect(installmentSchedulePreview(start, '', 15)).toBe('')
    expect(installmentSchedulePreview(start, 3, '')).toBe('')
    expect(installmentSchedulePreview(start, 0, 15)).toBe('')
    expect(installmentSchedulePreview(start, 3, 32)).toBe('')
    expect(installmentSchedulePreview(start, 2.5, 15)).toBe('')
  })
})

describe('installmentHiddenPlanMessage', () => {
  const range = { start: jalaliToIso(1405, 8, 1), end: jalaliToIso(1405, 8, 30) }
  const dues = [jalaliToIso(1405, 9, 15), jalaliToIso(1405, 10, 15)]

  it('names the first installment when none falls in the period', () => {
    const message = installmentHiddenPlanMessage(dues, range)

    expect(message).toContain('طرح ساخته شد')
    expect(message).toContain(`اولین قسط ${day(9, 15)} است`)
    expect(message).toContain('در بازهٔ فعلی دیده نمی‌شود')
  })

  it('stays silent when one installment is inside the period', () => {
    expect(installmentHiddenPlanMessage([jalaliToIso(1405, 8, 10), ...dues], range)).toBeNull()
  })

  it('stays silent without a period or without dates', () => {
    expect(installmentHiddenPlanMessage(dues, null)).toBeNull()
    expect(installmentHiddenPlanMessage([], range)).toBeNull()
  })

  it('takes the earliest date even when the list is unsorted', () => {
    const message = installmentHiddenPlanMessage([dues[1], dues[0]], range)

    expect(message).toContain(day(9, 15))
  })
})
