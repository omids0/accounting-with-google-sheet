export type Tab =
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

export const CALCULATION_TABS: Tab[] = [
  'loan-calculator',
  'currency-converter',
  'date-calculator',
  'dang-split',
  'dang-split-detail'
]

/** Pages under the wallet: the header back button returns to it. */
export const WALLET_SUB_TABS: Tab[] = [
  'opening-balances',
  'wallet-account-detail',
  'wallet-reconcile'
]

export const DANG_SPLIT_TABS: Tab[] = ['dang-split', 'dang-split-detail']

export const TIMESHEET_TABS: Tab[] = ['timesheets', 'timesheet-detail']

export const VEHICLE_TABS: Tab[] = ['vehicle-service', 'vehicle-detail']

export const REPORT_TABS: Tab[] = [
  'report-financial-summary',
  'report-income-expense',
  'report-category-tree',
  'report-line-items',
  'report-line-item',
  'report-counterparties',
  'report-cash-flow',
  'report-due-dates',
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
  'timesheets',
  'timesheet-detail',
  'dang-split',
  'dang-split-detail'
]

export const TAB_TITLES: Record<Tab, string> = {
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
  about: 'درباره'
}
