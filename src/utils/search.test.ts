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

/** The pass-by-pass version that ran on every string before the clean-text shortcut. */
function legacyNormalizeSearchText(value: string): string {
  return value
    .normalize('NFC')
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[يىكة]/g, ch => ({ ي: 'ی', ى: 'ی', ك: 'ک', ة: 'ه' }[ch] ?? ch))
    .replace(/[‌‍ـ‎‏؜﻿]/g, '')
    .replace(/(\d)[,،٬](?=\d)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

describe('normalizeSearchText shortcut', () => {
  it('gives what the full pass chain gives, for clean and unclean text alike', () => {
    let state = 42
    const next = () => {
      state = (state * 1664525 + 1013904223) % 4294967296

      return state / 4294967296
    }
    const alphabet = [
      ...'abcAB09 ,.-/',
      ...'علیرضا',
      ...'۰۱۹٠٩',
      ...'يىكة',
      '،',
      '٬',
      '‌',
      '‍',
      'ـ',
      '‎',
      '‏',
      '؜',
      '﻿',
      '\t',
      '\n',
      ' ',
      ' ',
      ' ',
      ' ',
      'İ',
      'Σ',
      'é',
      '́'
    ]

    for (let run = 0; run < 30000; run += 1) {
      const length = Math.floor(next() * 12)
      const text = Array.from(
        { length },
        () => alphabet[Math.floor(next() * alphabet.length)]
      ).join('')

      expect(normalizeSearchText(text)).toBe(legacyNormalizeSearchText(text))
    }
  })

  it('handles the edges of the shortcut', () => {
    const edges = ['', ' ', 'a b', 'a  b', ' a', 'a ', 'a\tb', 'Ab', '12,34', '1,a', 'é']

    for (const text of edges) {
      expect(normalizeSearchText(text)).toBe(legacyNormalizeSearchText(text))
    }
  })
})
