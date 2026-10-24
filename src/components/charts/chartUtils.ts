import { formatCompactNumber, formatMoneyParts, formatPersianNumber } from '../../utils/formatMoney'

/** Arabic letter mark: keeps «٪» out of the digit run so it sits after the number. */
const ALM = '؜'

/**
 * SVG `<text>` is left-to-right by default, which shows «۱۵ م» as «م ۱۵».
 * Spread into a recharts `tick` so axis labels read right-to-left.
 */
export const rtlTickTextProps = { direction: 'rtl' } as const

/** Persian percent that reads «۷۴٪» right-to-left (sign after the digits). */
export function formatPersianPercent(pct: number): string {
  return `${formatPersianNumber(pct, { useGrouping: false })}${ALM}٪`
}

const CATEGORY_LABEL_MAX_LEN = 14

/** Approximate width of one Persian character at the 10px axis font. */
const CATEGORY_LABEL_CHAR_PX = 5.6

const CATEGORY_AXIS_MIN_PX = 36

const CATEGORY_AXIS_MAX_PX = 96

/** Axis ticks in Persian digits and units (`۳٫۵ م`), never `3.5M`. */
export function formatAxisMoney(value: number): string {
  return formatCompactNumber(value)
}

export function truncateCategoryLabel(label: string, maxLen = CATEGORY_LABEL_MAX_LEN): string {
  if (label.length <= maxLen) return label

  return `${label.slice(0, maxLen - 1)}…`
}

/** Y-axis width that fits category labels up to the truncation length. */
export function getCategoryLabelAxisWidth(names: string[]): number {
  const maxLabelLen = Math.max(1, ...names.map(name => name.length))

  const truncatedLen = Math.min(maxLabelLen, CATEGORY_LABEL_MAX_LEN)

  return Math.min(
    CATEGORY_AXIS_MAX_PX,
    Math.max(CATEGORY_AXIS_MIN_PX, Math.ceil(truncatedLen * CATEGORY_LABEL_CHAR_PX) + 6)
  )
}

/** Shared Y-axis width so expense/income bar charts align on the same page. */
export function getCategoryBarYAxisWidth(datasets: { name: string }[][]): number {
  return getCategoryLabelAxisWidth(datasets.flat().map(item => item.name))
}

/**
 * Palette slot of the `index`-th category when a donut of `maxSlices` shows
 * `count` categories: past the last slot they all share the «سایر» slice color.
 */
export function donutSliceColorIndex(index: number, count: number, maxSlices: number): number {
  return count <= maxSlices ? index : Math.min(index, maxSlices - 1)
}

/** Longest full amount (characters) the ring centre shows at the normal size. */
const DONUT_CENTER_BASE_MAX_LEN = 11

/** Longest full amount the centre still shows whole, at the smaller size. */
const DONUT_CENTER_SMALL_MAX_LEN = 14

export interface DonutCenterValue {
  /** What the centre shows. */
  text: string
  /** The whole amount, for a title / screen readers when `text` is compact. */
  full: string
  /** Smaller type: a long amount that still fits whole. */
  small: boolean
  /** `text` is the compact form (`۱٫۲ میلیارد`) because the whole amount cannot fit. */
  compact: boolean
}

/**
 * The 100px ring centre never ellipsises a money figure: the whole amount at the
 * normal size, then smaller, and only then the compact form (the full amount
 * stays available through `full`).
 */
export function donutCenterValue(total: number): DonutCenterValue {
  const full = formatMoneyParts(total).number

  if (full.length <= DONUT_CENTER_BASE_MAX_LEN) {
    return { text: full, full, small: false, compact: false }
  }

  if (full.length <= DONUT_CENTER_SMALL_MAX_LEN) {
    return { text: full, full, small: true, compact: false }
  }

  return { text: formatCompactNumber(total), full, small: false, compact: true }
}
