import { getSettings } from './settings'
import { fetchRecords } from './sheets'
import { fetchVehicleDeadlines } from './vehicleDeadlines'
import { fetchVehicleExpenseMetaByVehicle } from './vehicleExpenseRecords'
import { fetchVehicleHistory } from './vehicleHistory'
import { fetchVehicleMechanicVisits } from './vehicleMechanicVisits'
import { fetchVehiclePeriodicServices } from './vehiclePeriodicServices'
import type { MonthlyFuelStats, VehicleTransactionItem } from '../types/vehicles'
import { getJalaliMonthKey } from '../utils/dateRange'
import { isFuelExpenseType } from '../utils/vehicleExpenseUtils'

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
  const [metaItems, history, periodics, deadlines, mechanicVisits, expenseRecords] =
    await Promise.all([
      fetchVehicleExpenseMetaByVehicle(spreadsheetId, vehicleId),
      fetchVehicleHistory(spreadsheetId, vehicleId),
      fetchVehiclePeriodicServices(spreadsheetId, vehicleId),
      fetchVehicleDeadlines(spreadsheetId, vehicleId),
      fetchVehicleMechanicVisits(spreadsheetId, vehicleId),
      expenseForm ? fetchRecords(spreadsheetId, expenseForm) : Promise.resolve([])
    ])

  const expenseById = new Map(expenseRecords.map(record => [record.id, record]))
  const linkedFromMeta = new Set(metaItems.map(item => item.expenseRecordId))
  const transactions: VehicleTransactionItem[] = []

  for (const meta of metaItems) {
    const record = expenseById.get(meta.expenseRecordId)

    transactions.push({
      id: meta.id,
      source: 'expense',
      date: record?.values.date ?? '',
      title: record?.values.title ?? meta.expenseType,
      amount: Math.max(0, Number(record?.values.amount) || 0),
      expenseType: meta.expenseType,
      expenseRecordId: meta.expenseRecordId,
      fuelLiters: meta.fuelLiters,
      fuelPricePerLiter: meta.fuelPricePerLiter,
      mileage: meta.mileage,
      metaRowNumber: meta.rowNumber
    })
  }

  for (const item of history) {
    if (!item.expenseRecordId || linkedFromMeta.has(item.expenseRecordId)) continue

    transactions.push({
      id: item.id,
      source: 'history',
      date: item.date,
      title: item.details || KIND_LABELS[item.recordKind] || 'هزینه خودرو',
      amount: item.amount,
      expenseRecordId: item.expenseRecordId,
      mileage: item.mileage
    })
  }

  for (const item of periodics) {
    if (!item.expenseRecordId || item.amount <= 0 || linkedFromMeta.has(item.expenseRecordId)) {
      continue
    }

    transactions.push({
      id: item.id,
      source: 'periodic',
      date: item.createdAt.split(',')[0] ?? '',
      title: `سرویس دوره‌ای — ${item.serviceType}`,
      amount: item.amount,
      expenseRecordId: item.expenseRecordId,
      mileage: item.currentMileage
    })
  }

  for (const item of deadlines) {
    if (!item.expenseRecordId || item.amount <= 0 || linkedFromMeta.has(item.expenseRecordId)) {
      continue
    }

    transactions.push({
      id: item.id,
      source: 'deadline',
      date: item.endDate,
      title: `موعد — ${item.category}`,
      amount: item.amount,
      expenseRecordId: item.expenseRecordId
    })
  }

  for (const visit of mechanicVisits) {
    if (
      !visit.expenseRecordId ||
      visit.totalAmount <= 0 ||
      linkedFromMeta.has(visit.expenseRecordId)
    ) {
      continue
    }

    transactions.push({
      id: visit.id,
      source: 'mechanic',
      date: visit.date,
      title: 'مراجعه مکانیکی',
      amount: visit.totalAmount,
      expenseRecordId: visit.expenseRecordId,
      mileage: visit.mileage
    })
  }

  return sortByDateDesc(transactions)
}

export function buildMonthlyFuelStats(
  fuelTransactions: VehicleTransactionItem[]
): MonthlyFuelStats[] {
  const byMonth = new Map<string, VehicleTransactionItem[]>()

  for (const item of fuelTransactions) {
    if (!item.date || !isFuelExpenseType(item.expenseType ?? '')) continue

    const monthKey = getJalaliMonthKey(item.date)

    const bucket = byMonth.get(monthKey) ?? []

    bucket.push(item)
    byMonth.set(monthKey, bucket)
  }

  const stats: MonthlyFuelStats[] = []

  for (const [monthKey, items] of byMonth) {
    const sorted = [...items].sort((a, b) => (a.mileage ?? 0) - (b.mileage ?? 0))
    const priceMap = new Map<number, { liters: number; amount: number }>()
    let totalLiters = 0
    let totalAmount = 0

    for (const item of sorted) {
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

    let efficiencyL100km: number | null = null
    const mileages = sorted.map(item => item.mileage ?? 0).filter(value => value > 0)

    if (mileages.length >= 2) {
      const distance = mileages[mileages.length - 1] - mileages[0]

      if (distance > 0) {
        efficiencyL100km = (totalLiters / distance) * 100
      }
    }

    stats.push({
      monthKey,
      totalLiters,
      totalAmount,
      byPrice: [...priceMap.entries()]
        .map(([price, values]) => ({ price, ...values }))
        .sort((a, b) => a.price - b.price),
      efficiencyL100km
    })
  }

  return stats.sort((a, b) => b.monthKey.localeCompare(a.monthKey))
}

export function filterFuelTransactions(
  transactions: VehicleTransactionItem[]
): VehicleTransactionItem[] {
  return transactions.filter(item => isFuelExpenseType(item.expenseType ?? ''))
}
