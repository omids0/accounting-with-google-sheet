import { formatCompactNumber } from '../../utils/formatMoney'

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
