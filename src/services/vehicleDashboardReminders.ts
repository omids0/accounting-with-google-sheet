import type { DashboardReminderItem } from './dashboardReminders'
import type { DueDateStatus } from './reports'
import { fetchAllVehicleDeadlines } from './vehicleDeadlines'
import { fetchAllVehiclePeriodicServices } from './vehiclePeriodicServices'
import { fetchVehicles } from './vehicleProfiles'
import {
  buildDeadlineListItem,
  buildPeriodicListItem,
  sortActiveItems
} from '../components/vehicles/utils'
import { addDaysToIso, getTodayIso } from '../utils/jalaliDate'

function mapUrgencyToStatus(urgency: 'overdue' | 'soon' | 'ok'): DueDateStatus {
  if (urgency === 'overdue') return 'overdue'
  if (urgency === 'soon') return 'upcoming'

  return 'upcoming'
}

function resolveDueDate(
  item: ReturnType<typeof buildPeriodicListItem> | ReturnType<typeof buildDeadlineListItem>
): string {
  const today = getTodayIso().slice(0, 10)

  if (item.kind === 'deadline' && item.deadline?.endDate) {
    return item.deadline.endDate.slice(0, 10)
  }

  if (item.urgency === 'overdue') return today

  return addDaysToIso(today, 7).slice(0, 10)
}

export async function fetchVehicleDashboardReminderItems(
  spreadsheetId: string
): Promise<DashboardReminderItem[]> {
  const [vehicles, periodics, deadlines] = await Promise.all([
    fetchVehicles(spreadsheetId),
    fetchAllVehiclePeriodicServices(spreadsheetId),
    fetchAllVehicleDeadlines(spreadsheetId)
  ])

  const vehicleTitleById = new Map(vehicles.map(vehicle => [vehicle.id, vehicle.title]))
  const reminders: DashboardReminderItem[] = []

  for (const vehicle of vehicles) {
    if (!vehicle.active) continue

    const activeItems = sortActiveItems([
      ...periodics
        .filter(item => item.vehicleId === vehicle.id && item.active)
        .map(item => buildPeriodicListItem(item, vehicle.mileage)),
      ...deadlines
        .filter(item => item.vehicleId === vehicle.id && item.active)
        .map(item => buildDeadlineListItem(item))
    ])

    for (const item of activeItems) {
      if (item.urgency === 'ok') continue

      const vehicleTitle = vehicleTitleById.get(item.vehicleId) ?? 'خودرو'
      const kindLabel = item.kind === 'periodic' ? 'سرویس دوره‌ای' : 'موعد خودرو'

      reminders.push({
        id: `vehicle_${item.kind}_${item.id}`,
        kind: 'vehicle',
        kindLabel,
        title: `${vehicleTitle} — ${item.title}`,
        subtitle: item.subtitle,
        dueDate: resolveDueDate(item),
        amount: item.kind === 'periodic' ? item.periodic?.amount ?? 0 : item.deadline?.amount ?? 0,
        status: mapUrgencyToStatus(item.urgency)
      })
    }
  }

  return reminders
}
