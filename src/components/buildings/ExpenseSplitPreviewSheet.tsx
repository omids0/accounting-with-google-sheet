import type { ChargeResident } from '../../services/buildingCharges'
import { shareDebtor } from '../../services/buildingExpenses'
import type { ManagedItem } from '../../services/buildingLists'
import type { BuildingUnit } from '../../services/buildingUnits'
import { formatMoney } from '../../utils/formatMoney'
import { toPersianDigits } from '../../utils/normalizeDigits'
import AmountField from '../AmountField'
import FormModal from '../FormModal'
import MoneyText from '../MoneyText'
import { journeyNoteClass } from '../ui/buildingStyles'
import {
  dataTableCellClass,
  dataTableClass,
  dataTableHeadCellClass,
  dataTableNumericClass,
  dataTableRowClass,
  dataTableWrapClass
} from '../ui/tableStyles'

interface ExpenseSplitPreviewSheetProps {
  open: boolean
  onClose: () => void
  units: BuildingUnit[]
  residents: ChargeResident[]
  kind: ManagedItem | undefined
  amount: number
  shares: Record<string, number>
  manual: boolean
  onShareChange: (unitId: string, amount: number) => void
}

/**
 * «پیش‌نمایش» of a split: one row per unit with who is billed (by the kind's «سهم به نام» rule)
 * and the share. In the manual mode every share is typed on the dial pad and the sum must match
 * the expense.
 */
export default function ExpenseSplitPreviewSheet({
  open,
  onClose,
  units,
  residents,
  kind,
  amount,
  shares,
  manual,
  onShareChange
}: ExpenseSplitPreviewSheetProps) {
  const total = Object.values(shares).reduce((sum, share) => sum + share, 0)

  const difference = Math.round(amount) - total

  return (
    <FormModal
      open={open}
      title="تقسیم بین واحدها"
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()
        onClose()
      }}
      saveLabel="تأیید"
      cancelLabel="بستن"
    >
      <div className={dataTableWrapClass(true)}>
        <table className={dataTableClass}>
          <thead>
            <tr>
              <th className={dataTableHeadCellClass}>واحد</th>
              <th className={dataTableHeadCellClass}>بدهکار</th>
              <th className={dataTableHeadCellClass}>سهم</th>
            </tr>
          </thead>
          <tbody>
            {units.map(unit => {
              const debtor = shareDebtor(kind, unit, residents)

              return (
                <tr key={unit.id} className={dataTableRowClass(!debtor)}>
                  <td className={dataTableCellClass}>{toPersianDigits(unit.number)}</td>
                  <td className={dataTableCellClass}>
                    {debtor
                      ? `${debtor.name}${
                          debtor.role === 'owner' && kind?.chargeTo === 'owner' ? ' (مالک)' : ''
                        }`
                      : 'بدون ساکن و مالک'}
                  </td>
                  <td className={`${dataTableCellClass} ${dataTableNumericClass}`}>
                    {manual ? (
                      <AmountField
                        label={`سهم واحد ${toPersianDigits(unit.number)}`}
                        value={shares[unit.id] || ''}
                        onChange={next => onShareChange(unit.id, Number(next) || 0)}
                        hideWords
                      />
                    ) : (
                      <MoneyText amount={shares[unit.id] ?? 0} />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className={journeyNoteClass}>
        {manual && difference !== 0
          ? `جمع سهم‌ها ${formatMoney(Math.abs(difference))} ${
              difference > 0 ? 'کمتر' : 'بیشتر'
            } از مبلغ هزینه است`
          : `جمع سهم‌ها ${formatMoney(total)}`}
      </p>
    </FormModal>
  )
}
