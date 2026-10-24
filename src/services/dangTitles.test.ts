import { describe, expect, it } from 'vitest'

import {
  DANG_BUILDING_PREFIXES,
  dangPrefixes,
  dangSettlementTitle,
  isDangSettlementTitle
} from './dangTitles'

const dang = { title: 'خرید لامپ راه‌پله', counterparty: 'مدیر' }

describe('the title of a debt payment record', () => {
  it('keeps «بدهی: …» for a personal debt', () => {
    expect(dangSettlementTitle(dang, false)).toBe('بدهی: خرید لامپ راه‌پله')
  })

  it('names who is repaid in a building', () => {
    expect(dangSettlementTitle(dang, true)).toBe('بازپرداخت به مدیر · خرید لامپ راه‌پله')
    expect(dangSettlementTitle({ ...dang, counterparty: ' آقای رضایی ' }, true)).toBe(
      'بازپرداخت به آقای رضایی · خرید لامپ راه‌پله'
    )
    expect(dangSettlementTitle({ ...dang, counterparty: '' }, true)).toBe(
      'بازپرداخت به طلبکار · خرید لامپ راه‌پله'
    )
  })

  it('is matched by the prefixes of its workspace, old wording included in a building', () => {
    expect(dangPrefixes(false)).toEqual(['بدهی: '])
    expect(dangPrefixes(true)).toEqual(DANG_BUILDING_PREFIXES)

    const startsWithAny = (title: string, building: boolean) =>
      dangPrefixes(building).some(prefix => title.startsWith(prefix))

    expect(startsWithAny(dangSettlementTitle(dang, true), true)).toBe(true)
    expect(startsWithAny('بدهی: خرید لامپ راه‌پله', true)).toBe(true)
    expect(startsWithAny(dangSettlementTitle(dang, false), false)).toBe(true)
    // A personal expense that merely sounds like a repayment is not the app's own record.
    expect(startsWithAny('بازپرداخت به علی · وام', false)).toBe(false)
  })

  it('is recognised as a settlement title in both wordings', () => {
    expect(isDangSettlementTitle('بازپرداخت به مدیر · لامپ')).toBe(true)
    expect(isDangSettlementTitle('بدهی: لامپ')).toBe(true)
    expect(isDangSettlementTitle('خرید لامپ')).toBe(false)
  })
})
