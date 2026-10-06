import type { Tab } from './types'
import type { AppIconName } from '../appIcon/types'

/** Icons for the main modules, shared by the side menu and the bottom bar. */
export const PRIMARY_NAV_ICONS: Partial<Record<Tab, AppIconName>> = {
  dashboard: 'dashboard',
  wallet: 'wallet',
  receivables: 'receivables',
  dang: 'debt',
  installments: 'installments',
  checks: 'checks',
  treasury: 'treasury'
}
