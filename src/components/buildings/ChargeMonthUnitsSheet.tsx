import { useMemo } from 'react'

import type { BuildingSetupData } from './useBuildingSetupData'
import { useBuildingAccess } from '../../hooks/useBuildingAccess'
import { monthChargeRows, type ChargeStatus } from '../../services/buildingChargeMonths'
import { monthLabel } from '../../services/buildingMonths'
import { unitOfReference } from '../../services/buildingSummary'
import { paidAmount, remainingAmount } from '../../services/receivablesRow'
import { toPersianDigits } from '../../utils/normalizeDigits'
import FormModal from '../FormModal'
import MoneyText from '../MoneyText'
import {
  buildingRowTitleClass,
  buildingRowSubClass,
  buildingDayBadgeClass
} from '../ui/buildingStyles'
import Button from '../ui/Button'
import {
  calmDayBadgeDangerClass,
  calmListClass,
  calmRowClass,
  calmRowMainClass
} from '../ui/calmListStyles'

const STATUS_TEXT: Record<ChargeStatus, { label: string; tone: string }> = {
  paid: { label: 'پرداخت شد', tone: 'text-success' },
  partial: { label: 'ناقص', tone: 'text-warning' },
  open: { label: 'پرداخت‌نشده', tone: 'text-danger' }
}

interface ChargeMonthUnitsSheetProps {
  /** The month to list; null = closed. */
  monthKey: string | null
  data: BuildingSetupData
  onClose: () => void
  /** «ثبت پرداخت» of a row: the page opens the unit payment sheet. */
  onPay: (unitId: string) => void
}

/** A month's units with their status (paid / partial / open) and a «ثبت پرداخت» for each debtor. */
export default function ChargeMonthUnitsSheet({
  monthKey,
  data,
  onClose,
  onPay
}: ChargeMonthUnitsSheetProps) {
  const { can } = useBuildingAccess()

  const rows = useMemo(() => {
    const numbers = new Map(data.allUnits.map(unit => [unit.id, unit.number]))

    return monthKey
      ? monthChargeRows(data.receivables, monthKey).map(row => ({
          ...row,
          number: numbers.get(unitOfReference(row.receivable.reference ?? '')) ?? '؟'
        }))
      : []
  }, [data.receivables, data.allUnits, monthKey])

  return (
    <FormModal
      open={monthKey !== null}
      title={monthKey ? `شارژ ${monthLabel(monthKey)}` : ''}
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()
        onClose()
      }}
      saveLabel="بستن"
      cancelLabel="انصراف"
    >
      <ul className={calmListClass}>
        {rows.map(({ receivable, status, number }) => (
          <li key={receivable.id} className={calmRowClass}>
            <span
              className={`${buildingDayBadgeClass} ${
                status === 'paid' ? '' : calmDayBadgeDangerClass
              }`}
            >
              {toPersianDigits(number)}
            </span>
            <span className={calmRowMainClass}>
              <span className={buildingRowTitleClass}>{receivable.debtor}</span>
              <span className={buildingRowSubClass}>
                <MoneyText amount={receivable.amount} />
                {paidAmount(receivable) > 0 ? (
                  <>
                    {' '}
                    · پرداخت <MoneyText amount={paidAmount(receivable)} />
                  </>
                ) : null}
              </span>
            </span>
            <span className={`text-sm font-bold ${STATUS_TEXT[status].tone}`}>
              {STATUS_TEXT[status].label}
            </span>
            {remainingAmount(receivable) > 0 && can('record') ? (
              <Button
                type="button"
                size="sm"
                className="min-h-11 text-sm"
                variant="secondary"
                onClick={() => onPay(unitOfReference(receivable.reference ?? ''))}
              >
                ثبت پرداخت
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </FormModal>
  )
}
