import { describe, expect, it } from 'vitest'

import { getBankCardColorOptions, resolveBankCardTheme } from './bankColorPalettes'
import { CASH_CARD_THEME, GENERIC_CARD_THEME, IRANIAN_BANKS } from './banks'
import { cardTextContrast, withLegibleText } from './cardLegibility'
import { buildCustomCardTheme } from './customCardTheme'
import { resolveCardTheme } from './walletCardUtils'

const scrimOf = (pattern: string) =>
  Number(/^linear-gradient\(rgba\([\d,]+,([\d.]+)\)/.exec(pattern)?.[1] ?? 0)

const palette = [
  ...IRANIAN_BANKS.flatMap(bank => {
    const colors = getBankCardColorOptions(bank.id)

    return colors.length
      ? colors.map(color => ({
          name: `${bank.id}/${color.id}`,
          theme: resolveBankCardTheme(bank.id, color.id, bank)
        }))
      : [{ name: bank.id, theme: bank }]
  }),
  { name: 'cash', theme: CASH_CARD_THEME },
  { name: 'generic', theme: GENERIC_CARD_THEME },
  ...['#ffd100', '#307fe2', '#ff0d3b', '#00ab84', '#e1a6ad', '#777777', '#ffffff', '#000000'].map(
    hex => ({
      name: `custom/${hex}`,
      theme: buildCustomCardTheme({
        primary: hex,
        secondary: hex,
        label: 'x',
        initials: 'x',
        id: 'x'
      })
    })
  )
]

describe('wallet card text contrast', () => {
  it.each(palette)('$name reaches 4.5:1 on every gradient stop', ({ theme }) => {
    const legible = withLegibleText(theme)

    expect(cardTextContrast(legible, scrimOf(legible.pattern))).toBeGreaterThanOrEqual(4.5)
  })

  it('leaves an already readable card untouched', () => {
    const yellow = resolveBankCardTheme('blu', 'yellow', IRANIAN_BANKS[0])

    expect(withLegibleText(yellow)).toEqual(yellow)
  })

  it('resolves every account kind through the legibility pass', () => {
    const theme = resolveCardTheme({
      accountKind: 'cash',
      bankId: '',
      cardColor: '',
      cardColorPrimary: '',
      cardColorSecondary: ''
    })

    expect(cardTextContrast(theme, scrimOf(theme.pattern))).toBeGreaterThanOrEqual(4.5)
  })
})

describe('legibility cache', () => {
  it('returns the same object for the same colours and a new one for different colours', () => {
    const [first, second] = palette

    expect(withLegibleText(first.theme)).toBe(withLegibleText({ ...first.theme }))
    expect(withLegibleText(first.theme)).not.toBe(withLegibleText(second.theme))
  })
})
