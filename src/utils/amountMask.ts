/** Screen-reader name of a hidden amount (the dots alone read as nothing). */
export const AMOUNT_MASK_LABEL = 'مبلغ مخفی'

/** Hint for the tap-to-reveal action on a hidden amount. */
export const AMOUNT_REVEAL_HINT = 'برای دیدن ۵ ثانیه‌ای لمس کنید'

/** How long a tapped amount stays visible before it is hidden again. */
export const AMOUNT_REVEAL_MS = 5000

/**
 * Where a masked amount sits: the `MoneyDisplay` sizes, plain text inside a
 * row or card (`text`), and tight chart labels (`compact`).
 */
export type AmountMaskSize = 'hero' | 'stat' | 'stat-wide' | 'record' | 'text' | 'compact'

const MASK_DOTS: Record<AmountMaskSize, number> = {
  hero: 8,
  stat: 5,
  'stat-wide': 6,
  record: 5,
  text: 5,
  compact: 3
}

/**
 * Minimum width of the dots, close to the amount they replace, so cards and
 * rows keep their size when the mode is switched on.
 */
const MASK_WIDTH_CLASS: Record<AmountMaskSize, string> = {
  hero: 'min-w-[9ch]',
  stat: 'min-w-[6ch]',
  'stat-wide': 'min-w-[7ch]',
  record: 'min-w-[6ch]',
  text: 'min-w-[6ch]',
  compact: 'min-w-[3ch]'
}

export function maskDots(size: AmountMaskSize = 'text'): string {
  return '•'.repeat(MASK_DOTS[size])
}

export function maskWidthClass(size: AmountMaskSize = 'text'): string {
  return MASK_WIDTH_CLASS[size]
}

/** Text for a `title`, tooltip or `aria-label` that would otherwise carry the amount. */
export function maskedText(hidden: boolean, text: string): string {
  return hidden ? AMOUNT_MASK_LABEL : text
}

/**
 * The reveal of one tapped amount: visible now, hidden again after `ms`.
 * A second tap while visible restarts the window.
 */
export function createRevealTimer(onChange: (revealed: boolean) => void, ms = AMOUNT_REVEAL_MS) {
  let timer: ReturnType<typeof setTimeout> | null = null

  const clear = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  return {
    reveal: () => {
      clear()
      onChange(true)
      timer = setTimeout(() => {
        timer = null
        onChange(false)
      }, ms)
    },
    dispose: clear
  }
}
