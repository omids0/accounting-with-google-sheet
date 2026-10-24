import { toPersianDigits } from './normalizeDigits'

/** Longest title the entry and edit forms accept while typing or pasting. */
export const TITLE_MAX_LENGTH = 200

/** The «۱۸۶ / ۲۰۰» counter appears once the title gets this long. */
export const TITLE_COUNTER_FROM = 150

export const TITLE_TOO_LONG_HINT = `عنوان حداکثر ${toPersianDigits(
  String(TITLE_MAX_LENGTH)
)} نویسه است`

/** '' while the title is short enough not to need a counter. */
export function titleCounterText(length: number): string {
  if (length < TITLE_COUNTER_FROM) return ''

  return `${toPersianDigits(String(length))} / ${toPersianDigits(String(TITLE_MAX_LENGTH))}`
}

/**
 * Whether pasting `pastedLength` characters over `selectedLength` selected ones would pass the
 * cap, so the browser (via `maxLength`) cuts the text and the user should be told.
 */
export function pasteExceedsTitleLimit(
  currentLength: number,
  selectedLength: number,
  pastedLength: number
): boolean {
  return currentLength - selectedLength + pastedLength > TITLE_MAX_LENGTH
}
