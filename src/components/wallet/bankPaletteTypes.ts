export type BankCardColorOption = {
  id: string
  label: string
  hex: string
  swatchBackground?: string
}

export type BankColorVariant = BankCardColorOption & {
  gradient: string
  accent: string
  text: string
  pattern: string
}

export type BankColorPalette = {
  bankId: string
  defaultColorId: string
  variants: BankColorVariant[]
}
