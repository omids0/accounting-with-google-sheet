/** New PINs need at least this many digits. */
export const PIN_MIN_LENGTH = 6

export const PIN_MAX_LENGTH = 12

/** PINs set before 6 digits were required (4–5 digits) still unlock. */
export const LEGACY_PIN_MIN_LENGTH = 4

/** Rules for a new or changed PIN. */
export function validatePinFormat(pin: string): string | null {
  if (!/^\d*$/.test(pin)) {
    return 'رمز فقط باید عدد باشد'
  }
  if (pin.length < PIN_MIN_LENGTH) {
    return `رمز باید حداقل ${PIN_MIN_LENGTH} رقم باشد`
  }
  if (pin.length > PIN_MAX_LENGTH) {
    return `رمز حداکثر ${PIN_MAX_LENGTH} رقم می‌تواند باشد`
  }

  return null
}

/** What the unlock screen accepts: any stored PIN, old 4-digit ones included. */
export function isAcceptableUnlockPin(pin: string): boolean {
  return /^\d+$/.test(pin) && pin.length >= LEGACY_PIN_MIN_LENGTH && pin.length <= PIN_MAX_LENGTH
}

export function isPinUpgradeRecommended(pinLength: number): boolean {
  return pinLength < PIN_MIN_LENGTH
}
