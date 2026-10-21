import { describe, expect, it } from 'vitest'

import {
  addToKeypad,
  KEYPAD_MAX_DIGITS,
  KEYPAD_QUICK_ADDS,
  keypadKeyFromEvent,
  keypadNumber,
  pressKeypadKey,
  type KeypadKey
} from './amountKeypad'

const press = (keys: KeypadKey[], start = '') =>
  keys.reduce((digits, key) => pressKeypadKey(digits, key), start)

describe('dial pad value', () => {
  it('composes the digits typed', () => {
    expect(press(['1', '2', '5'])).toBe('125')
    expect(keypadNumber(press(['1', '2', '5']))).toBe(125)
    expect(keypadNumber('')).toBe(0)
  })

  it('ignores leading zeros', () => {
    expect(press(['0', '0', '7'])).toBe('7')
    expect(press(['0'])).toBe('0')
    expect(keypadNumber(press(['0']))).toBe(0)
  })

  it('«۰۰۰» multiplies by a thousand and does nothing on an empty display', () => {
    expect(press(['5', '000'])).toBe('5000')
    expect(press(['2', '5', '0', '000', '000'])).toBe('250000000')
    expect(press(['000'])).toBe('')
  })

  it('backspace drops the last digit, clear empties the display', () => {
    expect(press(['1', '2', '3', 'back'])).toBe('12')
    expect(press(['back'])).toBe('')
    expect(press(['1', '2', 'clear'])).toBe('')
  })

  it('stops at the digit limit', () => {
    const full = '9'.repeat(KEYPAD_MAX_DIGITS)

    expect(pressKeypadKey(full, '1')).toBe(full)
    expect(pressKeypadKey('9'.repeat(KEYPAD_MAX_DIGITS - 2), '000')).toBe(
      '9'.repeat(KEYPAD_MAX_DIGITS - 2)
    )
  })

  it('quick adds sum onto what is typed', () => {
    expect(KEYPAD_QUICK_ADDS).toEqual([100_000, 1_000_000, 10_000_000])
    expect(addToKeypad('', 1_000_000)).toBe('1000000')
    expect(addToKeypad('250000', 100_000)).toBe('350000')
    expect(addToKeypad(addToKeypad('', 10_000_000), 10_000_000)).toBe('20000000')
    expect(addToKeypad('9'.repeat(KEYPAD_MAX_DIGITS), 1)).toBe('9'.repeat(KEYPAD_MAX_DIGITS))
  })

  it('reads hardware keys, Persian digits included', () => {
    expect(keypadKeyFromEvent('7')).toBe('7')
    expect(keypadKeyFromEvent('۴')).toBe('4')
    expect(keypadKeyFromEvent('Backspace')).toBe('back')
    expect(keypadKeyFromEvent('a')).toBeNull()
    expect(keypadKeyFromEvent('Enter')).toBeNull()
  })
})
