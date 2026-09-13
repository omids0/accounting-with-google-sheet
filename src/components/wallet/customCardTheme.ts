import type { BankCardTheme } from './bankCardTypes'

export const CUSTOM_CARD_COLOR_ID = 'custom'

export const DEFAULT_CUSTOM_CARD_PRIMARY = '#1a4f8c'
export const DEFAULT_CUSTOM_CARD_SECONDARY = '#4a8fd4'

const CUSTOM_SWATCH_GRADIENT =
  'conic-gradient(from 135deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #9b59b6, #ff6b6b)'

export function isCustomCardColor(cardColor: string): boolean {
  return cardColor === CUSTOM_CARD_COLOR_ID
}

export function normalizeHexColor(value: string): string {
  const trimmed = value.trim()

  if (!trimmed) return ''

  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`

  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) return withHash.toLowerCase()

  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
    const [, r, g, b] = withHash

    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }

  return ''
}

function parseHexRgb(hex: string): [number, number, number] | null {
  const normalized = normalizeHexColor(hex)

  if (!normalized) return null

  const value = normalized.slice(1)

  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16)
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(channel => channel.toString(16).padStart(2, '0')).join('')}`
}

export function mixHexWithWhite(hex: string, amount: number): string {
  const rgb = parseHexRgb(hex)

  if (!rgb) return DEFAULT_CUSTOM_CARD_SECONDARY

  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount)

  return rgbToHex(mix(rgb[0]), mix(rgb[1]), mix(rgb[2]))
}

function relativeLuminance(hex: string): number {
  const rgb = parseHexRgb(hex)

  if (!rgb) return 0

  const channels = rgb.map(channel => {
    const normalized = channel / 255

    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function pickReadableTextColor(primary: string, secondary: string): string {
  const average = (relativeLuminance(primary) + relativeLuminance(secondary)) / 2

  return average > 0.45 ? '#1a1a2e' : '#ffffff'
}

export function getCustomColorDefaults(base: Pick<BankCardTheme, 'swatch'>): {
  primary: string
  secondary: string
} {
  const primary = normalizeHexColor(base.swatch) || DEFAULT_CUSTOM_CARD_PRIMARY

  return {
    primary,
    secondary: mixHexWithWhite(primary, 0.35)
  }
}

export function buildCustomCardTheme(params: {
  primary: string
  secondary: string
  label: string
  initials: string
  id: string
}): BankCardTheme {
  const primary = normalizeHexColor(params.primary) || DEFAULT_CUSTOM_CARD_PRIMARY
  const secondary = normalizeHexColor(params.secondary) || mixHexWithWhite(primary, 0.35)
  const text = pickReadableTextColor(primary, secondary)

  return {
    id: params.id,
    label: params.label,
    initials: params.initials,
    swatch: primary,
    gradient: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
    accent: text === '#ffffff' ? mixHexWithWhite(secondary, 0.45) : primary,
    text,
    pattern:
      'radial-gradient(circle at 82% 18%, rgba(255,255,255,0.2) 0%, transparent 42%), radial-gradient(circle at 12% 82%, rgba(255,255,255,0.1) 0%, transparent 48%)'
  }
}

export function getCustomCardColorOption() {
  return {
    id: CUSTOM_CARD_COLOR_ID,
    label: 'شخصی',
    hex: '#888888',
    swatchBackground: CUSTOM_SWATCH_GRADIENT
  }
}
