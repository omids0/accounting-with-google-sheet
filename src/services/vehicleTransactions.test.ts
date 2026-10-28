import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  meta: vi.fn(),
  history: vi.fn(),
  periodics: vi.fn(),
  visits: vi.fn(),
  records: vi.fn(),
  settings: vi.fn()
}))

vi.mock('./settings', () => ({ getSettings: mocks.settings }))
vi.mock('./sheets', () => ({ fetchRecords: mocks.records }))
vi.mock('./vehicleExpenseRecords', () => ({ fetchVehicleExpenseMetaByVehicle: mocks.meta }))
vi.mock('./vehicleHistory', () => ({ fetchVehicleHistory: mocks.history }))
vi.mock('./vehiclePeriodicServices', () => ({ fetchVehiclePeriodicServices: mocks.periodics }))
vi.mock('./vehicleMechanicVisits', () => ({ fetchVehicleMechanicVisits: mocks.visits }))

const { buildVehicleExpenseTypeBreakdown, fetchVehicleTransactions, sumVehicleTransactionAmounts } =
  await import('./vehicleTransactions')

const record = (id: string, amount: number) => ({
  id,
  rowNumber: 2,
  createdAt: '',
  sheetName: 'هزینه',
  values: { date: '1405/08/01', title: id, amount: String(amount) }
})

const history = (id: string, expenseRecordId: string, amount: number) => ({
  id,
  vehicleId: 'v1',
  createdAt: '',
  recordKind: 'periodic',
  referenceId: 's1',
  date: '1405/08/01',
  mileage: 100,
  nextKm: 200,
  details: 'تعویض روغن',
  amount,
  expenseRecordId
})

const periodic = (id: string, expenseRecordId: string, amount: number) => ({
  id,
  vehicleId: 'v1',
  createdAt: '1405/08/01, 10:00',
  serviceType: 'تعویض روغن',
  currentMileage: 100,
  amount,
  expenseRecordId
})

const visit = (id: string, expenseRecordId: string, totalAmount: number) => ({
  id,
  vehicleId: 'v1',
  createdAt: '',
  date: '1405/08/02',
  mileage: 110,
  totalAmount,
  expenseRecordId
})

describe('fetchVehicleTransactions counts an expense once', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.settings.mockReturnValue({ forms: [{ type: 'expense', sheetName: 'هزینه' }] })
    mocks.meta.mockResolvedValue([])
    mocks.history.mockResolvedValue([])
    mocks.periodics.mockResolvedValue([])
    mocks.visits.mockResolvedValue([])
    mocks.records.mockResolvedValue([])
  })

  it('shows one line and one amount when history, service and visit share the expense', async () => {
    mocks.records.mockResolvedValue([record('e1', 10_350_000)])
    mocks.history.mockResolvedValue([history('h1', 'e1', 10_350_000)])
    mocks.periodics.mockResolvedValue([periodic('p1', 'e1', 10_350_000)])
    mocks.visits.mockResolvedValue([visit('m1', 'e1', 10_350_000)])

    const items = await fetchVehicleTransactions('sheet', 'v1')

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ id: 'h1', source: 'history', expenseRecordId: 'e1' })
    expect(sumVehicleTransactionAmounts(items)).toBe(10_350_000)
    expect(buildVehicleExpenseTypeBreakdown(items)).toEqual([
      { name: 'تعویض روغن', total: 10_350_000 }
    ])
  })

  it('counts a service whose history line is missing through its periodic row', async () => {
    mocks.records.mockResolvedValue([record('e1', 500)])
    mocks.periodics.mockResolvedValue([periodic('p1', 'e1', 500)])

    expect(sumVehicleTransactionAmounts(await fetchVehicleTransactions('sheet', 'v1'))).toBe(500)
  })

  it('keeps different expenses apart', async () => {
    mocks.records.mockResolvedValue([record('e1', 100), record('e2', 40), record('e3', 7)])
    mocks.history.mockResolvedValue([history('h1', 'e1', 100)])
    mocks.periodics.mockResolvedValue([periodic('p1', 'e1', 100), periodic('p2', 'e2', 40)])
    mocks.visits.mockResolvedValue([visit('m1', 'e3', 7)])

    expect(sumVehicleTransactionAmounts(await fetchVehicleTransactions('sheet', 'v1'))).toBe(147)
  })

  it('leaves out lines with no expense behind them and the ones whose expense is gone', async () => {
    mocks.records.mockResolvedValue([record('e2', 30)])
    mocks.history.mockResolvedValue([
      history('h1', '', 999),
      history('h2', 'deleted', 888),
      history('h3', 'e2', 30)
    ])

    const items = await fetchVehicleTransactions('sheet', 'v1')

    expect(items.map(item => item.id)).toEqual(['h3'])
  })

  it('takes the amount from the expense record, which the user may have edited', async () => {
    mocks.records.mockResolvedValue([record('e1', 120)])
    mocks.history.mockResolvedValue([history('h1', 'e1', 100)])

    expect(sumVehicleTransactionAmounts(await fetchVehicleTransactions('sheet', 'v1'))).toBe(120)
  })

  it('does not drop lines while the expense form is not loaded', async () => {
    mocks.settings.mockReturnValue(null)
    mocks.history.mockResolvedValue([history('h1', 'e1', 100)])

    expect(sumVehicleTransactionAmounts(await fetchVehicleTransactions('sheet', 'v1'))).toBe(100)
  })

  it('counts a fuel expense once even if two meta rows point at it', async () => {
    mocks.records.mockResolvedValue([record('e1', 60)])
    mocks.meta.mockResolvedValue([
      { id: 'a', expenseRecordId: 'e1', expenseType: 'بنزین', fuelLiters: 2, rowNumber: 2 },
      { id: 'b', expenseRecordId: 'e1', expenseType: 'بنزین', fuelLiters: 2, rowNumber: 3 }
    ])

    expect(sumVehicleTransactionAmounts(await fetchVehicleTransactions('sheet', 'v1'))).toBe(60)
  })
})
