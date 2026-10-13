import { installDigitLocaleShim, persianDigitsEnabled } from './digitStyle'

/**
 * Settings › «نمایش»: text size, reduced motion, high contrast, haptics. All per
 * device (this screen, these eyes), so none of these keys is in `ACCOUNT_KEYS`.
 * Raw string values (not JSON) so the pre-paint script in index.html reads them
 * as-is. Theme stays in `accounting_settings` (utils/theme.ts); digits live in
 * digitStyle.ts because the formatters import it.
 */
export const TEXT_SIZE_KEY = 'accounting_text_size'
export const REDUCED_MOTION_KEY = 'accounting_reduced_motion'
export const HIGH_CONTRAST_KEY = 'accounting_high_contrast'
export const HAPTICS_OFF_KEY = 'accounting_haptics_off'

export type TextSize = 'sm' | 'md' | 'lg' | 'xl'

/** Four steps on `html { font-size }`; everything is rem, so every page scales. */
export const TEXT_SIZE_OPTIONS: { value: TextSize; label: string; percent: number }[] = [
  { value: 'sm', label: 'کوچک', percent: 87.5 },
  { value: 'md', label: 'عادی', percent: 100 },
  { value: 'lg', label: 'بزرگ', percent: 112.5 },
  { value: 'xl', label: 'خیلی بزرگ', percent: 125 }
]

/**
 * «عادی» by default: the web cannot read the OS font scale, and the Android
 * WebView already applies it on top of the page (its text zoom follows the
 * system setting), so «عادی» there is the system size.
 */
export const DEFAULT_TEXT_SIZE: TextSize = 'md'

/** base.css sets `html { font-size: 16px }`; display.css scales it per step. */
const BASE_ROOT_PX = 16

/** Pixels of `rem` at a text size, matching styles/display.css. */
export function remToPx(rem: number, size: TextSize): number {
  const percent = TEXT_SIZE_OPTIONS.find(option => option.value === size)?.percent ?? 100

  return Math.round((rem * BASE_ROOT_PX * percent) / 100)
}

export interface DisplayPrefs {
  textSize: TextSize
  /** The manual switch; the OS setting is applied on top (see `resolveReducedMotion`). */
  reducedMotion: boolean
  highContrast: boolean
  persianDigits: boolean
  haptics: boolean
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Private mode or full storage: the choice still holds for this launch.
  }
}

export function isTextSize(value: unknown): value is TextSize {
  return TEXT_SIZE_OPTIONS.some(option => option.value === value)
}

export function readDisplayPrefs(): DisplayPrefs {
  const textSize = read(TEXT_SIZE_KEY)

  return {
    textSize: isTextSize(textSize) ? textSize : DEFAULT_TEXT_SIZE,
    reducedMotion: read(REDUCED_MOTION_KEY) === '1',
    highContrast: read(HIGH_CONTRAST_KEY) === '1',
    persianDigits: persianDigitsEnabled(),
    haptics: read(HAPTICS_OFF_KEY) !== '1'
  }
}

export function writeTextSize(size: TextSize): void {
  write(TEXT_SIZE_KEY, size === DEFAULT_TEXT_SIZE ? null : size)
}

export function writeReducedMotion(on: boolean): void {
  write(REDUCED_MOTION_KEY, on ? '1' : null)
}

export function writeHighContrast(on: boolean): void {
  write(HIGH_CONTRAST_KEY, on ? '1' : null)
}

export function writeHaptics(on: boolean): void {
  write(HAPTICS_OFF_KEY, on ? null : '1')
}

/** Read on every `haptic()` call: cheap, and the switch applies at once. */
export function hapticsEnabled(): boolean {
  return read(HAPTICS_OFF_KEY) !== '1'
}

export function systemPrefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.(REDUCED_MOTION_QUERY).matches
}

/**
 * The OS setting always wins when it asks for less motion (an accessibility
 * need the app must not undo); the manual switch adds reduction on top of it.
 */
export function resolveReducedMotion(manual: boolean, systemReduce: boolean): boolean {
  return manual || systemReduce
}

/** Mirrors the prefs onto `<html>`; the stylesheet (styles/display.css) does the rest. */
export function applyDisplayPrefs(
  prefs: DisplayPrefs,
  root: HTMLElement = document.documentElement,
  systemReduce: boolean = systemPrefersReducedMotion()
): void {
  const toggle = (name: string, value: string | null) => {
    if (value === null) root.removeAttribute(name)
    else root.setAttribute(name, value)
  }

  toggle('data-text-size', prefs.textSize === DEFAULT_TEXT_SIZE ? null : prefs.textSize)
  toggle(
    'data-reduced-motion',
    resolveReducedMotion(prefs.reducedMotion, systemReduce) ? 'reduce' : null
  )
  toggle('data-contrast', prefs.highContrast ? 'high' : null)
  toggle('data-digits', prefs.persianDigits ? null : 'latn')
}

let motionQueryCleanup: (() => void) | null = null

/**
 * At boot, before the first render (main.tsx): applies the stored prefs, keeps
 * `data-reduced-motion` in step with the OS setting, and routes `'fa-IR'`
 * formatting through the digit flag. index.html already set the attributes
 * before paint; this repeats it with the full logic.
 */
export function initDisplayPrefs(): void {
  installDigitLocaleShim()
  applyDisplayPrefs(readDisplayPrefs())

  if (motionQueryCleanup || typeof window === 'undefined' || !window.matchMedia) return

  const query = window.matchMedia(REDUCED_MOTION_QUERY)
  const onChange = () => applyDisplayPrefs(readDisplayPrefs())

  query.addEventListener?.('change', onChange)
  motionQueryCleanup = () => query.removeEventListener?.('change', onChange)
}
