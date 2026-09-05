export type Tab =
  | 'dashboard'
  | 'entry'
  | 'records'
  | 'installments'
  | 'dang'
  | 'checks'
  | 'receivables'
  | 'treasury'
  | 'wallet'
  | 'opening-balances'
  | 'net-available-settings'
  | 'loan-calculator'
  | 'currency-converter'
  | 'date-calculator'
  | 'report-financial-summary'
  | 'report-income-expense'
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

export const CALCULATION_TABS: Tab[] = ['loan-calculator', 'currency-converter', 'date-calculator']

export const TIMESHEET_TABS: Tab[] = ['timesheets', 'timesheet-detail']

export const REPORT_TABS: Tab[] = [
  'report-financial-summary',
  'report-income-expense',
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

export const BOTTOM_NAV_TABS: Tab[] = [
  'installments',
  'dang',
  'checks',
  'dashboard',
  'receivables',
  'treasury',
  'wallet'
]

export const SPEED_DIAL_TABS: Tab[] = [
  'dashboard',
  'installments',
  'dang',
  'checks',
  'receivables',
  'treasury',
  'wallet',
  'timesheets',
  'timesheet-detail'
]

export const TAB_TITLES: Record<Tab, string> = {
  dashboard: 'داشبورد',
  entry: 'ثبت جدید',
  records: 'رکوردها',
  installments: 'اقساط',
  dang: 'بدهی',
  checks: 'چک‌ها',
  receivables: 'طلب‌ها',
  treasury: 'صندوقچه',
  wallet: 'کیف پول',
  'opening-balances': 'موجودی اول دوره',
  'net-available-settings': 'دارایی قابل اتکا',
  'loan-calculator': 'محاسبات درخواست وام',
  'currency-converter': 'تبدیل ارز',
  'date-calculator': 'محاسبه تاریخ',
  'report-financial-summary': 'خلاصه مالی',
  'report-income-expense': 'درآمد و هزینه',
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
