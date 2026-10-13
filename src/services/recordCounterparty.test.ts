import { describe, expect, it } from 'vitest'

import { suggestCounterparty } from './recordCounterparty'
import { fakeRecord } from './recordInputs.fake'

describe('suggestCounterparty', () => {
  it('returns the counterparty of the newest matching record', () => {
    const records = [
      fakeRecord({ title: 'میوه', counterparty: 'قدیمی', date: '2026-08-01' }),
      fakeRecord({ title: 'میوه', counterparty: 'رضا', date: '2026-09-20' }),
      fakeRecord({ title: 'میوه', counterparty: '', date: '2026-10-01' })
    ]

    expect(suggestCounterparty(records, 'خوراک', 'میوه')).toBe('رضا')
  })

  it('breaks a date tie by creation time', () => {
    const records = [
      fakeRecord({ title: 'نان', counterparty: 'الف', date: '2026-10-01', createdAtMs: 10 }),
      fakeRecord({ title: 'نان', counterparty: 'ب', date: '2026-10-01', createdAtMs: 20 })
    ]

    expect(suggestCounterparty(records, 'خوراک', 'نان')).toBe('ب')
  })

  it('matches the title across Arabic letters and spacing, and needs the same category', () => {
    const records = [fakeRecord({ title: 'كيوي  تازه', counterparty: 'رضا' })]

    expect(suggestCounterparty(records, 'خوراک', 'کیوی تازه')).toBe('رضا')
    expect(suggestCounterparty(records, 'حمل‌ونقل', 'کیوی تازه')).toBe('')
  })

  it('suggests nothing without a category or a title', () => {
    const records = [fakeRecord({ title: 'میوه', counterparty: 'رضا' })]

    expect(suggestCounterparty(records, '', 'میوه')).toBe('')
    expect(suggestCounterparty(records, 'خوراک', '  ')).toBe('')
    expect(suggestCounterparty([], 'خوراک', 'میوه')).toBe('')
  })
})
