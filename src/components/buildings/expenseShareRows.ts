import { sharesOfRecord } from '../../services/buildingExpenses'
import type { BuildingUnit } from '../../services/buildingUnits'
import { paidAmount } from '../../services/receivablesRow'
import type { Receivable } from '../../types'

export { parseSplit } from '../../services/buildingExpenseSplit'

export type ShareStatus = 'paid' | 'partial' | 'open'

export interface ShareStatusRow {
  reference: string
  unitNumber: string
  debtor: string
  amount: number
  status: ShareStatus
}

/** The unit shares one expense issued, in unit order, with whether each is open, partly or fully paid. */
export function sharesOfRecordStatus(
  recordId: string,
  receivables: Receivable[],
  units: Pick<BuildingUnit, 'id' | 'number'>[]
): ShareStatusRow[] {
  const order = new Map(units.map((unit, index) => [unit.id, index]))

  const numbers = new Map(units.map(unit => [unit.id, unit.number]))

  return sharesOfRecord(receivables, recordId)
    .map(item => {
      const reference = item.reference ?? ''

      const unitId = reference.split(':')[1] ?? ''

      const paid = paidAmount(item)

      return {
        unitId,
        reference,
        unitNumber: numbers.get(unitId) ?? '؟',
        debtor: item.debtor,
        amount: item.amount,
        status: (paid >= item.amount ? 'paid' : paid > 0 ? 'partial' : 'open') as ShareStatus
      }
    })
    .sort((a, b) => (order.get(a.unitId) ?? 0) - (order.get(b.unitId) ?? 0))
    .map(({ unitId: _unitId, ...row }) => row)
}
