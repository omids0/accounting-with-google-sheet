import type { BankCardTheme } from './bankCardTypes'
import { blendOver, contrastRatio, gradientStops, hexToRgb, type Rgb } from '../../utils/contrast'

/** Card text is never painted fainter than this (see walletCardStyles). */
export const CARD_TEXT_ALPHA = 0.9

/** Aim above WCAG's 4.5 so the soft highlight pattern cannot pull a card below it. */
const TARGET_CONTRAST = 5
const MAX_SCRIM = 0.5
/** The designed text colour wins unless keeping it needs a scrim heavier than this. */
const PREFERRED_SCRIM = 0.3
const SCRIM_STEP = 0.02
const LIGHT_TEXT = '#ffffff'
const DARK_TEXT = '#111827'
const BLACK: Rgb = [0, 0, 0]
const WHITE: Rgb = [255, 255, 255]

/** Lowest contrast of the text over the gradient stops once a scrim of `scrim` is laid on. */
export function cardTextContrast(theme: Pick<BankCardTheme, 'gradient' | 'text'>, scrim = 0) {
  const text = hexToRgb(theme.text)

  if (!text) return 0

  const scrimColor = relativeIsLight(text) ? BLACK : WHITE

  return Math.min(
    ...gradientStops(theme.gradient).map(stop => {
      const ground = blendOver(scrimColor, stop, scrim)

      return contrastRatio(blendOver(text, ground, CARD_TEXT_ALPHA), ground)
    })
  )
}

function relativeIsLight(rgb: Rgb): boolean {
  return contrastRatio(rgb, BLACK) > contrastRatio(rgb, WHITE)
}

function scrimFor(theme: BankCardTheme, text: string): number | null {
  for (let scrim = 0; scrim <= MAX_SCRIM + 1e-9; scrim += SCRIM_STEP) {
    if (cardTextContrast({ gradient: theme.gradient, text }, scrim) >= TARGET_CONTRAST) {
      return Math.round(scrim * 100) / 100
    }
  }

  return null
}

/**
 * Keeps the card's text readable on its own gradient: picks the preset text colour, or
 * white / near-black when that reads better, and lays the lightest possible scrim
 * (dark under light text, light under dark text) over the gradient until contrast is met.
 */
const legibleCache = new Map<string, BankCardTheme>()

/** Cached per colour set (id alone is not enough: custom cards share one id). */
export function withLegibleText(theme: BankCardTheme): BankCardTheme {
  const key = `${theme.gradient}|${theme.text}|${theme.pattern}`
  let legible = legibleCache.get(key)

  if (!legible) {
    legible = computeLegibleTheme(theme)
    legibleCache.set(key, legible)
  }

  return legible
}

function computeLegibleTheme(theme: BankCardTheme): BankCardTheme {
  const candidates = [...new Set([theme.text, LIGHT_TEXT, DARK_TEXT])]
  let best: { text: string; scrim: number } | null = null

  for (const text of candidates) {
    const scrim = scrimFor(theme, text)

    if (scrim === null) continue
    if (text === theme.text && scrim <= PREFERRED_SCRIM) {
      best = { text, scrim }
      break
    }
    if (best === null || scrim < best.scrim) best = { text, scrim }
  }

  if (!best) best = { text: LIGHT_TEXT, scrim: MAX_SCRIM }

  if (best.scrim === 0) return best.text === theme.text ? theme : { ...theme, text: best.text }

  const lightText = relativeIsLight(hexToRgb(best.text) ?? WHITE)
  const layer = `rgba(${lightText ? '0,0,0' : '255,255,255'},${best.scrim})`

  return {
    ...theme,
    text: best.text,
    pattern: `linear-gradient(${layer},${layer}), ${theme.pattern}`
  }
}
