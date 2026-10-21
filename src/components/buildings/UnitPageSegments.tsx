import type { ReactNode } from 'react'

import { optionLabel, RESIDENT_ROLES } from './buildingOptions'
import type { UnitRowData } from './unitRows'
import { CREDIT_REFERENCE_PREFIX } from '../../services/buildingCharges'
import type { StayWithRow } from '../../services/buildingResidents'
import { itemLabel } from '../../services/buildingStatement'
import { unitOfReference } from '../../services/buildingSummary'
import { getCounterpartyFullName } from '../../services/counterparties'
import { paidAmount, remainingAmount } from '../../services/receivablesRow'
import type { Counterparty, Receivable } from '../../types'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { toPersianDigits } from '../../utils/normalizeDigits'
import MoneyText from '../MoneyText'
import {
  buildingRowTitleClass,
  buildingRowSubClass,
  buildingRowEndClass,
  buildingDayBadgeClass
} from '../ui/buildingStyles'
import { calmListClass, calmRowClass, calmRowMainClass } from '../ui/calmListStyles'

const fa = (value: number) => toPersianDigits(String(value))

/** «سابقه»: every charge, share, previous debt and credit of the unit, newest first. */
export function UnitHistory({
  unitId,
  receivables
}: {
  unitId: string
  receivables: Receivable[]
}) {
  const rows = receivables
    .filter(
      item =>
        unitOfReference(item.reference ?? '') === unitId ||
        item.reference === `${CREDIT_REFERENCE_PREFIX}${unitId}`
    )
    .sort((a, b) => b.borrowDate.localeCompare(a.borrowDate))

  if (!rows.length) {
    return <p className="m-0 py-3 text-center text-sm text-muted">سابقه‌ای نیست</p>
  }

  return (
    <ul className={calmListClass}>
      {rows.map(item => {
        const credit = item.reference?.startsWith(CREDIT_REFERENCE_PREFIX)

        const open = remainingAmount(item)

        return (
          <li key={item.id} className={calmRowClass}>
            <span className={calmRowMainClass}>
              <span className={buildingRowTitleClass}>{credit ? item.title : itemLabel(item)}</span>
              <span className={buildingRowSubClass}>
                {credit
                  ? `اعتبار مانده ${open ? '' : '· مصرف شد'}`
                  : open <= 0
                  ? 'تسویه شد'
                  : paidAmount(item) > 0
                  ? 'ناقص'
                  : 'باز'}
                {' · '}
                {formatIsoDatePersian(item.borrowDate)}
              </span>
            </span>
            <span
              className={`${buildingRowEndClass} ${
                credit || open <= 0 ? 'text-success' : 'text-danger'
              }`}
            >
              <MoneyText amount={item.amount} />
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/** «ساکنان»: the unit's stays with their dates, current first. */
export function UnitStays({ stays, persons }: { stays: StayWithRow[]; persons: Counterparty[] }) {
  if (!stays.length) {
    return <p className="m-0 py-3 text-center text-sm text-muted">ساکنی ثبت نشده</p>
  }

  return (
    <ul className={calmListClass}>
      {[...stays]
        .sort((a, b) => b.from.localeCompare(a.from))
        .map(stay => {
          const person = persons.find(item => item.id === stay.personId)

          const name = person ? getCounterpartyFullName(person) : '—'

          return (
            <li key={stay.id} className={calmRowClass}>
              <span className={buildingDayBadgeClass} aria-hidden="true">
                {name[0] ?? '؟'}
              </span>
              <span className={calmRowMainClass}>
                <span className={buildingRowTitleClass}>{name}</span>
                <span className={buildingRowSubClass}>
                  {optionLabel(RESIDENT_ROLES, stay.role)} · از {formatIsoDatePersian(stay.from)}
                  {stay.to ? ` تا ${formatIsoDatePersian(stay.to)}` : ' · فعلی'}
                </span>
              </span>
            </li>
          )
        })}
    </ul>
  )
}

/** «مشخصات»: the unit's numbers; the form itself opens from the page. */
export function UnitSpecs({ row }: { row: UnitRowData }) {
  const { unit } = row

  const specs: [string, ReactNode][] = [
    ['شماره', toPersianDigits(unit.number)],
    ['طبقه', fa(unit.floor)],
    ['متراژ', `${fa(unit.area)} متر`],
    ['نفرات', fa(unit.people)],
    ['پارکینگ', fa(unit.parking)],
    ['انباری', fa(unit.storage)],
    ['شارژ ماهانه', <MoneyText key="charge" amount={row.charge} />],
    ['مالک', row.owner || '—']
  ]

  return (
    <ul className={calmListClass}>
      {specs.map(([label, value]) => (
        <li key={label} className={calmRowClass}>
          <span className={`${buildingRowTitleClass} text-muted`}>{label}</span>
          <span className={buildingRowEndClass}>{value}</span>
        </li>
      ))}
    </ul>
  )
}
