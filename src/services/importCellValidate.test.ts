import { describe, expect, it } from 'vitest'

import {
  choiceCell,
  dateCell,
  intCell,
  jsonArrayCell,
  moneyCell,
  optionalDateCell,
  optionalIntCell,
  optionalMoneyCell,
  requiredTextCell,
  withCells
} from './importCellValidate'

describe('requiredTextCell', () => {
  it('trims and refuses blanks', () => {
    expect(requiredTextCell('  علی ', 'نام')).toBe('علی')
    expect(() => requiredTextCell('  ', 'نام')).toThrow('نام خالی است')
    expect(() => requiredTextCell(undefined, 'نام')).toThrow('نام خالی است')
  })
})

describe('moneyCell', () => {
  it('reads the amount the way the app prints it', () => {
    expect(moneyCell('۲٬۵۰۰ تومان', 'مبلغ')).toBe(2500)
    expect(moneyCell('2,500 ریال', 'مبلغ')).toBe(2500)
  })

  it.each(['abc', '', 'تومان', '1e9'])('refuses «%s»', raw => {
    expect(() => moneyCell(raw, 'مبلغ')).toThrow('مبلغ عدد نیست')
  })

  it('applies the sign rule', () => {
    expect(() => moneyCell('0', 'مبلغ')).toThrow('مبلغ باید بیشتر از صفر باشد')
    expect(() => moneyCell('-1', 'مبلغ', 'nonNegative')).toThrow('مبلغ نباید منفی باشد')
    expect(moneyCell('0', 'مبلغ', 'nonNegative')).toBe(0)
    expect(moneyCell('-5', 'مبلغ', 'any')).toBe(-5)
  })
})

describe('optionalMoneyCell', () => {
  it('falls back when empty but still refuses garbage', () => {
    expect(optionalMoneyCell('', 'مبلغ')).toBe(0)
    expect(optionalMoneyCell(undefined, 'مبلغ', 'nonNegative', 7)).toBe(7)
    expect(optionalMoneyCell('۱۲۰', 'مبلغ')).toBe(120)
    expect(() => optionalMoneyCell('x', 'مبلغ')).toThrow('مبلغ عدد نیست')
  })
})

describe('intCell', () => {
  it('keeps the value inside the range', () => {
    expect(intCell('۱۵', 'روز', 1, 31)).toBe(15)
    expect(() => intCell('0', 'روز', 1, 31)).toThrow('روز باید عدد صحیح بین ۱ تا ۳۱ باشد')
    expect(() => intCell('32', 'روز', 1, 31)).toThrow('روز باید عدد صحیح بین ۱ تا ۳۱ باشد')
    expect(() => intCell('2.5', 'روز', 1, 31)).toThrow('عدد صحیح')
    expect(() => intCell('', 'روز', 1, 31)).toThrow('روز عدد نیست')
  })

  it('has an optional form', () => {
    expect(optionalIntCell('', 'روز', 0, 9, 3)).toBe(3)
    expect(() => optionalIntCell('10', 'روز', 0, 9, 3)).toThrow('عدد صحیح')
  })
})

describe('dateCell', () => {
  it('returns ISO for ISO and Jalali input', () => {
    expect(dateCell('2026-10-20', 'تاریخ')).toBe('2026-10-20')
    expect(dateCell('۱۴۰۵/۰۸/۰۲', 'تاریخ')).toBe('2026-10-24')
  })

  it('names the cell it refuses', () => {
    expect(() => dateCell('', 'تاریخ')).toThrow('تاریخ خالی است')
    expect(() => dateCell('نامعلوم', 'تاریخ')).toThrow('تاریخ معتبر نیست')
  })

  it('has an optional form', () => {
    expect(optionalDateCell(' ', 'تاریخ')).toBe('')
    expect(() => optionalDateCell('x', 'تاریخ')).toThrow('تاریخ معتبر نیست')
  })
})

describe('choiceCell', () => {
  it('falls back when empty and refuses other words', () => {
    expect(choiceCell('', 'نوع', ['a', 'b'] as const, 'a')).toBe('a')
    expect(choiceCell(' b ', 'نوع', ['a', 'b'] as const, 'a')).toBe('b')
    expect(() => choiceCell('c', 'نوع', ['a', 'b'] as const, 'a')).toThrow('نوع نامعتبر است')
  })
})

describe('withCells', () => {
  it('replaces columns in a copy', () => {
    const cells = ['a', 'b', 'c']

    expect(withCells(cells, { 1: 'x' })).toEqual(['a', 'x', 'c'])
    expect(cells).toEqual(['a', 'b', 'c'])
  })
})

describe('jsonArrayCell', () => {
  it('accepts an empty cell or a list and refuses the rest', () => {
    expect(() => jsonArrayCell('', 'حساب‌ها')).not.toThrow()
    expect(() => jsonArrayCell('[1]', 'حساب‌ها')).not.toThrow()
    expect(() => jsonArrayCell('{}', 'حساب‌ها')).toThrow('حساب‌ها معتبر نیست')
    expect(() => jsonArrayCell('[', 'حساب‌ها')).toThrow('حساب‌ها معتبر نیست')
  })
})
