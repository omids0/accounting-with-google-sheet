/**
 * Sorting thousands of dates with `localeCompare` is slow (a collator lookup per comparison). Sheet
 * dates and timestamps («2026-10-24», «2026-10-24T10:20:30.000Z») only use digits and a few
 * punctuation marks, where the collator's order is a fixed order of characters, so such text can be
 * compared as plain strings once its punctuation is swapped for look-alikes in the right slots.
 * Anything else (letters of other scripts, Persian digits, odd formats) still goes to the collator,
 * so the result is always exactly what `a.localeCompare(b)` gives.
 */
export interface CollatedText {
  text: string
  /** The text re-spelled so that `<` follows the collator; null when it has to use the collator. */
  key: string | null
}

const collator = new Intl.Collator()

/** Only characters whose collation order is known: digits, space, «- : .», and the T/Z of ISO. */
const PLAIN = /^[0-9TZ:. -]*$/

/** Collator order is «-» < «:» < «.» < digits < letters; ASCII has «:» after the digits. */
const PUNCTUATION_STAND_INS: Record<string, string> = { '-': '!', ':': '"', '.': '#' }

export function collatedText(text: string): CollatedText {
  if (!PLAIN.test(text)) return { text, key: null }

  return { text, key: text.replace(/[-:.]/g, mark => PUNCTUATION_STAND_INS[mark]) }
}

/** Same sign as `a.text.localeCompare(b.text)`. */
export function compareCollated(a: CollatedText, b: CollatedText): number {
  if (a.key !== null && b.key !== null) return a.key < b.key ? -1 : a.key > b.key ? 1 : 0

  return collator.compare(a.text, b.text)
}
