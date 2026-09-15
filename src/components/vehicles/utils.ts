import type {
  VehicleActiveListItem,
  VehicleDeadline,
  VehicleMileageReminderInterval,
  VehiclePeriodicService,
  VehicleUrgencyLevel
} from '../../types/vehicles'
import { getTodayIso, isoToJalali } from '../../utils/jalaliDate'

function diffIsoDays(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso.slice(0, 10)}T12:00:00`)
  const to = new Date(`${toIso.slice(0, 10)}T12:00:00`)

  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

const SOON_KM_THRESHOLD = 500
const SOON_DAYS_THRESHOLD = 14

export function calculateNextKm(currentMileage: number, intervalKm: number): number {
  return currentMileage + Math.max(0, intervalKm)
}

export function getUrgencyFromKm(remainingKm: number): VehicleUrgencyLevel {
  if (remainingKm < 0) return 'overdue'
  if (remainingKm <= SOON_KM_THRESHOLD) return 'soon'

  return 'ok'
}

export function getUrgencyFromDays(remainingDays: number): VehicleUrgencyLevel {
  if (remainingDays < 0) return 'overdue'
  if (remainingDays <= SOON_DAYS_THRESHOLD) return 'soon'

  return 'ok'
}

export function formatPeriodicRemainingSubtitle(remainingKm: number, nextKm: number): string {
  if (remainingKm < 0) {
    return `گذشته · بعدی: ${nextKm.toLocaleString('fa-IR')} km`
  }

  return `${remainingKm.toLocaleString('fa-IR')} km مانده · بعدی: ${nextKm.toLocaleString(
    'fa-IR'
  )} km`
}

export function formatDeadlineRemainingSubtitle(remainingDays: number, endDate: string): string {
  if (remainingDays < 0) {
    return `گذشته · پایان: ${endDate}`
  }

  return `${remainingDays.toLocaleString('fa-IR')} روز مانده · پایان: ${endDate}`
}

export function buildPeriodicListItem(
  item: VehiclePeriodicService & { rowNumber: number },
  vehicleMileage: number
): VehicleActiveListItem {
  const remainingKm = item.nextKm - vehicleMileage
  const urgency = getUrgencyFromKm(remainingKm)

  return {
    id: item.id,
    vehicleId: item.vehicleId,
    kind: 'periodic',
    title: item.serviceType,
    subtitle: formatPeriodicRemainingSubtitle(remainingKm, item.nextKm),
    urgency,
    sortKey: remainingKm,
    remainingKm,
    remainingDays: null,
    periodic: item
  }
}

export function buildDeadlineListItem(
  item: VehicleDeadline & { rowNumber: number }
): VehicleActiveListItem {
  const remainingDays = diffIsoDays(getTodayIso(), item.endDate)
  const urgency = getUrgencyFromDays(remainingDays)

  return {
    id: item.id,
    vehicleId: item.vehicleId,
    kind: 'deadline',
    title: item.category,
    subtitle: formatDeadlineRemainingSubtitle(remainingDays, item.endDate),
    urgency,
    sortKey: remainingDays,
    remainingKm: null,
    remainingDays,
    deadline: item
  }
}

export function sortActiveItems(items: VehicleActiveListItem[]): VehicleActiveListItem[] {
  const urgencyRank: Record<VehicleUrgencyLevel, number> = {
    overdue: 0,
    soon: 1,
    ok: 2
  }

  return [...items].sort((a, b) => {
    const urgencyDiff = urgencyRank[a.urgency] - urgencyRank[b.urgency]

    if (urgencyDiff !== 0) return urgencyDiff

    return a.sortKey - b.sortKey
  })
}

export function countActionNeeded(items: VehicleActiveListItem[]): number {
  return items.filter(item => item.urgency !== 'ok').length
}

function intervalToDays(interval: VehicleMileageReminderInterval): number | null {
  switch (interval) {
    case 'daily':
      return 1
    case 'every-3-days':
      return 3
    case 'every-10-days':
      return 10
    case 'weekly':
      return 7
    case 'biweekly':
      return 14
    case 'triweekly':
      return 21
    case 'every-2-months':
      return 60
    case 'every-3-months':
      return 90
    case 'every-6-months':
      return 180
    case 'yearly':
      return 365
    case 'first-of-month':
    default:
      return null
  }
}

export function shouldPromptMileageUpdate(
  interval: VehicleMileageReminderInterval,
  lastMileageUpdate: string,
  today = getTodayIso()
): boolean {
  if (!lastMileageUpdate) return true

  if (interval === 'first-of-month') {
    const todayParts = isoToJalali(today)
    const lastParts = isoToJalali(lastMileageUpdate)

    if (todayParts.day !== 1) return false

    return (
      lastParts.year !== todayParts.year ||
      lastParts.month !== todayParts.month ||
      lastMileageUpdate < today
    )
  }

  const days = intervalToDays(interval)

  if (days == null) return false

  return diffIsoDays(lastMileageUpdate, today) >= days
}

export function validateMileageIncrease(
  nextMileage: number,
  currentMileage: number,
  minimumMileage = 0
): string | null {
  if (!Number.isFinite(nextMileage) || nextMileage <= 0) {
    return 'کارکرد باید عدد مثبت باشد'
  }

  if (nextMileage < minimumMileage) {
    return `کارکرد نمی‌تواند کمتر از ${minimumMileage.toLocaleString('fa-IR')} km باشد`
  }

  if (nextMileage < currentMileage) {
    return 'کارکرد جدید نمی‌تواند کمتر از کارکرد فعلی باشد'
  }

  return null
}

export function validateVehicleMileageEntry(
  mileage: number,
  currentMileage: number,
  options?: { isHistorical?: boolean; minimumMileage?: number }
): string | null {
  const { isHistorical = false, minimumMileage } = options ?? {}

  if (!Number.isFinite(mileage) || mileage <= 0) {
    return 'کارکرد باید عدد مثبت باشد'
  }

  if (isHistorical) return null

  return validateMileageIncrease(mileage, currentMileage, minimumMileage ?? currentMileage)
}
