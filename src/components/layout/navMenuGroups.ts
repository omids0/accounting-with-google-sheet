import { VEHICLE_TABS, type Tab } from './types'
import type { AppIconName } from '../appIcon/types'

export interface MenuLinkEntry {
  tab: Tab
  icon: AppIconName
  /** Menu label when it differs from the page title. */
  label?: string
  /** Tabs that mark this entry as current; defaults to `[tab]`. */
  activeTabs?: Tab[]
}

export const MENU_MONEY_LABEL = 'پول'

export const MENU_COMMITMENTS_LABEL = 'تعهدات'

export const MENU_MORE_LABEL = 'بیشتر'

export const MENU_APP_LABEL = 'اپ'

export const MENU_MONEY_LINKS: MenuLinkEntry[] = [
  { tab: 'dashboard', icon: 'dashboard' },
  {
    tab: 'wallet',
    icon: 'wallet',
    activeTabs: ['wallet', 'wallet-account-detail', 'wallet-reconcile']
  },
  { tab: 'records', icon: 'records' }
]

export const MENU_COMMITMENT_LINKS: MenuLinkEntry[] = [
  { tab: 'installments', icon: 'installments' },
  { tab: 'checks', icon: 'checks' },
  { tab: 'dang', icon: 'debt' },
  { tab: 'receivables', icon: 'receivables' },
  { tab: 'treasury', icon: 'treasury' }
]

/** «بیشتر» links shown before the collapsible reports / calculations / timesheet rows. */
export const MENU_MORE_LINKS: MenuLinkEntry[] = [
  { tab: 'personal-reminders', icon: 'bell' },
  { tab: 'vehicle-service', icon: 'car', activeTabs: VEHICLE_TABS },
  { tab: 'counterparties', icon: 'counterparties' }
]

/** Android only; closes the «بیشتر» group. */
export const MENU_BANK_SMS_LINK: MenuLinkEntry = { tab: 'bank-sms', icon: 'empty-inbox' }

export const MENU_ABOUT_LINK: MenuLinkEntry = {
  tab: 'about',
  icon: 'info',
  label: 'درباره و راهنما'
}

export const CALC_MENU_ITEMS: { tab: Tab; activeTabs: Tab[] }[] = [
  { tab: 'loan-calculator', activeTabs: ['loan-calculator'] },
  { tab: 'currency-converter', activeTabs: ['currency-converter'] },
  { tab: 'date-calculator', activeTabs: ['date-calculator'] },
  { tab: 'dang-split', activeTabs: ['dang-split', 'dang-split-detail'] }
]
