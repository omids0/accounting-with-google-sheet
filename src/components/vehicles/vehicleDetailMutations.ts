import type {
  VehicleCompleteFormState,
  VehicleDeadlineFormState,
  VehicleMechanicFormState,
  VehicleMileageFormState,
  VehiclePeriodicFormState,
  VehicleProfileWithRow,
  VehicleDeleteTarget
} from './types'
import { calculateNextKm, validateMileageIncrease } from './utils'
import {
  completePeriodicService,
  renewVehicleDeadline,
  saveMechanicVisit,
  syncVehicleMileage
} from '../../services/vehicleActions'
import {
  createVehicleDeadline,
  deleteVehicleDeadline,
  updateVehicleDeadline
} from '../../services/vehicleDeadlines'
import { createVehicleExpense, deleteVehicleExpense } from '../../services/vehicleExpenses'
import { createVehicleHistoryEntry, deleteVehicleHistoryEntry } from '../../services/vehicleHistory'
import {
  createVehiclePeriodicService,
  deleteVehiclePeriodicService,
  updateVehiclePeriodicService
} from '../../services/vehiclePeriodicServices'
import { updateVehicleMileage } from '../../services/vehicleProfiles'
import type {
  VehicleDeadline,
  VehicleHistoryEntry,
  VehiclePeriodicService
} from '../../types/vehicles'
import { getTodayIso } from '../../utils/jalaliDate'
import { parseNumeric } from '../../utils/parseNumeric'

type PeriodicWithRow = VehiclePeriodicService & { rowNumber: number }
type DeadlineWithRow = VehicleDeadline & { rowNumber: number }
type HistoryWithRow = VehicleHistoryEntry & { rowNumber: number }

export async function submitPeriodicForm(params: {
  spreadsheetId: string
  vehicle: VehicleProfileWithRow
  values: VehiclePeriodicFormState
  editingPeriodic: PeriodicWithRow | null
}): Promise<void> {
  const { spreadsheetId, vehicle, values, editingPeriodic } = params
  const mileage = parseNumeric(values.mileage)
  const intervalKm = parseNumeric(values.intervalKm)
  const amount = parseNumeric(values.amount)
  const nextKm = calculateNextKm(mileage, intervalKm)

  if (editingPeriodic) {
    await updateVehiclePeriodicService(spreadsheetId, editingPeriodic.rowNumber, {
      serviceType: values.serviceType.trim(),
      currentMileage: mileage,
      intervalKm,
      nextKm,
      brand: values.brand.trim(),
      location: values.location.trim(),
      amount,
      notes: values.notes.trim()
    })

    if (mileage !== vehicle.mileage) {
      await updateVehicleMileage(spreadsheetId, vehicle.rowNumber, mileage, values.date)
    }

    return
  }

  const expenseRecordId =
    amount > 0
      ? await createVehicleExpense(spreadsheetId, {
          title: `${values.serviceType} — ${vehicle.title}`,
          amount,
          date: values.date,
          note: [values.brand, values.location, values.notes].filter(Boolean).join(' · ')
        })
      : ''

  const created = await createVehiclePeriodicService(spreadsheetId, {
    vehicleId: vehicle.id,
    serviceType: values.serviceType.trim(),
    currentMileage: mileage,
    intervalKm,
    nextKm,
    brand: values.brand.trim(),
    location: values.location.trim(),
    amount,
    notes: values.notes.trim(),
    expenseRecordId
  })

  if (values.date) {
    await createVehicleHistoryEntry(spreadsheetId, {
      vehicleId: vehicle.id,
      recordKind: 'periodic',
      referenceId: created.id,
      date: values.date,
      mileage,
      nextKm,
      details: [values.serviceType, values.brand, values.location, values.notes]
        .filter(Boolean)
        .join(' · '),
      amount,
      expenseRecordId
    })
  }

  if (mileage !== vehicle.mileage) {
    await updateVehicleMileage(spreadsheetId, vehicle.rowNumber, mileage, values.date)
  }
}

export async function submitCompleteForm(params: {
  spreadsheetId: string
  vehicle: VehicleProfileWithRow
  completingPeriodic: PeriodicWithRow
  values: VehicleCompleteFormState
}): Promise<void> {
  const { spreadsheetId, vehicle, completingPeriodic, values } = params

  await completePeriodicService({
    spreadsheetId,
    vehicle,
    rowNumber: completingPeriodic.rowNumber,
    serviceType: completingPeriodic.serviceType,
    serviceId: completingPeriodic.id,
    mileage: parseNumeric(values.mileage),
    intervalKm: parseNumeric(values.intervalKm),
    brand: values.brand.trim(),
    location: values.location.trim(),
    amount: parseNumeric(values.amount),
    notes: values.notes.trim(),
    date: values.date || getTodayIso(),
    previousExpenseId: completingPeriodic.expenseRecordId
  })
}

export async function submitDeadlineForm(params: {
  spreadsheetId: string
  vehicle: VehicleProfileWithRow
  values: VehicleDeadlineFormState
  editingDeadline: DeadlineWithRow | null
  renewingDeadline: boolean
}): Promise<void> {
  const { spreadsheetId, vehicle, values, editingDeadline, renewingDeadline } = params
  const amount = parseNumeric(values.amount)

  if (renewingDeadline && editingDeadline) {
    await renewVehicleDeadline({
      spreadsheetId,
      vehicle,
      rowNumber: editingDeadline.rowNumber,
      deadlineId: editingDeadline.id,
      category: values.category.trim(),
      startDate: values.startDate,
      endDate: values.endDate,
      amount,
      notes: values.notes.trim(),
      date: values.startDate,
      previousExpenseId: editingDeadline.expenseRecordId
    })

    return
  }

  if (editingDeadline) {
    await updateVehicleDeadline(spreadsheetId, editingDeadline.rowNumber, {
      category: values.category.trim(),
      startDate: values.startDate,
      endDate: values.endDate,
      amount,
      notes: values.notes.trim()
    })

    return
  }

  const expenseRecordId =
    amount > 0
      ? await createVehicleExpense(spreadsheetId, {
          title: `${values.category} — ${vehicle.title}`,
          amount,
          date: values.endDate,
          note: values.notes
        })
      : ''

  await createVehicleDeadline(spreadsheetId, {
    vehicleId: vehicle.id,
    category: values.category.trim(),
    startDate: values.startDate,
    endDate: values.endDate,
    amount,
    notes: values.notes.trim(),
    expenseRecordId
  })
}

export async function submitMechanicForm(params: {
  spreadsheetId: string
  vehicle: VehicleProfileWithRow
  values: VehicleMechanicFormState
}): Promise<void> {
  const { spreadsheetId, vehicle, values } = params
  const items = values.items
    .map(item => ({ category: item.category.trim(), note: item.note.trim() }))
    .filter(item => item.category)

  await saveMechanicVisit({
    spreadsheetId,
    vehicle,
    date: values.date,
    mileage: parseNumeric(values.mileage),
    location: values.location.trim(),
    totalAmount: parseNumeric(values.totalAmount),
    items,
    notes: values.notes.trim()
  })
}

export async function submitMileageForm(params: {
  spreadsheetId: string
  vehicle: VehicleProfileWithRow
  values: VehicleMileageFormState
}): Promise<void> {
  const { spreadsheetId, vehicle, values } = params

  await syncVehicleMileage(spreadsheetId, vehicle, parseNumeric(values.mileage))
}

export async function deleteVehicleDetailItem(params: {
  spreadsheetId: string
  target: VehicleDeleteTarget
  deleteLinkedExpense: boolean
}): Promise<void> {
  const { spreadsheetId, target, deleteLinkedExpense } = params
  const expenseId = target.item.expenseRecordId

  if (deleteLinkedExpense && expenseId) {
    await deleteVehicleExpense(spreadsheetId, expenseId)
  }

  if (target.kind === 'periodic') {
    await deleteVehiclePeriodicService(spreadsheetId, target.item.rowNumber)
  } else if (target.kind === 'deadline') {
    await deleteVehicleDeadline(spreadsheetId, target.item.rowNumber)
  } else {
    await deleteVehicleHistoryEntry(spreadsheetId, target.item.rowNumber)
  }
}

export function validatePeriodicMileage(
  mileage: number,
  vehicle: VehicleProfileWithRow,
  intervalKm: number
): string | null {
  if (intervalKm <= 0) return 'فاصله سرویس باید بیشتر از صفر باشد'

  return validateMileageIncrease(mileage, vehicle.mileage, vehicle.mileage)
}

export type { PeriodicWithRow, DeadlineWithRow, HistoryWithRow }
