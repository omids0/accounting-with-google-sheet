/** What the shared account's card on «فضاهای من» can offer. */
export type SharedCardAction = 'open' | 'off' | 'reconnect' | 'forget'

/** Whether this device can reach the account's file; 'denied' = removed share or no grant here. */
export type SharedCardState = 'normal' | 'denied'

export const SHARED_ACTION_LABELS: Record<SharedCardAction, string> = {
  open: 'باز کردن',
  off: 'خاموش کردن قابلیت',
  reconnect: 'اتصال دوباره',
  forget: 'پاک کردن از این دستگاه'
}

/**
 * The buttons of the card, in order. A reachable account opens (and its owner can turn it off).
 * An unreachable one cannot be opened: it can be connected again (the Picker grants this device
 * the file) or forgotten on this device, which frees the one-account rule. Its members are
 * unknown then, so «خاموش کردن» (an owner's action that reads the file) is never offered.
 */
export function sharedCardActions(state: SharedCardState, owner: boolean): SharedCardAction[] {
  if (state === 'denied') return ['reconnect', 'forget']

  return owner ? ['open', 'off'] : ['open']
}

/** The confirmation of «پاک کردن از این دستگاه», for the shared confirm dialog's wording option. */
export function forgetSharedQuestion(name: string) {
  return {
    label: name,
    message: `حساب مشترک ‹${name}› فقط از این دستگاه پاک می‌شود؛ دفتر شخصی تو و فایل مالک دست نمی‌خورد`,
    wording: { title: 'از این دستگاه پاک شود؟', confirmLabel: 'پاک شود', tone: 'danger' as const }
  }
}
