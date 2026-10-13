import type { Tab } from '../components/layout/types'
import type { ModuleReportKind } from '../components/reports/ModuleReportPage'
import { toPersianDigits } from '../utils/normalizeDigits'

export interface TabNavigationOptions {
  timesheetId?: string
  timesheetTitle?: string
  vehicleId?: string
  vehicleTitle?: string
  dangSplitGroupId?: string
  dangSplitGroupTitle?: string
  formType?: 'income' | 'expense'
  walletAccountId?: string
}

const REPORT_KIND_BY_TAB: Partial<Record<Tab, ModuleReportKind>> = {
  'report-wallet': 'wallet',
  'report-treasury': 'treasury',
  'report-receivables': 'receivables',
  'report-dang': 'dang',
  'report-installments': 'installments',
  'report-checks': 'checks'
}

const REPORT_TAB_BY_KIND = Object.fromEntries(
  Object.entries(REPORT_KIND_BY_TAB).map(([tab, kind]) => [kind, tab as Tab])
) as Record<ModuleReportKind, Tab>

const EXACT_TAB_PATHS: Partial<Record<Tab, string>> = {
  dashboard: '/',
  charts: '/charts',
  installments: '/installments',
  dang: '/dang',
  checks: '/checks',
  'personal-reminders': '/reminders',
  'vehicle-service': '/vehicles',
  counterparties: '/counterparties',
  receivables: '/receivables',
  treasury: '/treasury',
  wallet: '/wallet',
  'bank-sms': '/bank-sms',
  search: '/search',
  entry: '/entry',
  records: '/records',
  'opening-balances': '/wallet/opening-balances',
  'net-available-settings': '/net-available-settings',
  'loan-calculator': '/calculators/loan',
  'currency-converter': '/calculators/currency',
  'date-calculator': '/calculators/date',
  'dang-split': '/dang-split',
  about: '/about',
  'report-financial-summary': '/reports/financial-summary',
  'report-income-expense': '/reports/income-expense',
  'report-category-tree': '/reports/category-tree',
  'report-cash-flow': '/reports/cash-flow',
  'report-due-dates': '/reports/due-dates',
  'report-assets-liabilities': '/reports/assets-liabilities',
  'report-opening-balances': '/reports/opening-balances',
  'report-wallet': '/reports/wallet',
  'report-treasury': '/reports/treasury',
  'report-receivables': '/reports/receivables',
  'report-dang': '/reports/dang',
  'report-installments': '/reports/installments',
  'report-checks': '/reports/checks',
  'report-monthly': '/reports/monthly',
  'report-years': '/reports/years',
  timesheets: '/timesheets'
}

const PATH_TO_TAB = Object.fromEntries(
  Object.entries(EXACT_TAB_PATHS).map(([tab, path]) => [path, tab as Tab])
) as Record<string, Tab>

function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '')

  return trimmed === '' ? '/' : trimmed
}

export function getTabFromPath(pathname: string): Tab {
  const path = normalizePath(pathname)

  if (/^\/timesheets\/[^/]+$/.test(path)) {
    return 'timesheet-detail'
  }

  if (/^\/vehicles\/[^/]+$/.test(path)) {
    return 'vehicle-detail'
  }

  if (/^\/dang-split\/[^/]+$/.test(path)) {
    return 'dang-split-detail'
  }

  if (/^\/wallet\/reconcile\/[^/]+$/.test(path)) {
    return 'wallet-reconcile'
  }

  // `/wallet/opening-balances` is an exact path, not an account id.
  if (!PATH_TO_TAB[path] && /^\/wallet\/[^/]+$/.test(path)) {
    return 'wallet-account-detail'
  }

  return PATH_TO_TAB[path] ?? 'dashboard'
}

export function getPathForTab(tab: Tab, options?: TabNavigationOptions): string {
  if (tab === 'timesheet-detail') {
    if (!options?.timesheetId) return EXACT_TAB_PATHS.timesheets ?? '/timesheets'

    return `/timesheets/${encodeURIComponent(options.timesheetId)}`
  }

  if (tab === 'vehicle-detail') {
    if (!options?.vehicleId) return EXACT_TAB_PATHS['vehicle-service'] ?? '/vehicles'

    return `/vehicles/${encodeURIComponent(options.vehicleId)}`
  }

  if (tab === 'dang-split-detail') {
    if (!options?.dangSplitGroupId) return EXACT_TAB_PATHS['dang-split'] ?? '/dang-split'

    return `/dang-split/${encodeURIComponent(options.dangSplitGroupId)}`
  }

  if (tab === 'wallet-account-detail') {
    if (!options?.walletAccountId) return EXACT_TAB_PATHS.wallet ?? '/wallet'

    return `/wallet/${encodeURIComponent(options.walletAccountId)}`
  }

  if (tab === 'wallet-reconcile') {
    if (!options?.walletAccountId) return EXACT_TAB_PATHS.wallet ?? '/wallet'

    return `/wallet/reconcile/${encodeURIComponent(options.walletAccountId)}`
  }

  const basePath = EXACT_TAB_PATHS[tab]

  if (!basePath) return '/'

  if ((tab === 'entry' || tab === 'records') && options?.formType) {
    return `${basePath}?type=${options.formType}`
  }

  return basePath
}

export function getReportKindFromPath(pathname: string): ModuleReportKind | null {
  const tab = getTabFromPath(pathname)
  const kind = REPORT_KIND_BY_TAB[tab]

  return kind ?? null
}

export function getReportTabFromKind(kind: ModuleReportKind): Tab {
  return REPORT_TAB_BY_KIND[kind]
}

/** Query key of the records page that shows one record only (round 6, duplicate warning). */
export const RECORD_FOCUS_PARAM = 'record'

/** With `edit=1` the records page also opens that record's edit form (reconciliation wizard). */
export const RECORD_EDIT_PARAM = 'edit'

/** The records page showing only `recordId`, optionally with its edit form open. */
export function recordFocusPath(
  type: 'income' | 'expense',
  recordId: string,
  edit = false
): string {
  const path = `/records?type=${type}&${RECORD_FOCUS_PARAM}=${encodeURIComponent(recordId)}`

  return edit ? `${path}&${RECORD_EDIT_PARAM}=1` : path
}

/** Query key a module page reads to scroll to and flash one item (`useHighlightParam`). */
export const HIGHLIGHT_PARAM = 'highlight'

/** `basePath` with the item `id` highlighted. */
export function highlightPath(basePath: string, id: string): string {
  return `${basePath}?${HIGHLIGHT_PARAM}=${encodeURIComponent(id)}`
}

export const SETTINGS_PATH = '/settings'
export const SETTINGS_REMINDERS_PATH = '/settings/reminders'

export function isSettingsPath(pathname: string): boolean {
  const path = normalizePath(pathname)

  return path === SETTINGS_PATH || path.startsWith(`${SETTINGS_PATH}/`)
}

export const SETTINGS_CATEGORIES_PATH = '/settings/categories'

/** Task I: «پشتیبان» — automatic backups, Drive versions, restore. */
export const SETTINGS_BACKUP_PATH = '/settings/backup'

/** Task E: «بستن سال» wizard, `/settings/close-year/:year`. */
export const SETTINGS_CLOSE_YEAR_PATH = '/settings/close-year'

export function closeYearPath(year: number): string {
  return `${SETTINGS_CLOSE_YEAR_PATH}/${year}`
}

const CLOSE_YEAR_PATTERN = /^\/settings\/close-year\/([^/]+)$/

/** The wizard is opened from the year card or Settings; its back button returns there. */
export function isCloseYearPath(pathname: string): boolean {
  return CLOSE_YEAR_PATTERN.test(normalizePath(pathname))
}

/** Query key of the monthly report page: the Jalali `YYYY-MM` to build. */
export const REPORT_MONTH_PARAM = 'month'

export function monthlyReportPath(monthKey?: string): string {
  const base = EXACT_TAB_PATHS['report-monthly'] ?? '/reports/monthly'

  return monthKey ? `${base}?${REPORT_MONTH_PARAM}=${encodeURIComponent(monthKey)}` : base
}

const SETTINGS_SUBPAGE_TITLES: Record<string, string> = {
  [SETTINGS_REMINDERS_PATH]: 'یادآوری‌ها',
  [SETTINGS_CATEGORIES_PATH]: 'دسته‌ها',
  [SETTINGS_BACKUP_PATH]: 'پشتیبان'
}

/** Header title of a settings sub-page, whose back button returns to Settings; null elsewhere. */
export function getSettingsSubpageTitle(pathname: string): string | null {
  const path = normalizePath(pathname)
  const closeYear = CLOSE_YEAR_PATTERN.exec(path)

  if (closeYear) return `بستن سال ${toPersianDigits(closeYear[1])}`

  return SETTINGS_SUBPAGE_TITLES[path] ?? null
}

/** The category page, opened on the income or expense list. */
export function getCategoriesPath(type?: 'income' | 'expense'): string {
  return type ? `${SETTINGS_CATEGORIES_PATH}?type=${type}` : SETTINGS_CATEGORIES_PATH
}
