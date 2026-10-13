/**
 * «ارقام فارسی» (Settings › نمایش): the one flag every number formatter reads.
 * Per device (`accounting_latin_digits`, not in `ACCOUNT_KEYS`), default off, so
 * digits stay Persian unless the user asks for Latin ones. Read once and cached:
 * module-level formatters are built at import time, so the switch reloads the app.
 *
 * Dependency-free on purpose: `normalizeDigits.ts` and `formatMoney.ts` import it.
 */
export const LATIN_DIGITS_KEY = 'accounting_latin_digits'

/** Intl locale with Persian digits (today's behavior). */
export const PERSIAN_DIGIT_LOCALE = 'fa-IR'

/** Same Persian locale (month names, separators order), Latin digits. */
export const LATIN_DIGIT_LOCALE = 'fa-IR-u-nu-latn'

let latinDigits: boolean | null = null

function readLatinDigits(): boolean {
  try {
    return localStorage.getItem(LATIN_DIGITS_KEY) === '1'
  } catch {
    return false
  }
}

export function persianDigitsEnabled(): boolean {
  if (latinDigits === null) latinDigits = readLatinDigits()

  return !latinDigits
}

export function setPersianDigitsEnabled(enabled: boolean): void {
  latinDigits = !enabled

  try {
    if (enabled) localStorage.removeItem(LATIN_DIGITS_KEY)
    else localStorage.setItem(LATIN_DIGITS_KEY, '1')
  } catch {
    // Private mode or full storage: the choice still holds for this launch.
  }
}

/** The locale to hand `Intl` / `toLocaleString` for display text. */
export function numberLocale(): string {
  return persianDigitsEnabled() ? PERSIAN_DIGIT_LOCALE : LATIN_DIGIT_LOCALE
}

type Locales = string | string[] | undefined

function displayLocales(locales: Locales): Locales {
  return locales === PERSIAN_DIGIT_LOCALE ? numberLocale() : locales
}

let shimInstalled = false

/**
 * Components call `n.toLocaleString('fa-IR')` directly in many places. Rather
 * than touch every page, route that exact locale through the flag: installed
 * only when Latin digits are on (default users get the untouched built-ins),
 * and only `'fa-IR'` is rewritten, every other locale passes through.
 * Returns the uninstall (tests).
 */
export function installDigitLocaleShim(): () => void {
  if (shimInstalled || persianDigitsEnabled()) return () => undefined
  shimInstalled = true

  const numberToLocale = Number.prototype.toLocaleString
  const dateToLocale = Date.prototype.toLocaleString
  const dateToLocaleDate = Date.prototype.toLocaleDateString
  const dateToLocaleTime = Date.prototype.toLocaleTimeString

  Number.prototype.toLocaleString = function (
    this: number,
    locales?: Locales,
    options?: Intl.NumberFormatOptions
  ) {
    return numberToLocale.call(this, displayLocales(locales), options)
  }
  Date.prototype.toLocaleString = function (
    this: Date,
    locales?: Locales,
    options?: Intl.DateTimeFormatOptions
  ) {
    return dateToLocale.call(this, displayLocales(locales), options)
  }
  Date.prototype.toLocaleDateString = function (
    this: Date,
    locales?: Locales,
    options?: Intl.DateTimeFormatOptions
  ) {
    return dateToLocaleDate.call(this, displayLocales(locales), options)
  }
  Date.prototype.toLocaleTimeString = function (
    this: Date,
    locales?: Locales,
    options?: Intl.DateTimeFormatOptions
  ) {
    return dateToLocaleTime.call(this, displayLocales(locales), options)
  }

  return () => {
    Number.prototype.toLocaleString = numberToLocale
    Date.prototype.toLocaleString = dateToLocale
    Date.prototype.toLocaleDateString = dateToLocaleDate
    Date.prototype.toLocaleTimeString = dateToLocaleTime
    shimInstalled = false
  }
}

/** Test hook: forget the cached flag so the next read goes back to storage. */
export function resetDigitStyleCache(): void {
  latinDigits = null
}
