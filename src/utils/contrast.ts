/** WCAG 2.x contrast helpers for `#rrggbb` colours. */

export type Rgb = [number, number, number]

export function hexToRgb(hex: string): Rgb | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim())

  if (!match) return null

  const value = match[1]

  return [0, 2, 4].map(start => Number.parseInt(value.slice(start, start + 2), 16)) as Rgb
}

export function relativeLuminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map(channel => {
    const normalized = channel / 255

    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)

  return (light + 0.05) / (dark + 0.05)
}

/** Colour of `fg` painted at `alpha` over `bg`. */
export function blendOver(fg: Rgb, bg: Rgb, alpha: number): Rgb {
  return fg.map((channel, index) => channel * alpha + bg[index] * (1 - alpha)) as Rgb
}

/** Every `#rrggbb` stop in a CSS gradient string. */
export function gradientStops(gradient: string): Rgb[] {
  return (gradient.match(/#[0-9a-f]{6}\b/gi) ?? [])
    .map(hexToRgb)
    .filter((rgb): rgb is Rgb => rgb !== null)
}

/** Lowest contrast of `text` painted at `alpha` against any stop of the gradient. */
export function worstGradientContrast(gradient: string, text: string, alpha = 1): number {
  const fg = hexToRgb(text)
  const stops = gradientStops(gradient)

  if (!fg || stops.length === 0) return 0

  return Math.min(...stops.map(stop => contrastRatio(blendOver(fg, stop, alpha), stop)))
}
