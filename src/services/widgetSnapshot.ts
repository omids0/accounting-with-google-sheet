import { getUserEmail } from './auth'
import { getPendingBankSms } from './bankSmsNative'
import { smsForActiveWorkspace } from './bankSmsRouting'
import { loadDashboardData } from './dashboard'
import { fetchDashboardReminderItems, type DashboardReminderItem } from './dashboardReminders'
import { getNetAvailableConfig, getSettings } from './settings'
import { activeSpreadsheetLabel } from './spreadsheetCatalog'
import { fetchWalletAccounts } from './wallet'
import { readAmountsHidden } from '../stores/amountsHiddenStore'
import type { DashboardData, WalletAccount } from '../types'
import { getInstallmentDueRange, resolveDateRange } from '../utils/dateRange'
import { formatPersianNumber } from '../utils/formatMoney'
import { getJalaliParts, isoToJalali, JALALI_MONTHS } from '../utils/jalaliDate'

/** What the Android home-screen widget shows; the app writes it, the widget only reads. */
export interface WidgetSnapshot {
  netAvailable: number
  monthExpense: number
  monthLabel: string
  pendingSms: number
  nextDue: { title: string; day: string; amount: number } | null
  updatedAt: string
  hidden: boolean
  sheetLabel: string
  accountsLabel: string
}

/** «ملت و سامان», «ملت و سامان و ۲ دیگر»; bank accounts only. */
export function accountsLabelOf(
  accounts: Pick<WalletAccount, 'title' | 'bankId' | 'accountKind'>[]
) {
  const titles = accounts
    .filter(account => account.bankId || account.accountKind === 'bank')
    .map(account => account.title.trim())
    .filter(Boolean)
  const shown = titles.slice(0, 2).join(' و ')
  const rest = titles.length - 2

  return rest > 0 ? `${shown} و ${formatPersianNumber(rest)} دیگر` : shown
}

/** «۵ مهر» */
function dayLabel(iso: string): string {
  if (!iso) return ''

  const { month, day } = isoToJalali(iso.slice(0, 10))

  return `${formatPersianNumber(day)} ${JALALI_MONTHS[month - 1] ?? ''}`.trim()
}

export interface WidgetSnapshotParts {
  data: Pick<DashboardData, 'totalExpense' | 'monthLabel'> & {
    financial: Pick<DashboardData['financial'], 'netAvailable'>
  }
  /** Ordered overdue first (`fetchDashboardReminderItems`); the first one shows. */
  reminders: Pick<DashboardReminderItem, 'title' | 'dueDate' | 'amount'>[]
  pendingSms: number
  hidden: boolean
  sheetLabel: string
  accounts: Pick<WalletAccount, 'title' | 'bankId' | 'accountKind'>[]
  now?: Date
}

export function snapshotFrom(parts: WidgetSnapshotParts): WidgetSnapshot {
  const next = parts.reminders[0]

  return {
    netAvailable: parts.data.financial.netAvailable,
    monthExpense: parts.data.totalExpense,
    monthLabel: parts.data.monthLabel,
    pendingSms: parts.pendingSms,
    nextDue: next ? { title: next.title, day: dayLabel(next.dueDate), amount: next.amount } : null,
    updatedAt: (parts.now ?? new Date()).toISOString(),
    hidden: parts.hidden,
    sheetLabel: parts.sheetLabel,
    accountsLabel: accountsLabelOf(parts.accounts)
  }
}

/** Same arguments as the dashboard's default view, so its cache answers. */
export async function buildWidgetSnapshot(spreadsheetId: string): Promise<WidgetSnapshot | null> {
  const settings = getSettings()

  if (!spreadsheetId || !getUserEmail() || settings?.spreadsheetId !== spreadsheetId) return null

  const range = resolveDateRange('month-to-date')
  const [data, reminders, sms, accounts] = await Promise.all([
    loadDashboardData(
      settings,
      range,
      getInstallmentDueRange('month-to-date'),
      getJalaliParts(new Date()).year,
      getNetAvailableConfig()
    ),
    fetchDashboardReminderItems(spreadsheetId, { limit: 1 }).catch(() => []),
    getPendingBankSms()
      .then(smsForActiveWorkspace)
      .catch(() => []),
    fetchWalletAccounts(spreadsheetId).catch(() => [])
  ])

  return snapshotFrom({
    data,
    reminders,
    pendingSms: sms.length,
    hidden: readAmountsHidden(),
    sheetLabel: activeSpreadsheetLabel(settings),
    accounts
  })
}

const MILLION = 1_000_000

/** «۲۹٬۷۷۰٬۰۰۰» */
export function formatWidgetAmount(amount: number): string {
  return formatPersianNumber(Math.round(amount))
}

/** «۲۹٫۸ م» from a million, «۸۵۰ هزار» from 100 thousand, else «۱۲٬۰۰۰». */
export function formatWidgetShort(amount: number): string {
  const sign = amount < 0 ? '−' : ''
  const abs = Math.abs(amount)

  if (abs >= 1000 * MILLION) {
    return `${sign}${formatPersianNumber(abs / (1000 * MILLION), {
      maximumFractionDigits: 1
    })} میلیارد`
  }
  if (abs >= MILLION) {
    return `${sign}${formatPersianNumber(abs / MILLION, { maximumFractionDigits: 1 })} م`
  }
  if (abs >= 100_000) return `${sign}${formatPersianNumber(Math.round(abs / 1000))} هزار`

  return `${sign}${formatWidgetAmount(abs)}`
}
