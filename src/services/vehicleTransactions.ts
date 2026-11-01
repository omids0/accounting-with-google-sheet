import { getSettings } from './settings'
import { fetchRecords } from './sheets'
import { fetchVehicleExpenseMetaByVehicle } from './vehicleExpenseRecords'
import { fetchVehicleHistory } from './vehicleHistory'
import { fetchVehicleMechanicVisits } from './vehicleMechanicVisits'
import { fetchVehiclePeriodicServices } from './vehiclePeriodicServices'
import type { MonthlyFuelStats, VehicleTransactionItem } from '../types/vehicles'
import { getJalaliMonthKey } from '../utils/dateRange'
import { parseNumeric } from '../utils/parseNumeric'
import { isFuelExpenseType } from '../utils/vehicleExpenseUtils'
import { computeFuelEfficiencyL100km } from '../utils/vehicleFuelEfficiency'

const KIND_LABELS: Record<string, string> = {
  periodic: 'سرویس دوره‌ای',
  deadline: 'موعد',
  mechanic: 'مکانیک'
}

function sortByDateDesc<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date))
}

export async function fetchVehicleTransactions(
  spreadsheetId: string,
  vehicleId: string
): Promise<VehicleTransactionItem[]> {
  const expenseForm = getSettings()?.forms.find(form => form.type === 'expense')
  const [metaItems, history, periodics, mechanicVisits, expenseRecords] = await Promise.all([
    fetchVehicleExpenseMetaByVehicle(spreadsheetId, vehicleId),
    fetchVehicleHistory(spreadsheetId, vehicleId),
    fetchVehiclePeriodicServices(spreadsheetId, vehicleId),
    fetchVehicleMechanicVisits(spreadsheetId, vehicleId),
    expenseForm ? fetchRecords(spreadsheetId, expenseForm) : Promise.resolve([])
  ])

  const expenseById = new Map(expenseRecords.map(record => [record.id, record]))
  const transactions: VehicleTransactionItem[] = []
  // One expense record is one payment, however many rows point at it: a service done through
  // «ثبت انجام سرویس» is written to the history AND the periodic-service row with the same id,
  // a manual expense can renew a service, a mechanic visit has its history line. First row wins.
  const counted = new Set<string>()
  const claim = (expenseRecordId: string): boolean => {
    if (counted.has(expenseRecordId)) return false
    counted.add(expenseRecordId)

    return true
  }
  // A row whose expense is no longer in the records (it was deleted) moves no money any more.
  // Not checked while the expense form is not loaded.
  const isGone = (expenseRecordId: string): boolean =>
    expenseForm !== undefined && !expenseById.has(expenseRecordId)
  // The record is what the books say; the copy kept on the service row can be older.
  const amountOf = (expenseRecordId: string, kept: number): number => {
    const record = expenseById.get(expenseRecordId)

    return Math.max(0, record ? parseNumeric(record.values.amount) : kept)
  }

  for (const meta of metaItems) {
    if (meta.expenseRecordId && !claim(meta.expenseRecordId)) continue

    const record = expenseById.get(meta.expenseRecordId)

    transactions.push({
      id: meta.id,
      source: 'expense',
      date: record?.values.date ?? '',
      title: record?.values.title ?? meta.expenseType,
      amount: Math.max(0, parseNumeric(record?.values.amount)),
      expenseType: meta.expenseType,
      expenseRecordId: meta.expenseRecordId,
      fuelLiters: meta.fuelLiters,
      fuelPricePerLiter: meta.fuelPricePerLiter,
      mileage: meta.mileage,
      metaRowNumber: meta.rowNumber
    })
  }

  for (const item of history) {
    if (!item.expenseRecordId || isGone(item.expenseRecordId) || !claim(item.expenseRecordId)) {
      continue
    }

    transactions.push({
      id: item.id,
      source: 'history',
      date: item.date,
      title: item.details || KIND_LABELS[item.recordKind] || 'هزینه خودرو',
      amount: amountOf(item.expenseRecordId, item.amount),
      expenseRecordId: item.expenseRecordId,
      mileage: item.mileage
    })
  }

  for (const item of periodics) {
    if (!item.expenseRecordId || item.amount <= 0 || isGone(item.expenseRecordId)) continue
    if (!claim(item.expenseRecordId)) continue

    transactions.push({
      id: item.id,
      source: 'periodic',
      date: item.createdAt.split(',')[0] ?? '',
      title: `سرویس دوره‌ای — ${item.serviceType}`,
      amount: amountOf(item.expenseRecordId, item.amount),
      expenseRecordId: item.expenseRecordId,
      mileage: item.currentMileage
    })
  }

  for (const visit of mechanicVisits) {
    if (!visit.expenseRecordId || visit.totalAmount <= 0 || isGone(visit.expenseRecordId)) continue
    if (!claim(visit.expenseRecordId)) continue

    transactions.push({
      id: visit.id,
      source: 'mechanic',
      date: visit.date,
      title: 'مراجعه مکانیکی',
      amount: amountOf(visit.expenseRecordId, visit.totalAmount),
      expenseRecordId: visit.expenseRecordId,
      mileage: visit.mileage
    })
  }

  return sortByDateDesc(transactions)
}

function groupFuelByMonth(
  fuelTransactions: VehicleTransactionItem[]
): Map<string, VehicleTransactionItem[]> {
  const byMonth = new Map<string, VehicleTransactionItem[]>()

  for (const item of fuelTransactions) {
    if (!item.date || !isFuelExpenseType(item.expenseType ?? '')) continue

    const monthKey = getJalaliMonthKey(item.date)

    const bucket = byMonth.get(monthKey) ?? []

    bucket.push(item)
    byMonth.set(monthKey, bucket)
  }

  return byMonth
}

/** Each month measures from the highest odometer reading of the months before it. */
function buildEfficiencyByMonth(
  fuelTransactions: VehicleTransactionItem[]
): Map<string, number | null> {
  const byMonth = groupFuelByMonth(fuelTransactions)
  const efficiency = new Map<string, number | null>()
  let previousMileage: number | null = null

  for (const monthKey of [...byMonth.keys()].sort()) {
    const fills = byMonth.get(monthKey) ?? []
    const monthTop = Math.max(0, ...fills.map(fill => fill.mileage ?? 0))

    efficiency.set(monthKey, computeFuelEfficiencyL100km(fills, previousMileage))

    if (monthTop > 0) previousMileage = Math.max(previousMileage ?? 0, monthTop)
  }

  return efficiency
}

/**
 * `allFuelTransactions` is the unfiltered list: the consumption of a month needs the readings
 * of the month before it even when a filter hides them from the cards.
 */
export function buildMonthlyFuelStats(
  fuelTransactions: VehicleTransactionItem[],
  allFuelTransactions: VehicleTransactionItem[] = fuelTransactions
): MonthlyFuelStats[] {
  const byMonth = groupFuelByMonth(fuelTransactions)
  const efficiencyByMonth = buildEfficiencyByMonth(allFuelTransactions)
  const stats: MonthlyFuelStats[] = []

  for (const [monthKey, items] of byMonth) {
    const priceMap = new Map<number, { liters: number; amount: number }>()
    let totalLiters = 0
    let totalAmount = 0

    for (const item of items) {
      const liters = item.fuelLiters ?? 0
      const amount = item.amount
      const price = item.fuelPricePerLiter ?? 0

      totalLiters += liters
      totalAmount += amount

      if (price > 0) {
        const current = priceMap.get(price) ?? { liters: 0, amount: 0 }

        priceMap.set(price, {
          liters: current.liters + liters,
          amount: current.amount + amount
        })
      }
    }

    stats.push({
      monthKey,
      totalLiters,
      totalAmount,
      byPrice: [...priceMap.entries()]
        .map(([price, values]) => ({ price, ...values }))
        .sort((a, b) => a.price - b.price),
      efficiencyL100km: efficiencyByMonth.get(monthKey) ?? null,
      entries: [...items]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(item => ({
          date: item.date,
          liters: item.fuelLiters ?? 0,
          amount: item.amount,
          price: item.fuelPricePerLiter ?? 0,
          mileage: item.mileage
        }))
    })
  }

  return stats.sort((a, b) => b.monthKey.localeCompare(a.monthKey))
}

export function filterFuelTransactions(
  transactions: VehicleTransactionItem[]
): VehicleTransactionItem[] {
  return transactions.filter(item => isFuelExpenseType(item.expenseType ?? ''))
}

function resolveTransactionTypeLabel(item: VehicleTransactionItem): string {
  if (item.expenseType?.trim()) return item.expenseType.trim()

  if (item.source === 'periodic') return 'سرویس دوره‌ای'
  if (item.source === 'deadline') return 'موعد'
  if (item.source === 'mechanic') return 'مکانیک'

  return item.title || 'سایر'
}

export function getVehicleTransactionCategoryLabel(item: VehicleTransactionItem): string {
  return resolveTransactionTypeLabel(item)
}

export function buildVehicleExpenseTypeBreakdown(
  transactions: VehicleTransactionItem[]
): { name: string; total: number }[] {
  const totals = new Map<string, number>()

  for (const item of transactions) {
    if (item.amount <= 0) continue

    const label = resolveTransactionTypeLabel(item)

    totals.set(label, (totals.get(label) ?? 0) + item.amount)
  }

  return [...totals.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
}

export function sumVehicleTransactionAmounts(transactions: VehicleTransactionItem[]): number {
  return transactions.reduce((sum, item) => sum + Math.max(0, item.amount), 0)
}
