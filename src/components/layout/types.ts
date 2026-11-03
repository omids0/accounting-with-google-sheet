import { SHARED_SPEED_DIAL_TABS, SHARED_TAB_TITLES, type SharedTab } from './sharedTabs'

export type Tab =
  /** A URL no page answers to: no tab is highlighted and no speed dial shows. */
  | 'not-found'
  | SharedTab
  | 'dashboard'
  | 'charts'
  | 'entry'
  | 'records'
  | 'installments'
  | 'dang'
  | 'checks'
  | 'personal-reminders'
  | 'vehicle-service'
  | 'vehicle-detail'
  | 'counterparties'
  | 'receivables'
  | 'treasury'
  | 'wallet'
  | 'wallet-account-detail'
  | 'wallet-reconcile'
  | 'wallet-trace'
  | 'wallet-integrity'
  | 'wallet-transfers'
  | 'bank-sms'
  | 'search'
  | 'opening-balances'
  | 'net-available-settings'
  | 'loan-calculator'
  | 'currency-converter'
  | 'date-calculator'
  | 'dang-split'
  | 'dang-split-detail'
  | 'report-financial-summary'
  | 'report-income-expense'
  | 'report-category-tree'
  | 'report-line-items'
  | 'report-line-item'
  | 'report-counterparties'
  | 'report-cash-flow'
  | 'report-due-dates'
  | 'report-forecast'
  | 'report-assets-liabilities'
  | 'report-opening-balances'
  | 'report-wallet'
  | 'report-treasury'
  | 'report-receivables'
  | 'report-dang'
  | 'report-installments'
  | 'report-checks'
  | 'report-monthly'
  | 'report-years'
  | 'timesheets'
  | 'timesheet-detail'
  | 'about'
  | 'invite'
  | 'activity'
  | 'buildings-home'
  | 'building-dashboard'
  | 'building-setup'
  | 'building-units'
  | 'building-residents'
  | 'building-unit'
  | 'building-charges'
  | 'building-expenses'
  | 'building-fund'
  | 'building-dang'
  | 'building-checks'
  | 'building-counterparties'
  | 'building-sms'
  | 'building-reports'
  | 'building-settings'
  | 'building-members'
  | 'building-lists'

export const CALCULATION_TABS: Tab[] = [
  'loan-calculator',
  'currency-converter',
  'date-calculator',
  'dang-split',
  'dang-split-detail'
]

export { DANG_SPLIT_TABS, TIMESHEET_TABS, VEHICLE_TABS, WALLET_SUB_TABS } from './tabGroups'

export const REPORT_TABS: Tab[] = [
  'report-financial-summary',
  'report-income-expense',
  'report-category-tree',
  'report-line-items',
  'report-line-item',
  'report-counterparties',
  'report-cash-flow',
  'report-due-dates',
  'report-forecast',
  'report-assets-liabilities',
  'report-opening-balances',
  'report-wallet',
  'report-treasury',
  'report-receivables',
  'report-dang',
  'report-installments',
  'report-checks',
  'report-monthly',
  'report-years'
]

/** Main modules in menu order: dashboard first, then money on hand, then obligations. */
export const PRIMARY_NAV_TABS: Tab[] = [
  'dashboard',
  'wallet',
  'receivables',
  'dang',
  'installments',
  'checks',
  'treasury'
]

/** Mobile bottom bar: three tabs on each side of the raised dashboard button in the middle. */
export const BOTTOM_NAV_START_TABS: Tab[] = ['installments', 'dang', 'checks']

export const BOTTOM_NAV_END_TABS: Tab[] = ['receivables', 'treasury', 'wallet']

export const SPEED_DIAL_TABS: Tab[] = [
  'dashboard',
  'records',
  'report-category-tree',
  'report-line-items',
  'report-counterparties',
  'installments',
  'dang',
  'checks',
  'personal-reminders',
  'vehicle-service',
  'vehicle-detail',
  'counterparties',
  'receivables',
  'treasury',
  'wallet',
  'wallet-account-detail',
  'wallet-transfers',
  'timesheets',
  'timesheet-detail',
  'dang-split',
  'dang-split-detail',
  'activity',
  'building-dashboard',
  'building-units',
  'building-residents',
  'building-charges',
  'building-expenses',
  'building-fund',
  'building-dang',
  'building-checks',
  'building-counterparties',
  ...SHARED_SPEED_DIAL_TABS
]

export const TAB_TITLES: Record<Tab, string> = {
  'not-found': 'صفحه پیدا نشد',
  dashboard: 'داشبورد',
  charts: 'نمودارها',
  entry: 'ثبت جدید',
  records: 'رکوردها',
  installments: 'اقساط',
  dang: 'بدهی',
  checks: 'چک‌ها',
  'personal-reminders': 'یادآوری',
  'vehicle-service': 'سرویس خودرو',
  'vehicle-detail': 'پروفایل خودرو',
  counterparties: 'طرف حساب‌ها',
  receivables: 'طلب‌ها',
  treasury: 'صندوقچه',
  wallet: 'کیف پول',
  'wallet-account-detail': 'گردش حساب',
  'wallet-reconcile': 'تطبیق حساب',
  'wallet-trace': 'ردیاب اختلاف',
  'wallet-integrity': 'بررسی یکپارچگی',
  'wallet-transfers': 'انتقال‌ها',
  'bank-sms': 'پیامک‌های بانکی',
  search: 'جستجو',
  'opening-balances': 'موجودی اول دوره',
  'net-available-settings': 'دارایی قابل اتکا',
  'loan-calculator': 'محاسبات درخواست وام',
  'currency-converter': 'تبدیل ارز',
  'date-calculator': 'محاسبه تاریخ',
  'dang-split': 'محاسبه دنگ',
  'dang-split-detail': 'جزئیات دنگ',
  'report-financial-summary': 'خلاصه مالی',
  'report-income-expense': 'درآمد و هزینه',
  'report-category-tree': 'درختواره درآمد/هزینه',
  'report-line-items': 'گزارش اقلام',
  'report-line-item': 'قلم',
  'report-counterparties': 'گزارش طرف حساب‌ها',
  'report-cash-flow': 'جریان نقدی',
  'report-due-dates': 'سررسیدها',
  'report-forecast': 'پیش‌بینی نقدینگی',
  'report-assets-liabilities': 'دارایی و بدهی',
  'report-opening-balances': 'موجودی اول دوره',
  'report-wallet': 'گزارش کیف پول',
  'report-treasury': 'گزارش صندوقچه',
  'report-receivables': 'گزارش طلب‌ها',
  'report-dang': 'گزارش بدهی‌ها',
  'report-installments': 'گزارش اقساط',
  'report-checks': 'گزارش چک‌ها',
  'report-monthly': 'گزارش ماهانه',
  'report-years': 'سال در یک نگاه',
  timesheets: 'تایم‌شیت',
  'timesheet-detail': 'جزئیات تایم‌شیت',
  about: 'درباره',
  invite: 'دعوت دوستان',
  activity: 'فعالیت',
  'buildings-home': 'فضاهای من',
  'building-dashboard': 'داشبورد',
  'building-setup': 'راه‌اندازی ساختمان',
  'building-units': 'واحدها',
  'building-residents': 'ساکنان',
  'building-unit': 'واحد',
  'building-charges': 'شارژ',
  'building-expenses': 'هزینه‌ها',
  'building-fund': 'صندوق',
  'building-dang': 'بدهی ساختمان',
  'building-checks': 'چک‌ها',
  'building-counterparties': 'طرف حساب‌ها',
  'building-sms': 'پیامک بانکی',
  'building-reports': 'گزارش‌ها و مجمع',
  'building-settings': 'تنظیمات ساختمان',
  'building-members': 'اعضا و دسترسی‌ها',
  'building-lists': 'فهرست‌ها',
  ...SHARED_TAB_TITLES
}

/** Pages of a building workspace; the personal workspace redirects them to its dashboard. */
export const BUILDING_TABS: Tab[] = [
  'building-dashboard',
  'building-setup',
  'building-units',
  'building-residents',
  'building-unit',
  'building-charges',
  'building-expenses',
  'building-fund',
  'building-dang',
  'building-checks',
  'building-counterparties',
  'building-sms',
  'building-reports',
  'building-settings',
  'building-members',
  'building-lists'
]

/** Unit pages: the units row stays current on a single unit. */
export const BUILDING_UNIT_TABS: Tab[] = ['building-units', 'building-unit']

/** Sub-pages of a building: the header back button returns to the page they hang under. */
export const BUILDING_PARENT_TAB: Partial<Record<Tab, Tab>> = {
  'building-unit': 'building-units',
  'building-members': 'building-settings',
  'building-lists': 'building-settings'
}

/** Settings pages: the settings row stays current on members and lists. */
export const BUILDING_SETTINGS_TABS: Tab[] = [
  'building-settings',
  'building-members',
  'building-lists'
]

/**
 * Personal pages a building does not have (installments, treasury, vehicles, timesheets, …) or
 * replaces with its own (dashboard, wallet → fund, dang, checks, counterparties, SMS); a building
 * workspace redirects them to its dashboard. «buildings-home» is not listed: a building reaches
 * it from the drawer's building switcher. Shared pages (entry, records, reports, about,
 * search, activity, calculators) are not listed.
 */
export const PERSONAL_ONLY_TABS: Tab[] = [
  'dashboard',
  'charts',
  'installments',
  'dang',
  'checks',
  'personal-reminders',
  'vehicle-service',
  'vehicle-detail',
  'counterparties',
  'receivables',
  'treasury',
  'wallet',
  'wallet-trace',
  'wallet-integrity',
  'wallet-transfers',
  'bank-sms',
  'timesheets',
  'timesheet-detail'
]
