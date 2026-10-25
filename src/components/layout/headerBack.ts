import {
  BUILDING_PARENT_TAB,
  CALCULATION_TABS,
  REPORT_TABS,
  TIMESHEET_TABS,
  VEHICLE_TABS,
  WALLET_SUB_TABS,
  type Tab
} from './types'

const BACK_TABS: Tab[] = [
  'charts',
  'records',
  'entry',
  'net-available-settings',
  'personal-reminders',
  'vehicle-service',
  'vehicle-detail',
  'about',
  'invite',
  'search'
]

/** Whether the header shows a back arrow instead of the menu button on this tab. */
export function showsHeaderBack(tab: Tab, showSettings: boolean): boolean {
  return (
    showSettings ||
    BACK_TABS.includes(tab) ||
    WALLET_SUB_TABS.includes(tab) ||
    tab in BUILDING_PARENT_TAB ||
    TIMESHEET_TABS.includes(tab) ||
    VEHICLE_TABS.includes(tab) ||
    CALCULATION_TABS.includes(tab) ||
    REPORT_TABS.includes(tab)
  )
}
