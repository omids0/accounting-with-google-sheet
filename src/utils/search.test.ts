import { describe, expect, it } from 'vitest'

import { matchSearch, normalizeSearchText } from './search'

describe('normalizeSearchText', () => {
  it('maps Arabic letter forms to Persian', () => {
    expect(normalizeSearchText('علي')).toBe('علی')
    expect(normalizeSearchText('كتاب')).toBe('کتاب')
    expect(normalizeSearchText('موسى')).toBe('موسی')
    expect(normalizeSearchText('مدرسة')).toBe('مدرسه')
  })

  it('removes ZWNJ, ZWJ, tatweel and bidi marks', () => {
    expect(normalizeSearchText('می‌خواهم')).toBe('میخواهم')
    expect(normalizeSearchText('ب‍ا')).toBe('با')
    expect(normalizeSearchText('تـــهران')).toBe('تهران')
    expect(normalizeSearchText('‏۱۲۳‎')).toBe('123')
  })

  it('converts Persian/Arabic digits and strips thousands separators', () => {
    expect(normalizeSearchText('۱۲۳۴')).toBe('1234')
    expect(normalizeSearchText('٤٥٦')).toBe('456')
    expect(normalizeSearchText('1,500,000')).toBe('1500000')
    expect(normalizeSearchText('۱٬۵۰۰٬۰۰۰')).toBe('1500000')
    expect(normalizeSearchText('۱،۵۰۰')).toBe('1500')
  })

  it('keeps commas that are not digit grouping', () => {
    expect(normalizeSearchText('نان, شیر')).toBe('نان, شیر')
  })

  it('lowercases and collapses whitespace', () => {
    expect(normalizeSearchText('  Hello   World ')).toBe('hello world')
  })
})

describe('matchSearch', () => {
  it('matches across Arabic/Persian letter variants in both directions', () => {
    expect(matchSearch('علي', 'علی رضایی')).toBe(true)
    expect(matchSearch('علی', 'علي رضايي')).toBe(true)
    expect(matchSearch('كيك', 'کیک تولد')).toBe(true)
  })

  it('ignores ZWNJ differences', () => {
    expect(matchSearch('میخواهم', 'می‌خواهم')).toBe(true)
    expect(matchSearch('می‌خواهم', 'میخواهم')).toBe(true)
  })

  it('matches amounts regardless of digits and separators', () => {
    expect(matchSearch('۱۵۰۰۰۰۰', 1500000)).toBe(true)
    expect(matchSearch('1,500,000', '۱۵۰۰۰۰۰')).toBe(true)
    expect(matchSearch('۱٬۵۰۰', 'مبلغ 1500000')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(matchSearch('BMW', 'bmw x3')).toBe(true)
  })

  it('returns true for an empty query and false for no match', () => {
    expect(matchSearch('  ', 'anything')).toBe(true)
    expect(matchSearch('xyz', 'abc', null, undefined, '')).toBe(false)
  })
})
