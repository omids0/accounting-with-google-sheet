import type { WorkspaceType } from './workspace'
import type { Tab } from '../components/layout/types'

/**
 * What the app was opened for from outside: a home-screen shortcut, the share
 * sheet, or a native notification. Web shortcuts and the share target open the
 * start URL with a query (`?action=expense`, `?share=1&text=…`); the APK opens
 * `com.omids0.accounting://entry?action=…`, `://bank-sms` or `://bank-sms/quick?id=…`
 * (shortcuts.xml, BankSmsNotifier.OPEN_URL / QUICK_URL_PREFIX, NightlyDigest.ENTRY_URL).
 */
export type LaunchAction =
  | { kind: 'entry'; formType?: 'income' | 'expense' }
  | { kind: 'sms' }
  /** The notification's «ثبت سریع»: one pending SMS (its id) in a sheet over the current page. */
  | { kind: 'smsQuick'; id: string }
  | { kind: 'share'; text: string }
  /** The home-screen widget's body (`…://dashboard`). */
  | { kind: 'dashboard' }

const QUERY_ACTIONS = new Map<string, LaunchAction>([
  ['expense', { kind: 'entry', formType: 'expense' }],
  ['income', { kind: 'entry', formType: 'income' }],
  ['sms', { kind: 'sms' }]
])

/** The native queue's SMS id (a SHA-256 hex digest, or a short hex fallback). */
const SMS_ID = /^[0-9a-f]{1,64}$/i

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
  // Before the generic one: an old app build only sends `://bank-sms`, which stays the page.
  if (base.includes('://bank-sms/quick')) {
    const id = params.get('id')?.trim() ?? ''

    return SMS_ID.test(id) ? { kind: 'smsQuick', id } : { kind: 'sms' }
  }
  if (base.includes('://bank-sms')) return { kind: 'sms' }
  if (base.includes('://entry')) return { kind: 'entry' }
  if (base.includes('://dashboard')) return { kind: 'dashboard' }

  return null
}

export interface LaunchTarget {
  tab: Tab
  formType?: 'income' | 'expense'
  /** A shared text for «پیامک‌های بانکی». */
  smsText?: string
}

/**
 * The page an action opens. A shared account has no entry form or SMS queue (its records carry a
 * payer and a split), so every action lands on its home and nothing opens for a viewer.
 */
export function launchTarget(action: LaunchAction, workspace: WorkspaceType): LaunchTarget {
  if (workspace === 'shared') return { tab: 'shared-home' }
  if (action.kind === 'entry') return { tab: 'entry', formType: action.formType }
  if (action.kind === 'dashboard') return { tab: 'dashboard' }

  return action.kind === 'share' ? { tab: 'bank-sms', smsText: action.text } : { tab: 'bank-sms' }
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
