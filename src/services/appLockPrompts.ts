import { isPinUpgradeRecommended } from './appLockPin'
import { getItem, removeItem, setItem } from './storage'

/** Fired whenever a prompt below appears or is dismissed. */
export const APP_LOCK_PROMPT_EVENT = 'accounting-app-lock-prompt'

const PIN_UPGRADE_KEY = 'accounting_app_lock_pin_upgrade'

export const LOCK_SETUP_OFFER_KEY = 'accounting_app_lock_offer_setup'

type PinUpgradeState = 'pending' | 'dismissed'

function readSession(): PinUpgradeState | null {
  try {
    return sessionStorage.getItem(PIN_UPGRADE_KEY) as PinUpgradeState | null
  } catch {
    return null
  }
}

function writeSession(state: PinUpgradeState): void {
  try {
    sessionStorage.setItem(PIN_UPGRADE_KEY, state)
  } catch {
    // Private mode: the prompt simply shows again next unlock.
  }
}

function notify(): void {
  window.dispatchEvent(new Event(APP_LOCK_PROMPT_EVENT))
}

/** After a PIN unlock: asks once per session to move a short PIN to 6+ digits. */
export function notePinUnlock(pinLength: number): void {
  if (!isPinUpgradeRecommended(pinLength) || readSession()) return

  writeSession('pending')
  notify()
}

export function isPinUpgradePending(): boolean {
  return readSession() === 'pending'
}

export function dismissPinUpgrade(): void {
  writeSession('dismissed')
  notify()
}

/** Set by PIN recovery right before the reload, so the app offers a new PIN. */
export function offerLockSetup(): void {
  setItem(LOCK_SETUP_OFFER_KEY, true)
}

export function isLockSetupOffered(): boolean {
  return getItem<boolean>(LOCK_SETUP_OFFER_KEY) === true
}

export function dismissLockSetupOffer(): void {
  removeItem(LOCK_SETUP_OFFER_KEY)
  notify()
}
