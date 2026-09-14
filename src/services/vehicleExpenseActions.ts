import { createLinkedExpenseRecord, deleteLinkedRecord } from './paymentTransactions'
import { getSettings } from './settings'
import { fetchRecords, updateRecord } from './sheets'
import {
  createVehicleExpenseMeta,
  deleteVehicleExpenseMeta,
  findVehicleExpenseMetaByRecordId,
  fetchVehicleExpenseMetaByVehicle,
  updateVehicleExpenseMeta,
  type VehicleExpenseMetaWithRow
} from './vehicleExpenseRecords'
import { ensureVehicleExpenseCategory } from './vehicleExpenses'
import { fetchVehicles, updateVehicleMileage } from './vehicleProfiles'
import { VEHICLE_OTHER_OPTION } from '../components/vehicles/constants'
import type { VehicleExpenseMeta } from '../types/vehicles'
import {
  buildVehicleExpenseTitle,
  calculateFuelLiters,
  isFuelExpenseType,
  isVehicleExpenseCategory,
  parseNumericField,
  type VehicleExpenseFormValues
} from '../utils/vehicleExpenseUtils'

export type VehicleExpenseInput = VehicleExpenseFormValues & {
  date: string
  amount: number
  note?: string
}

function resolveVehicleTitle(vehicleId: string, vehicles: { id: string; title: string }[]): string {
  return vehicles.find(item => item.id === vehicleId)?.title ?? ''
}

function validateVehicleExpenseInput(input: VehicleExpenseInput): {
  isFuel: boolean
  fuelPricePerLiter: number
  mileage: number
  fuelLiters: number
  amount: number
  expenseType: string
} {
  const amount = parseNumericField(input.amount)
  const expenseType = input.expenseType.trim()
  const isFuel = isFuelExpenseType(expenseType)
  const fuelPricePerLiter = isFuel ? parseNumericField(input.fuelPricePerLiter) : 0
  const mileage = isFuel ? parseNumericField(input.mileage) : 0
  const fuelLiters = isFuel ? calculateFuelLiters(amount, fuelPricePerLiter) : 0

  if (isFuel && fuelPricePerLiter <= 0) {
    throw new Error('نرخ هر لیتر بنزین باید بیشتر از صفر باشد')
  }
  if (isFuel && mileage <= 0) {
    throw new Error('کارکرد خودرو الزامی است')
  }

  return { isFuel, fuelPricePerLiter, mileage, fuelLiters, amount, expenseType }
}

export async function resolveMileageAfterFuelDelete(
  spreadsheetId: string,
  vehicleId: string,
  deletedMeta: VehicleExpenseMeta
): Promise<number | null> {
  if (!vehicleId || !isFuelExpenseType(deletedMeta.expenseType)) return null

  const fuelItems = (await fetchVehicleExpenseMetaByVehicle(spreadsheetId, vehicleId))
    .filter(item => isFuelExpenseType(item.expenseType) && item.id !== deletedMeta.id)
    .sort((a, b) => b.mileage - a.mileage)

  return fuelItems[0]?.mileage ?? null
}

async function syncVehicleMileageAfterFuel(
  spreadsheetId: string,
  vehicleId: string,
  mileage: number,
  date: string
): Promise<void> {
  if (!vehicleId || mileage <= 0) return

  const vehicles = await fetchVehicles(spreadsheetId)
  const vehicle = vehicles.find(item => item.id === vehicleId)

  if (!vehicle) return

  if (mileage >= vehicle.mileage) {
    await updateVehicleMileage(spreadsheetId, vehicle.rowNumber, mileage, date)
  }
}

async function deleteVehicleExpenseMetadataOnly(
  spreadsheetId: string,
  meta: VehicleExpenseMetaWithRow
): Promise<void> {
  const rollbackMileage =
    meta.vehicleId && isFuelExpenseType(meta.expenseType)
      ? await resolveMileageAfterFuelDelete(spreadsheetId, meta.vehicleId, meta)
      : null

  await deleteVehicleExpenseMeta(spreadsheetId, meta.rowNumber)

  if (rollbackMileage !== null && meta.vehicleId) {
    const vehicles = await fetchVehicles(spreadsheetId)
    const vehicle = vehicles.find(item => item.id === meta.vehicleId)

    if (vehicle) {
      await updateVehicleMileage(spreadsheetId, vehicle.rowNumber, rollbackMileage)
    }
  }
}

export async function createManualVehicleExpense(
  spreadsheetId: string,
  input: VehicleExpenseInput
): Promise<string> {
  await ensureVehicleExpenseCategory()

  const vehicles = await fetchVehicles(spreadsheetId)
  const isOther = !input.vehicleId || input.vehicleId === VEHICLE_OTHER_OPTION
  const vehicleTitle = isOther ? '' : resolveVehicleTitle(input.vehicleId, vehicles)
  const { isFuel, fuelPricePerLiter, mileage, fuelLiters, amount, expenseType } =
    validateVehicleExpenseInput(input)

  const title = buildVehicleExpenseTitle(expenseType, vehicleTitle, isOther)

  const expenseRecordId = await createLinkedExpenseRecord(spreadsheetId, {
    title,
    amount,
    category: 'خودرو',
    note: input.note ?? '',
    date: input.date
  })

  await createVehicleExpenseMeta(spreadsheetId, {
    expenseRecordId,
    vehicleId: isOther ? '' : input.vehicleId,
    expenseType,
    fuelPricePerLiter,
    fuelLiters,
    mileage
  })

  if (isFuel && !isOther) {
    await syncVehicleMileageAfterFuel(spreadsheetId, input.vehicleId, mileage, input.date)
  }

  return expenseRecordId
}

export async function upsertManualVehicleExpenseMeta(
  spreadsheetId: string,
  expenseRecordId: string,
  input: VehicleExpenseInput
): Promise<void> {
  const vehicles = await fetchVehicles(spreadsheetId)
  const isOther = !input.vehicleId || input.vehicleId === VEHICLE_OTHER_OPTION
  const vehicleTitle = isOther ? '' : resolveVehicleTitle(input.vehicleId, vehicles)
  const { isFuel, fuelPricePerLiter, mileage, fuelLiters, amount, expenseType } =
    validateVehicleExpenseInput(input)

  const title = buildVehicleExpenseTitle(expenseType, vehicleTitle, isOther)
  const expenseForm = getSettings()?.forms.find(form => form.type === 'expense')

  if (!expenseForm) throw new Error('فرم هزینه پیدا نشد')

  const records = await fetchRecords(spreadsheetId, expenseForm)
  const record = records.find(item => item.id === expenseRecordId)

  if (!record) throw new Error('تراکنش هزینه یافت نشد')

  await updateRecord(spreadsheetId, expenseForm, record.rowNumber, record.id, record.createdAt, {
    date: input.date,
    title,
    category: 'خودرو',
    amount,
    note: input.note ?? record.values.note ?? ''
  })

  const existing = await findVehicleExpenseMetaByRecordId(spreadsheetId, expenseRecordId)
  const metaPayload = {
    vehicleId: isOther ? '' : input.vehicleId,
    expenseType,
    fuelPricePerLiter,
    fuelLiters,
    mileage
  }

  if (existing) {
    await updateVehicleExpenseMeta(spreadsheetId, existing.rowNumber, metaPayload)
  } else {
    await createVehicleExpenseMeta(spreadsheetId, {
      expenseRecordId,
      ...metaPayload
    })
  }

  if (isFuel && !isOther) {
    await syncVehicleMileageAfterFuel(spreadsheetId, input.vehicleId, mileage, input.date)
  } else if (existing?.vehicleId && isFuelExpenseType(existing.expenseType) && !isFuel) {
    const rollbackMileage = await resolveMileageAfterFuelDelete(
      spreadsheetId,
      existing.vehicleId,
      existing
    )

    if (rollbackMileage !== null) {
      const vehicle = vehicles.find(item => item.id === existing.vehicleId)

      if (vehicle) {
        await updateVehicleMileage(spreadsheetId, vehicle.rowNumber, rollbackMileage, input.date)
      }
    }
  }
}

export async function deleteVehicleExpenseMetadataByRecordId(
  spreadsheetId: string,
  expenseRecordId: string
): Promise<void> {
  const meta = await findVehicleExpenseMetaByRecordId(spreadsheetId, expenseRecordId)

  if (!meta) return

  await deleteVehicleExpenseMetadataOnly(spreadsheetId, meta)
}

export async function deleteManualVehicleExpense(
  spreadsheetId: string,
  expenseRecordId: string
): Promise<void> {
  await deleteVehicleExpenseMetadataByRecordId(spreadsheetId, expenseRecordId)
  await deleteLinkedRecord(spreadsheetId, 'expense', expenseRecordId)
}

export async function handleExpenseRecordDeleted(
  spreadsheetId: string,
  expenseRecordId: string,
  category: string
): Promise<void> {
  if (!isVehicleExpenseCategory(category)) return

  await deleteVehicleExpenseMetadataByRecordId(spreadsheetId, expenseRecordId)
}

export async function handleExpenseRecordUpdated(
  spreadsheetId: string,
  expenseRecordId: string,
  category: string,
  input: VehicleExpenseInput
): Promise<void> {
  if (!isVehicleExpenseCategory(category)) {
    await deleteVehicleExpenseMetadataByRecordId(spreadsheetId, expenseRecordId)

    return
  }

  await upsertManualVehicleExpenseMeta(spreadsheetId, expenseRecordId, input)
}

export function metaToFormValues(meta: VehicleExpenseMeta): VehicleExpenseFormValues {
  return {
    vehicleId: meta.vehicleId || VEHICLE_OTHER_OPTION,
    expenseType: meta.expenseType,
    fuelPricePerLiter: meta.fuelPricePerLiter > 0 ? meta.fuelPricePerLiter : '',
    mileage: meta.mileage > 0 ? meta.mileage : ''
  }
}
