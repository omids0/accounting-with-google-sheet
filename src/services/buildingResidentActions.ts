import { logActivity } from './activityLog'
import { unitOpenReceivables } from './buildingCharges'
import {
  createStays,
  currentOwner,
  newStay,
  updateStay,
  type StayWithRow
} from './buildingResidents'
import { updateUnit, type UnitWithRow } from './buildingUnits'
import { updateReceivable } from './receivablesCrud'
import { paidAmount } from './receivablesRow'
import type { DebtMode, ResidentRole } from '../components/buildings/buildingOptions'
import type { Counterparty, Receivable } from '../types'
import { formatAmountWords } from '../utils/insightText'
import { getTodayIso } from '../utils/jalaliDate'
import { toPersianDigits } from '../utils/normalizeDigits'

type Person = Counterparty & { rowNumber: number }

type ReceivableWithRow = Receivable & { rowNumber: number }

/** Who comes in: a counterparty of the building (id and the name receivables show). */
export interface IncomingPerson {
  id: string
  name: string
}

/** What the sheet already loaded; the service writes, it does not fetch. */
export interface ResidentContext {
  units: UnitWithRow[]
  stays: StayWithRow[]
  persons: Person[]
  receivables: ReceivableWithRow[]
}

const openStayOf = (stays: StayWithRow[], unitId: string, role: ResidentRole) =>
  stays.find(s => s.unitId === unitId && s.role === role && s.active && !s.to)

/**
 * Writes off what is still unpaid on a receivable the way the owner asked for a forgiven debt:
 * the amount drops to what was paid and a zero-amount payment carries the note «بخشودگی» (no
 * income record is made, so no money appears in the fund).
 */
async function forgiveReceivable(spreadsheetId: string, item: ReceivableWithRow, date: string) {
  const forgiven = item.amount - paidAmount(item)

  await updateReceivable(
    spreadsheetId,
    item.rowNumber,
    {
      ...item,
      amount: paidAmount(item),
      payments: [
        ...item.payments,
        { id: crypto.randomUUID(), amount: 0, paidAt: date, note: `بخشودگی ${forgiven}` }
      ]
    },
    false
  )

  return forgiven
}

/** What happens to the unit's open receivables when the resident changes. */
async function settleDebts(
  spreadsheetId: string,
  unit: UnitWithRow,
  mode: DebtMode,
  date: string,
  context: ResidentContext,
  ownerId: string | undefined
) {
  const open = unitOpenReceivables(unit.id, context.receivables)

  if (mode === 'keep' || !open.length) return

  if (mode === 'to-owner') {
    const owner = context.persons.find(person => person.id === ownerId)

    if (!owner) return
    const name = [owner.firstName, owner.lastName].filter(Boolean).join(' ')

    for (const item of open) {
      await updateReceivable(spreadsheetId, item.rowNumber, {
        ...item,
        debtor: name,
        debtorId: owner.id
      })
    }

    return
  }

  let total = 0

  for (const item of open) total += await forgiveReceivable(spreadsheetId, item, date)

  logActivity(spreadsheetId, {
    action: 'update',
    module: 'receivables',
    itemId: unit.id,
    summary: `بدهی واحد ${toPersianDigits(unit.number)} (${formatAmountWords(total)}) را بخشید`
  })
}

/**
 * Moves a new person into a unit: closes the open stay of the same role with the exit date,
 * opens the new stay, brings the unit's occupancy in line, and settles the unit's open
 * receivables as `debtMode` says — «keep» leaves them with the previous debtor, «to-owner»
 * re-points their debtor id and name at the owner, «forgive» writes them off.
 */
export async function changeResident(
  spreadsheetId: string,
  unitId: string,
  person: IncomingPerson,
  role: ResidentRole,
  fromDate: string,
  debtMode: DebtMode,
  context: ResidentContext
): Promise<void> {
  const unit = context.units.find(item => item.id === unitId)

  if (!unit) throw new Error('unit not found')

  const previous = openStayOf(context.stays, unitId, role)

  if (previous?.personId === person.id) return

  if (previous) {
    await updateStay(spreadsheetId, previous.rowNumber, {
      ...previous,
      to: fromDate,
      active: false
    })
  }
  await createStays(spreadsheetId, [newStay({ unitId, personId: person.id, role, from: fromDate })])

  const stillLet = role === 'owner' && !!openStayOf(context.stays, unitId, 'tenant')

  const occupancy = role === 'tenant' || stillLet ? 'tenant' : 'owner-resident'

  if (occupancy !== unit.occupancy)
    await updateUnit(spreadsheetId, unit.rowNumber, { ...unit, occupancy })

  const owner = role === 'owner' ? person.id : currentOwner(unitId, context.stays)?.personId

  await settleDebts(spreadsheetId, unit, debtMode, fromDate, context, owner)
}

/**
 * «خروج»: a tenant's stay closes with the exit date; an owner who lived there keeps the unit
 * (the owner's stay is the ownership) and only the occupancy changes. Either way the unit
 * becomes vacant.
 */
export async function exitResident(
  spreadsheetId: string,
  unit: UnitWithRow,
  stay: StayWithRow,
  date = getTodayIso()
): Promise<void> {
  if (stay.role === 'tenant') {
    await updateStay(spreadsheetId, stay.rowNumber, { ...stay, to: date, active: false })
  }
  await updateUnit(spreadsheetId, unit.rowNumber, { ...unit, occupancy: 'vacant' })
}
