/**
 * The colour palettes of Settings › نمایش › رنگ تم. The colours themselves live in
 * styles/palettes-light.css and styles/palettes-dark.css (the default is the tokens in theme.css);
 * this list holds what the picker needs: the id stored in the sheet, the label and the swatches.
 */
export const PALETTE_IDS = [
  'emerald',
  'ocean',
  'violet',
  'rose',
  'navygold',
  'indigo',
  'caspian',
  'orchid',
  'brown',
  'graphite'
] as const

export type PaletteId = (typeof PALETTE_IDS)[number]

export const DEFAULT_PALETTE_ID: PaletteId = 'emerald'

/** Worn by the sign-in and sheet-pick screens: before the account is known nothing is coloured. */
export const NEUTRAL_PALETTE_ID: PaletteId = 'graphite'

export interface AppPalette {
  id: PaletteId
  label: string
  /** Header gradient of the light mode, and the accent of the dark mode, as the swatch fill. */
  lightSwatch: string
  darkSwatch: string
}

export const APP_PALETTES: readonly AppPalette[] = [
  {
    id: 'emerald',
    label: 'زمرد',
    lightSwatch: 'linear-gradient(135deg, #0d5d57, #0f766e, #0e7c73)',
    darkSwatch: 'linear-gradient(135deg, #1f1b14, #c99a3f)'
  },
  {
    id: 'ocean',
    label: 'اقیانوس',
    lightSwatch: 'linear-gradient(135deg, #1e3a8a, #1d4ed8, #0369a1)',
    darkSwatch: 'linear-gradient(135deg, #0c3558, #38bdf8)'
  },
  {
    id: 'violet',
    label: 'ارغوانی',
    lightSwatch: 'linear-gradient(135deg, #5b21b6, #7c3aed, #a21caf)',
    darkSwatch: 'linear-gradient(135deg, #2a1247, #c084fc)'
  },
  {
    id: 'rose',
    label: 'گل‌سرخ',
    lightSwatch: 'linear-gradient(135deg, #9d174d, #be185d, #9333ea)',
    darkSwatch: 'linear-gradient(135deg, #3a1030, #f472b6)'
  },
  {
    id: 'navygold',
    label: 'نیلی‌طلا',
    lightSwatch: 'linear-gradient(135deg, #0f172a, #1e3a8a, #1e40af)',
    darkSwatch: 'linear-gradient(135deg, #14224a 50%, #fbbf24 50%)'
  },
  {
    id: 'indigo',
    label: 'نیلی',
    lightSwatch: 'linear-gradient(135deg, #312e81, #4338ca, #4f46e5)',
    darkSwatch: 'linear-gradient(135deg, #1f2358, #818cf8)'
  },
  {
    id: 'caspian',
    label: 'کاسپین',
    lightSwatch: 'linear-gradient(135deg, #083344, #155e75, #0e7490)',
    darkSwatch: 'linear-gradient(135deg, #0c3340, #22d3ee)'
  },
  {
    id: 'orchid',
    label: 'ارکیده',
    lightSwatch: 'linear-gradient(135deg, #701a75, #a21caf, #c026d3)',
    darkSwatch: 'linear-gradient(135deg, #3b0f45, #e879f9)'
  },
  {
    id: 'brown',
    label: 'قهوه‌ای',
    lightSwatch: 'linear-gradient(135deg, #451a03, #78350f, #92400e)',
    darkSwatch: 'linear-gradient(135deg, #3a2410, #e0a96d)'
  },
  {
    id: 'graphite',
    label: 'گرافیت',
    lightSwatch: 'linear-gradient(135deg, #1e293b, #334155, #475569)',
    darkSwatch: 'linear-gradient(135deg, #1f2937, #cbd5e1)'
  }
]

export function isPaletteId(value: unknown): value is PaletteId {
  return typeof value === 'string' && (PALETTE_IDS as readonly string[]).includes(value)
}

/** A stored or synced value, or the default for anything unknown (a newer app's id, a bad cell). */
export function paletteOrDefault(value: unknown): PaletteId {
  return isPaletteId(value) ? value : DEFAULT_PALETTE_ID
}
