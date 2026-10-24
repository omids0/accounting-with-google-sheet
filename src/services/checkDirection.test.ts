import { describe, expect, it } from 'vitest'

import {
  checkRecordType,
  checksOfDirection,
  checkTypeLabel,
  parseCheckDirection
} from './checkDirection'
import {
  checkCounterpartyLabel,
  CHECK_DIRECTION_FILTER_OPTIONS
} from '../components/checks/checkDirectionOptions'

describe('check direction', () => {
  it('reads anything but «دریافتی» as a payable, so old rows keep their meaning', () => {
    expect(parseCheckDirection('دریافتی')).toBe('received')
    expect(parseCheckDirection(' دریافتی ')).toBe('received')
    expect(parseCheckDirection('پرداختی')).toBe('paid')
    expect(parseCheckDirection('')).toBe('paid')
    expect(parseCheckDirection(undefined)).toBe('paid')
    expect(parseCheckDirection('received')).toBe('paid')
  })

  it('passes a payable as an expense and a received check as income', () => {
    expect(checkRecordType({ direction: 'paid' })).toBe('expense')
    expect(checkRecordType({ direction: 'received' })).toBe('income')
  })

  it('words the type and the other side of the check', () => {
    expect(checkTypeLabel({ direction: 'paid' })).toBe('چک پرداختی')
    expect(checkTypeLabel({ direction: 'received' })).toBe('چک دریافتی')
    expect(checkCounterpartyLabel('paid')).toBe('در وجه (گیرنده)')
    expect(checkCounterpartyLabel('received')).toBe('از طرف (صادرکننده)')
  })

  it('filters by type, and offers «همه» first', () => {
    const items = [{ direction: 'paid' as const }, { direction: 'received' as const }]

    expect(checksOfDirection(items, 'received')).toEqual([{ direction: 'received' }])
    expect(CHECK_DIRECTION_FILTER_OPTIONS.map(option => option.label)).toEqual([
      'همه',
      'پرداختی',
      'دریافتی'
    ])
  })
})
