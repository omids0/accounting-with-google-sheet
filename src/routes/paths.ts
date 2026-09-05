import type { Tab } from '../components/layout/types'
import type { ModuleReportKind } from '../components/reports/ModuleReportPage'

export interface TabNavigationOptions {
  timesheetId?: string
  timesheetTitle?: string
  formType?: 'income' | 'expense'
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
  installments: '/installments',
  dang: '/dang',
  checks: '/checks',
  'personal-reminders': '/reminders',
  receivables: '/receivables',
  treasury: '/treasury',
  wallet: '/wallet',
  entry: '/entry',
  records: '/records',
  'opening-balances': '/wallet/opening-balances',
  'net-available-settings': '/net-available-settings',
  'loan-calculator': '/calculators/loan',
  'currency-converter': '/calculators/currency',
  'date-calculator': '/calculators/date',
  about: '/about',
  'report-financial-summary': '/reports/financial-summary',
  'report-income-expense': '/reports/income-expense',
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

  return PATH_TO_TAB[path] ?? 'dashboard'
}

export function getPathForTab(tab: Tab, options?: TabNavigationOptions): string {
  if (tab === 'timesheet-detail') {
    if (!options?.timesheetId) return EXACT_TAB_PATHS.timesheets ?? '/timesheets'

    return `/timesheets/${encodeURIComponent(options.timesheetId)}`
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

export const SETTINGS_PATH = '/settings'
export const SETTINGS_REMINDERS_PATH = '/settings/reminders'

export function isSettingsPath(pathname: string): boolean {
  const path = normalizePath(pathname)

  return path === SETTINGS_PATH || path.startsWith(`${SETTINGS_PATH}/`)
}

export function isSettingsRemindersPath(pathname: string): boolean {
  return normalizePath(pathname) === SETTINGS_REMINDERS_PATH
}
