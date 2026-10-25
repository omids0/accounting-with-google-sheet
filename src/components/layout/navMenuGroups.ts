import { BUILDING_SETTINGS_TABS, BUILDING_UNIT_TABS, VEHICLE_TABS, type Tab } from './types'
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
    activeTabs: ['wallet', 'wallet-account-detail', 'wallet-reconcile', 'wallet-trace']
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
  { tab: 'counterparties', icon: 'counterparties' },
  { tab: 'buildings-home', icon: 'building' }
]

/** Android only; closes the «بیشتر» group. */
export const MENU_BANK_SMS_LINK: MenuLinkEntry = { tab: 'bank-sms', icon: 'empty-inbox' }

export const MENU_ABOUT_LINK: MenuLinkEntry = {
  tab: 'about',
  icon: 'info',
  label: 'درباره و راهنما'
}

/** Opens the page with the invite link, code and the count of people who signed in with it. */
export const MENU_INVITE_LINK: MenuLinkEntry = { tab: 'invite', icon: 'share' }

export interface BuildingMenuGroup {
  label: string
  links: MenuLinkEntry[]
}

/**
 * The drawer of a building workspace (round 11). Rows whose page needs a permission
 * (`TAB_PERMISSIONS`) are dropped for roles without it. «برگشت به حساب شخصی» and the building
 * switcher sit above these groups (`LayoutBuildingMenuNav`).
 */
export const buildingMenuGroups: BuildingMenuGroup[] = [
  {
    label: 'ساختمان',
    links: [
      { tab: 'building-dashboard', icon: 'dashboard' },
      { tab: 'building-units', icon: 'door', activeTabs: BUILDING_UNIT_TABS },
      { tab: 'building-residents', icon: 'counterparties' },
      { tab: 'building-charges', icon: 'coins' },
      { tab: 'building-expenses', icon: 'records' },
      { tab: 'building-fund', icon: 'wallet' }
    ]
  },
  {
    label: MENU_COMMITMENTS_LABEL,
    links: [
      { tab: 'building-dang', icon: 'debt' },
      { tab: 'building-checks', icon: 'checks' }
    ]
  },
  {
    label: MENU_MORE_LABEL,
    links: [
      { tab: 'building-counterparties', icon: 'contact' },
      { tab: 'building-sms', icon: 'empty-inbox' },
      { tab: 'building-reports', icon: 'chart' },
      { tab: 'building-settings', icon: 'settings', activeTabs: BUILDING_SETTINGS_TABS }
    ]
  },
  { label: MENU_APP_LABEL, links: [MENU_ABOUT_LINK, MENU_INVITE_LINK] }
]

export const BUILDING_RETURN_LABEL = 'برگشت به حساب شخصی'

export const CALC_MENU_ITEMS: { tab: Tab; activeTabs: Tab[] }[] = [
  { tab: 'loan-calculator', activeTabs: ['loan-calculator'] },
  { tab: 'currency-converter', activeTabs: ['currency-converter'] },
  { tab: 'date-calculator', activeTabs: ['date-calculator'] },
  { tab: 'dang-split', activeTabs: ['dang-split', 'dang-split-detail'] }
]
