import type { HistoryWithRow } from '../components/vehicles/vehicleDetailMutations'
import type {
  MonthlyFuelStats,
  VehicleActiveListItem,
  VehicleTransactionItem
} from '../types/vehicles'
import { downloadTextFile, rowsToCsv } from '../utils/csv'
import { formatJalaliMonthLabel } from '../utils/dateRange'
import { formatMoney } from '../utils/formatMoney'
import { formatIsoDatePersian } from '../utils/jalaliDate'
import { downloadTablePdf } from '../utils/pdf'

export type VehicleDetailExportTab = 'active' | 'deadlines' | 'history' | 'transactions' | 'fuel'

export type VehicleDetailExportPayload = {
  vehicleTitle: string
  tab: VehicleDetailExportTab
  activeItems: VehicleActiveListItem[]
  historyItems: HistoryWithRow[]
  transactions: VehicleTransactionItem[]
  fuelStats: MonthlyFuelStats[]
}

const TAB_LABELS: Record<VehicleDetailExportTab, string> = {
  active: 'موارد-فعال',
  deadlines: 'موعدها',
  history: 'تاریخچه',
  transactions: 'تراکنش‌ها',
  fuel: 'مصرف-بنزین'
}

const URGENCY_LABELS: Record<VehicleActiveListItem['urgency'], string> = {
  overdue: 'گذشته',
  soon: 'نزدیک',
  ok: 'عادی'
}

const HISTORY_KIND_LABELS = {
  periodic: 'سرویس دوره‌ای',
  deadline: 'موعد',
  mechanic: 'مکانیک'
} as const

function safeFilePart(value: string): string {
  return (
    value
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '-') || 'خودرو'
  )
}

function buildFilename(
  vehicleTitle: string,
  tab: VehicleDetailExportTab,
  extension: string
): string {
  return `${safeFilePart(vehicleTitle)}-${TAB_LABELS[tab]}.${extension}`
}

function buildActiveRows(items: VehicleActiveListItem[]): { headers: string[]; rows: string[][] } {
  const headers = ['نوع', 'عنوان', 'وضعیت', 'خلاصه', 'جزئیات']

  const rows = items.map(item => [
    item.kind === 'periodic' ? 'سرویس دوره‌ای' : 'موعد',
    item.title,
    URGENCY_LABELS[item.urgency],
    item.subtitle,
    item.detailLines?.join(' · ') ?? ''
  ])

  return { headers, rows }
}

function buildDeadlineRows(items: VehicleActiveListItem[]): {
  headers: string[]
  rows: string[][]
} {
  const headers = ['دسته', 'شروع', 'پایان', 'مبلغ', 'یادآوری', 'روز قبل', 'توضیحات', 'وضعیت']

  const rows = items.map(item => {
    const deadline = item.deadline

    return [
      item.title,
      deadline ? formatIsoDatePersian(deadline.startDate) : '—',
      deadline ? formatIsoDatePersian(deadline.endDate) : '—',
      deadline && deadline.amount > 0 ? formatMoney(deadline.amount) : '—',
      deadline?.reminderEnabled ? 'فعال' : 'غیرفعال',
      deadline?.reminderEnabled ? String(deadline.daysBefore) : '—',
      deadline?.notes ?? '',
      URGENCY_LABELS[item.urgency]
    ]
  })

  return { headers, rows }
}

function buildHistoryRows(items: HistoryWithRow[]): { headers: string[]; rows: string[][] } {
  const headers = ['نوع', 'تاریخ', 'کارکرد (km)', 'بعدی (km)', 'مبلغ', 'جزئیات']

  const rows = items.map(item => [
    HISTORY_KIND_LABELS[item.recordKind],
    item.date ? formatIsoDatePersian(item.date) : '—',
    item.mileage > 0 ? item.mileage.toLocaleString('fa-IR') : '—',
    item.nextKm > 0 ? item.nextKm.toLocaleString('fa-IR') : '—',
    item.amount > 0 ? formatMoney(item.amount) : '—',
    item.details
  ])

  return { headers, rows }
}

function buildTransactionRows(items: VehicleTransactionItem[]): {
  headers: string[]
  rows: string[][]
} {
  const headers = ['تاریخ', 'عنوان', 'نوع', 'مبلغ', 'کارکرد (km)', 'لیتر']

  const rows = items.map(item => [
    item.date ? formatIsoDatePersian(item.date) : '—',
    item.title,
    item.expenseType?.trim() || item.title,
    item.amount > 0 ? formatMoney(item.amount) : '—',
    item.mileage && item.mileage > 0 ? item.mileage.toLocaleString('fa-IR') : '—',
    item.fuelLiters && item.fuelLiters > 0
      ? item.fuelLiters.toLocaleString('fa-IR', { maximumFractionDigits: 2 })
      : '—'
  ])

  return { headers, rows }
}

function buildFuelRows(stats: MonthlyFuelStats[]): { headers: string[]; rows: string[][] } {
  const headers = ['ماه', 'تاریخ', 'لیتر', 'نرخ (تومان/L)', 'مبلغ', 'کارکرد (km)']
  const rows: string[][] = []

  for (const month of stats) {
    const monthLabel = formatJalaliMonthLabel(month.monthKey)

    for (const entry of month.entries) {
      rows.push([
        monthLabel,
        entry.date ? formatIsoDatePersian(entry.date) : '—',
        entry.liters.toLocaleString('fa-IR', { maximumFractionDigits: 2 }),
        entry.price.toLocaleString('fa-IR'),
        formatMoney(entry.amount),
        entry.mileage ? entry.mileage.toLocaleString('fa-IR') : '—'
      ])
    }
  }

  return { headers, rows }
}

function resolveTable(payload: VehicleDetailExportPayload): {
  headers: string[]
  rows: string[][]
} {
  switch (payload.tab) {
    case 'active':
      return buildActiveRows(payload.activeItems)
    case 'deadlines':
      return buildDeadlineRows(payload.activeItems)
    case 'history':
      return buildHistoryRows(payload.historyItems)
    case 'transactions':
      return buildTransactionRows(payload.transactions)
    case 'fuel':
      return buildFuelRows(payload.fuelStats)
    default:
      return { headers: [], rows: [] }
  }
}

function resolveTitle(payload: VehicleDetailExportPayload): string {
  const tabTitle =
    payload.tab === 'active'
      ? 'موارد فعال'
      : payload.tab === 'deadlines'
      ? 'موعدها'
      : payload.tab === 'history'
      ? 'تاریخچه'
      : payload.tab === 'transactions'
      ? 'تراکنش‌ها'
      : 'مصرف بنزین'

  return `گزارش ${tabTitle} — ${payload.vehicleTitle}`
}

export async function exportVehicleDetailCsv(payload: VehicleDetailExportPayload): Promise<void> {
  const { headers, rows } = resolveTable(payload)

  if (!rows.length) {
    throw new Error('داده‌ای برای خروجی وجود ندارد')
  }

  downloadTextFile(
    buildFilename(payload.vehicleTitle, payload.tab, 'csv'),
    rowsToCsv(headers, rows)
  )
}

export async function exportVehicleDetailPdf(payload: VehicleDetailExportPayload): Promise<void> {
  const { headers, rows } = resolveTable(payload)

  if (!rows.length) {
    throw new Error('داده‌ای برای خروجی وجود ندارد')
  }

  await downloadTablePdf({
    title: resolveTitle(payload),
    headers,
    rows,
    filename: buildFilename(payload.vehicleTitle, payload.tab, 'pdf')
  })
}
