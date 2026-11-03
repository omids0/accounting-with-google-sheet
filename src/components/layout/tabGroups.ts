import type { Tab } from './types'

/** Pages under the wallet: the header back button returns to it. */
export const WALLET_SUB_TABS: Tab[] = [
  'opening-balances',
  'wallet-account-detail',
  'wallet-reconcile',
  'wallet-trace',
  'wallet-integrity',
  'wallet-transfers'
]

export const DANG_SPLIT_TABS: Tab[] = ['dang-split', 'dang-split-detail']

export const TIMESHEET_TABS: Tab[] = ['timesheets', 'timesheet-detail']

export const VEHICLE_TABS: Tab[] = ['vehicle-service', 'vehicle-detail']
