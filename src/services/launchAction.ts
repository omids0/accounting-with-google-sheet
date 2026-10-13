/**
 * What the app was opened for from outside: a home-screen shortcut, the share
 * sheet, or a native notification. Web shortcuts and the share target open the
 * start URL with a query (`?action=expense`, `?share=1&text=…`); the APK opens
 * `com.omids0.accounting://entry?action=…` or `://bank-sms` (shortcuts.xml,
 * BankSmsNotifier.OPEN_URL, NightlyDigest.ENTRY_URL).
 */
export type LaunchAction =
  | { kind: 'entry'; formType?: 'income' | 'expense' }
  | { kind: 'sms' }
  | { kind: 'share'; text: string }
  /** The home-screen widget's body (`…://dashboard`). */
  | { kind: 'dashboard' }

const QUERY_ACTIONS = new Map<string, LaunchAction>([
  ['expense', { kind: 'entry', formType: 'expense' }],
  ['income', { kind: 'entry', formType: 'income' }],
  ['sms', { kind: 'sms' }]
])

/** `null` when the URL asks for nothing (or for something unknown). */
export function parseLaunchUrl(url: string | null | undefined): LaunchAction | null {
  if (!url) return null

  const queryStart = url.indexOf('?')
  const base = queryStart < 0 ? url : url.slice(0, queryStart)
  const query = queryStart < 0 ? '' : url.slice(queryStart + 1).split('#')[0]
  const params = new URLSearchParams(query)
  const text = params.get('text')?.trim()

  // Some browsers replace the share target's own query, so `text` alone is enough.
  if (text) return { kind: 'share', text }

  const action = QUERY_ACTIONS.get(params.get('action') ?? '')

  if (action) return action
  if (base.includes('://bank-sms')) return { kind: 'sms' }
  if (base.includes('://entry')) return { kind: 'entry' }
  if (base.includes('://dashboard')) return { kind: 'dashboard' }

  return null
}

const SHARED_SMS_STATE_KEY = 'sharedSms'

/** Router state that opens «پیامک‌های بانکی» with a shared text. */
export function buildSharedSmsState(text: string): Record<typeof SHARED_SMS_STATE_KEY, string> {
  return { [SHARED_SMS_STATE_KEY]: text }
}

export function readSharedSmsText(state: unknown): string {
  const text = (state as Record<string, unknown> | null)?.[SHARED_SMS_STATE_KEY]

  return typeof text === 'string' ? text.trim() : ''
}
