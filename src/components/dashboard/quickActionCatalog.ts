import { getPathForTab } from '../../routes/paths'
import type { AppIconName } from '../AppIcon'
import { type Tab, TAB_TITLES } from '../layout/types'
import type { dashboardQuickActionIconClass } from '../ui/dashboardCalmStyles'

interface QuickActionBase {
  id: string
  label: string
  icon: AppIconName
  tone: keyof typeof dashboardQuickActionIconClass
}

/** A link to a page or an entry form. */
interface LinkQuickAction extends QuickActionBase {
  kind?: undefined
  to: string
  /** The page's tab; absent for the entry forms, which the bottom bar cannot show. */
  tab?: Tab
}

/** «اسکن فاکتور»: opens the camera, then the expense form reading the photo. Not a page. */
interface ScanInvoiceQuickAction extends QuickActionBase {
  kind: 'scan-invoice'
  to?: undefined
  tab?: undefined
}

export type QuickAction = LinkQuickAction | ScanInvoiceQuickAction

/** A shortcut to a main page; the label is the page's own menu title unless a shorter one is given. */
function pageAction(id: string, tab: Tab, icon: AppIconName, label = TAB_TITLES[tab]): QuickAction {
  return { id, label, icon, tone: 'neutral', to: getPathForTab(tab), tab }
}

/**
 * Every destination a customizable slot can hold: Settings › «نمایش» picks four of them for the
 * phone dashboard's shortcuts and six of the page ones for the bottom bar.
 */
export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'income',
    label: 'ثبت درآمد',
    icon: 'add',
    tone: 'income',
    to: getPathForTab('entry', { formType: 'income' })
  },
  {
    id: 'expense',
    label: 'ثبت هزینه',
    icon: 'add',
    tone: 'expense',
    to: getPathForTab('entry', { formType: 'expense' })
  },
  {
    id: 'scan-invoice',
    label: 'اسکن فاکتور',
    icon: 'camera',
    tone: 'neutral',
    kind: 'scan-invoice'
  },
  pageAction('transfer', 'wallet-transfers', 'swap', 'انتقال'),
  pageAction('wallet', 'wallet', 'wallet'),
  pageAction('checks', 'checks', 'checks'),
  pageAction('receivables', 'receivables', 'receivables'),
  pageAction('dang', 'dang', 'debt'),
  pageAction('installments', 'installments', 'installments'),
  pageAction('treasury', 'treasury', 'treasury'),
  pageAction('records', 'records', 'records'),
  pageAction('charts', 'charts', 'chart'),
  pageAction('reminders', 'personal-reminders', 'bell'),
  pageAction('counterparties', 'counterparties', 'counterparties', 'طرف‌ها'),
  pageAction('vehicles', 'vehicle-service', 'car', 'خودرو'),
  pageAction('search', 'search', 'search')
]

export type QuickActionId = QuickAction['id']

/** The bottom bar holds pages only: the entry forms and the invoice scan are not tabs. */
export const BOTTOM_NAV_ACTIONS = QUICK_ACTIONS.filter(action => action.tab)

export const QUICK_ACTION_SLOTS = 4

/** The bottom bar's slots: three left of the raised dashboard button and three right of it. */
export const BOTTOM_NAV_SLOTS = 6

/**
 * «کیف پول» took the last slot from «چک‌ها» (people open the wallet far more often), and «اسکن
 * فاکتور» took «انتقال»'s (a transfer is a rare entry; it stays in the list for Settings › «نمایش»).
 */
export const DEFAULT_QUICK_ACTION_IDS: QuickActionId[] = [
  'income',
  'expense',
  'scan-invoice',
  'wallet'
]

/** Today's bar, in slot order (the first three sit on the start side). */
export const DEFAULT_BOTTOM_NAV_IDS: QuickActionId[] = [
  'installments',
  'dang',
  'checks',
  'receivables',
  'treasury',
  'wallet'
]

const BY_ID = new Map(QUICK_ACTIONS.map(action => [action.id, action]))

export function getQuickAction(id: QuickActionId): QuickAction | undefined {
  return BY_ID.get(id)
}

/**
 * A stored list is valid only with one distinct allowed id per slot; anything else is the default.
 * Catalog ids are therefore a stored contract: renaming or removing one resets every device's list.
 */
export function sanitizeSlotIds(
  value: unknown,
  defaults: QuickActionId[],
  allowed: QuickAction[]
): QuickActionId[] {
  if (!Array.isArray(value) || value.length !== defaults.length) return defaults

  const allowedIds = new Set(allowed.map(action => action.id))
  const valid = value.every(id => typeof id === 'string' && allowedIds.has(id))

  return valid && new Set(value).size === defaults.length ? (value as QuickActionId[]) : defaults
}

export const sanitizeQuickActionIds = (value: unknown) =>
  sanitizeSlotIds(value, DEFAULT_QUICK_ACTION_IDS, QUICK_ACTIONS)

export const sanitizeBottomNavIds = (value: unknown) =>
  sanitizeSlotIds(value, DEFAULT_BOTTOM_NAV_IDS, BOTTOM_NAV_ACTIONS)

/** Puts `id` in a slot; when it already sits in another slot the two swap, so no shortcut shows twice. */
export function placeQuickAction(
  ids: QuickActionId[],
  slot: number,
  id: QuickActionId
): QuickActionId[] {
  const next = [...ids]
  const from = next.indexOf(id)

  if (from !== -1) next[from] = next[slot]

  next[slot] = id

  return next
}
