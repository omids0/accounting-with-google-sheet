import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchVehiclePeriodicServices, updateVehiclePeriodicService, createVehicleHistoryEntry } =
  vi.hoisted(() => ({
    fetchVehiclePeriodicServices: vi.fn(),
    updateVehiclePeriodicService: vi.fn(),
    createVehicleHistoryEntry: vi.fn()
  }))

vi.mock('./vehiclePeriodicServices', () => ({
  fetchVehiclePeriodicServices,
  updateVehiclePeriodicService
}))

vi.mock('./vehicleHistory', () => ({ createVehicleHistoryEntry }))

const { renewPeriodicFromExpense } = await import('./vehiclePeriodicRenewal')

const SERVICE = {
  id: 's1',
  vehicleId: 'v1',
  rowNumber: 3,
  serviceType: 'تعویض روغن',
  intervalKm: 5000,
  brand: 'شل',
  location: '',
  notes: ''
}

const PARAMS = {
  vehicleId: 'v1',
  serviceId: 's1',
  expenseRecordId: 'e1',
  amount: 900000,
  mileage: 142000,
  date: '1405/07/28'
}

describe('renewPeriodicFromExpense', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchVehiclePeriodicServices.mockResolvedValue([SERVICE])
  })

  it('points the service and its history line at the expense that was entered', async () => {
    await renewPeriodicFromExpense('sheet', PARAMS)

    expect(updateVehiclePeriodicService).toHaveBeenCalledWith('sheet', 3, {
      currentMileage: 142000,
      nextKm: 147000,
      amount: 900000,
      expenseRecordId: 'e1'
    })
    expect(createVehicleHistoryEntry).toHaveBeenCalledWith(
      'sheet',
      expect.objectContaining({
        recordKind: 'periodic',
        referenceId: 's1',
        expenseRecordId: 'e1',
        nextKm: 147000,
        details: 'تعویض روغن · شل'
      })
    )
  })

  it('does nothing without a mileage or when the service is gone', async () => {
    await renewPeriodicFromExpense('sheet', { ...PARAMS, mileage: 0 })
    await renewPeriodicFromExpense('sheet', { ...PARAMS, serviceId: 'other' })

    expect(updateVehiclePeriodicService).not.toHaveBeenCalled()
    expect(createVehicleHistoryEntry).not.toHaveBeenCalled()
  })
})
