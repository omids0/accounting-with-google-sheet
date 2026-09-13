import type { BankCardTheme } from './bankCardTypes'
import type { BankCardColorOption, BankColorPalette } from './bankPaletteTypes'
import { CUSTOM_CARD_COLOR_ID } from './customCardTheme'
import { BLU_BANK_ID, BLU_BANK_PALETTE } from './palettes/bluBankPalette'
import { EGHTESAD_NOVIN_BANK_ID, EGHTESAD_NOVIN_PALETTE } from './palettes/eghtesadNovinPalette'
import { HIBANK_BANK_ID, HIBANK_PALETTE } from './palettes/hiBankPalette'

export type { BankCardColorOption, BankColorPalette } from './bankPaletteTypes'
export { BLU_BANK_ID } from './palettes/bluBankPalette'
export { HIBANK_BANK_ID } from './palettes/hiBankPalette'
export { EGHTESAD_NOVIN_BANK_ID } from './palettes/eghtesadNovinPalette'

const PALETTES: Record<string, BankColorPalette> = {
  [BLU_BANK_ID]: BLU_BANK_PALETTE,
  [HIBANK_BANK_ID]: HIBANK_PALETTE,
  [EGHTESAD_NOVIN_BANK_ID]: EGHTESAD_NOVIN_PALETTE
}

function themeFromPalette(
  palette: BankColorPalette,
  label: string,
  initials: string
): BankCardTheme {
  const variant =
    palette.variants.find(item => item.id === palette.defaultColorId) ?? palette.variants[0]

  return {
    id: palette.bankId,
    label,
    gradient: variant.gradient,
    accent: variant.accent,
    text: variant.text,
    pattern: variant.pattern,
    initials,
    swatch: variant.hex
  }
}

export function hasBankColorPalette(bankId: string): boolean {
  return Boolean(PALETTES[bankId])
}

export function getBankColorPalette(bankId: string): BankColorPalette | undefined {
  return PALETTES[bankId]
}

export function getBankCardColorOptions(bankId: string): BankCardColorOption[] {
  const palette = PALETTES[bankId]

  if (!palette) return []

  return palette.variants.map(variant => ({
    id: variant.id,
    label: variant.label,
    hex: variant.hex
  }))
}

export function getDefaultBankCardColor(bankId: string): string {
  return PALETTES[bankId]?.defaultColorId ?? ''
}

export function parseBankCardColor(bankId: string, value: string): string {
  if (value === CUSTOM_CARD_COLOR_ID) return CUSTOM_CARD_COLOR_ID

  const palette = PALETTES[bankId]

  if (!palette) return ''

  const match = palette.variants.find(variant => variant.id === value)

  return match?.id ?? palette.defaultColorId
}

export function resolveBankCardTheme(
  bankId: string,
  cardColor: string,
  base: BankCardTheme
): BankCardTheme {
  const palette = PALETTES[bankId]

  if (!palette || cardColor === CUSTOM_CARD_COLOR_ID) return base

  const variant =
    palette.variants.find(item => item.id === parseBankCardColor(bankId, cardColor)) ??
    palette.variants[0]

  return {
    id: base.id,
    label: base.label,
    gradient: variant.gradient,
    accent: variant.accent,
    text: variant.text,
    pattern: variant.pattern,
    initials: base.initials,
    swatch: variant.hex
  }
}

export function getBluBankBaseTheme(): BankCardTheme {
  return themeFromPalette(BLU_BANK_PALETTE, 'بلو بانک', 'بلو')
}

export function getHiBankBaseTheme(): BankCardTheme {
  return themeFromPalette(HIBANK_PALETTE, 'های‌بانک', 'های')
}

export function getEghtesadNovinBaseTheme(): BankCardTheme {
  return themeFromPalette(EGHTESAD_NOVIN_PALETTE, 'بانک اقتصاد نوین', 'نوین')
}

export function isBluBank(bankId: string): boolean {
  return bankId === BLU_BANK_ID
}
