export type Tab =
  | 'dashboard'
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
  | 'report-cash-flow'
  | 'report-due-dates'
  | 'report-assets-liabilities'
  | 'report-opening-balances'
  | 'report-wallet'
  | 'report-treasury'
  | 'report-receivables'
  | 'report-dang'
  | 'report-installments'
  | 'report-checks'
  | 'timesheets'
  | 'timesheet-detail'
  | 'about'

export const CALCULATION_TABS: Tab[] = [
  'loan-calculator',
  'currency-converter',
  'date-calculator',
  'dang-split',
  'dang-split-detail'
]

export const DANG_SPLIT_TABS: Tab[] = ['dang-split', 'dang-split-detail']

export const TIMESHEET_TABS: Tab[] = ['timesheets', 'timesheet-detail']

export const VEHICLE_TABS: Tab[] = ['vehicle-service', 'vehicle-detail']

export const REPORT_TABS: Tab[] = [
  'report-financial-summary',
  'report-income-expense',
  'report-category-tree',
  'report-cash-flow',
  'report-due-dates',
  'report-assets-liabilities',
  'report-opening-balances',
  'report-wallet',
  'report-treasury',
  'report-receivables',
  'report-dang',
  'report-installments',
  'report-checks'
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

/** The mobile bottom bar holds at most five items; the rest stay in the side menu. */
export const BOTTOM_NAV_TABS: Tab[] = PRIMARY_NAV_TABS.slice(0, 5)

export const SPEED_DIAL_TABS: Tab[] = [
  'dashboard',
  'records',
  'report-category-tree',
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
  'timesheets',
  'timesheet-detail',
  'dang-split',
  'dang-split-detail'
]

export const TAB_TITLES: Record<Tab, string> = {
  dashboard: 'داشبورد',
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
  'report-cash-flow': 'جریان نقدی',
  'report-due-dates': 'سررسیدها',
  'report-assets-liabilities': 'دارایی و بدهی',
  'report-opening-balances': 'موجودی اول دوره',
  'report-wallet': 'گزارش کیف پول',
  'report-treasury': 'گزارش صندوقچه',
  'report-receivables': 'گزارش طلب‌ها',
  'report-dang': 'گزارش بدهی‌ها',
  'report-installments': 'گزارش اقساط',
  'report-checks': 'گزارش چک‌ها',
  timesheets: 'تایم‌شیت',
  'timesheet-detail': 'جزئیات تایم‌شیت',
  about: 'درباره'
}
