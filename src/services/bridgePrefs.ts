import { getItem, setItem } from './storage'
import { getOutboxCount } from './syncOutbox'

/** Per device; listed in `ACCOUNT_KEYS` (localDataWipe.ts) because it names records of the account. */
export const BRIDGE_PREFS_KEY = 'accounting_bridge_prefs'

/** A payment on a bridged personal receivable that still has to be written (needs a read first). */
export interface PendingBridgePayment {
  id: string
  /** The personal spreadsheet that holds the receivable. */
  personalId: string
  /** The building expense record the receivable was made from. */
  recordId: string
  amount: number
  /** ISO date of the repayment. */
  date: string
  /** Personal wallet account that receives the money ('' = none). */
  account: string
}

/**
 * An edit or delete of a building expense that has a bridged personal receivable, still to be
 * written (needs a read of the personal sheet first). One per expense: the newest edit replaces the
 * older one, and a delete replaces an edit.
 */
export interface PendingBridgeSync {
  id: string
  personalId: string
  recordId: string
  kind: 'edit' | 'delete'
  title: string
  amount: number
  /** ISO date of the edited expense. */
  date: string
}

/** The two bridges to the manager's personal spreadsheet (round 11, Step 8), remembered per device. */
export interface BridgePrefs {
  /** Tick «در حساب شخصی من: طلب از «<building>»» on an expense the manager paid. */
  pocket: boolean
  /** Tick «در حساب شخصی من: هزینهٔ «خانه › شارژ»» on a payment of the manager's own unit. */
  ownUnit: boolean
  /** Personal account that last received a repayment: the default of the next one. */
  account: string
  /** Building expense record id → personal spreadsheet that got its receivable (written once). */
  sent: Record<string, string>
  payments: PendingBridgePayment[]
  syncs: PendingBridgeSync[]
  /** Building id → `YYYY-MM` of the dashboard card dismissed for that month. */
  dismissed: Record<string, string>
}

const DEFAULTS: BridgePrefs = {
  pocket: false,
  ownUnit: false,
  account: '',
  sent: {},
  payments: [],
  syncs: [],
  dismissed: {}
}

export function readBridgePrefs(): BridgePrefs {
  return { ...DEFAULTS, ...getItem<Partial<BridgePrefs>>(BRIDGE_PREFS_KEY) }
}

export function updateBridgePrefs(patch: Partial<BridgePrefs>): BridgePrefs {
  const next = { ...readBridgePrefs(), ...patch }

  try {
    setItem(BRIDGE_PREFS_KEY, next)
  } catch {
    // Private mode: the choice lasts until the page closes.
  }

  return next
}

/** Changes still waiting for a spreadsheet that is not open: its outbox plus its bridged payments. */
export function pendingBridgeChanges(spreadsheetId: string): number {
  return (
    getOutboxCount(spreadsheetId) +
    readBridgePrefs().payments.filter(item => item.personalId === spreadsheetId).length +
    readBridgePrefs().syncs.filter(item => item.personalId === spreadsheetId).length
  )
}
