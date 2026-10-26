import { describe, expect, it, vi } from 'vitest'

import { childOption, itemOption, matchesRecordAmount, pickError } from './linkTargetFit'
import { linkTargetKindFor } from './linkTargetKinds'

vi.mock('../services/workspace', () => ({ isPersonalWorkspace: () => true }))

const kindOf = (type: string, category: string) => linkTargetKindFor(type, category)!

const item = (remaining: number, over = {}) => ({
  id: 'i1',
  title: 'مورد',
  remaining,
  category: '',
  ...over
})

describe('itemOption', () => {
  it('debts: disabled only when less is left than the record', () => {
    const kind = kindOf('expense', 'بدهی')

    expect(itemOption(kind, item(1_000), 5_000).disabled).toBe(true)
    expect(itemOption(kind, item(5_000), 5_000).disabled).toBe(false)
    expect(itemOption(kind, item(1_000), 0).disabled).toBe(false)
    expect(itemOption(kind, item(1_000), 5_000).label).toContain('کمتر از مبلغ این رکورد')
  })

  it('checks: disabled unless the amount is exactly the record amount', () => {
    const kind = kindOf('expense', 'چک')

    expect(itemOption(kind, item(5_000), 5_000).disabled).toBe(false)
    expect(itemOption(kind, item(9_000), 5_000).disabled).toBe(true)
    expect(itemOption(kind, item(1_000), 5_000).disabled).toBe(true)
    expect(itemOption(kind, item(9_000), 0).disabled).toBe(false)
    expect(itemOption(kind, item(9_000), 5_000).label).toContain('فرق دارد')
    expect(itemOption(kind, item(5_000, { detail: 'سررسید ۱ مهر' }), 5_000).label).toContain(
      'سررسید ۱ مهر'
    )
  })

  it('installment books: never disabled, the detail follows the title', () => {
    const kind = kindOf('expense', 'قسط')
    const option = itemOption(kind, item(3_000, { detail: '۳ قسط مانده' }), 99)

    expect(option.disabled).toBe(false)
    expect(option.label).toBe('مورد · ۳ قسط مانده')
  })
})

describe('matchesRecordAmount', () => {
  it('is false while the amount is blank', () => {
    expect(matchesRecordAmount(item(5_000), 0)).toBe(false)
    expect(matchesRecordAmount(item(5_000), 5_000)).toBe(true)
  })
})

describe('childOption', () => {
  const child = { id: '3', title: 'قسط ۳ از ۶', amount: 1_000_000 }

  it('warns with both amounts when they differ, and never blocks', () => {
    const option = childOption(child, 1_050_000)

    expect(option.warning).toContain('باز هم وصل می‌شود')
    expect(option.warning).toMatch(/۱|1/)
    expect(option.label).toContain('قسط ۳ از ۶')
  })

  it('has no warning for an equal amount or a blank one', () => {
    expect(childOption(child, 1_000_000).warning).toBe('')
    expect(childOption(child, 0).warning).toBe('')
  })
})

describe('pickError', () => {
  it('says nothing for an enabled or missing pick', () => {
    const kind = kindOf('expense', 'چک')

    expect(pickError(kind, undefined)).toBe('')
    expect(pickError(kind, itemOption(kind, item(5_000), 5_000))).toBe('')
  })

  it('names the reason per kind', () => {
    const check = kindOf('expense', 'چک')
    const debt = kindOf('expense', 'بدهی')

    expect(pickError(check, itemOption(check, item(9_000), 5_000))).toContain('یکی نیست')
    expect(pickError(debt, itemOption(debt, item(1_000), 5_000))).toContain('بیشتر از مانده')
  })
})
