const LATIN_LETTER = /[A-Za-z]/

/**
 * Keeps a Latin name from scrambling the Persian sentence it sits in («merchant ۳٬۱۴۰٬۰۰۰ تومان»):
 * a first-strong isolate around it. Persian names pass through untouched.
 */
export function isolateLatin(text: string): string {
  return LATIN_LETTER.test(text) ? `\u2068${text}\u2069` : text
}
