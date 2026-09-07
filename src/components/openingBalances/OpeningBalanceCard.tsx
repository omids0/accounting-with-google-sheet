import type { MonthlyOpeningBalance } from '../../services/monthlyBalance'
import { cn } from '../../utils/cn'
import { formatJalaliMonthLabel } from '../../utils/dateRange'
import { formatMoney } from '../../utils/formatMoney'
import { AccordionCollapse } from '../AccordionCollapse'
import AmountInput from '../AmountInput'
import { FormField } from '../form'
import Button from '../ui/Button'
import { dashboardOpeningBodyClass, dashboardOpeningCardClass } from '../ui/chartStyles'
import {
  installmentChevronClass,
  installmentHeaderClass,
  installmentPaymentsClass,
  installmentCardClass,
  listCardAmountPillClass,
  walletItemAmountClass,
  walletItemCardClass,
  walletItemInfoClass,
  walletItemNoteClass,
  walletItemTitleClass,
  walletItemTitleRowClass
} from '../ui/featureCardStyles'
import { openingBalancePageHintClass } from '../ui/recordsStyles'

export type OpeningBalanceEditState = {
  amount: number | ''
  note: string
}

type OpeningBalanceCardProps = {
  item: MonthlyOpeningBalance
  expanded: boolean
  /** Derived months are chained from the anchor and must not be edited. */
  derived: boolean
  isAnchor: boolean
  edit?: OpeningBalanceEditState
  saving: boolean
  onToggle: () => void
  onEditChange: (next: OpeningBalanceEditState) => void
  onSave: () => void
}

export default function OpeningBalanceCard({
  item,
  expanded,
  derived,
  isAnchor,
  edit,
  saving,
  onToggle,
  onEditChange,
  onSave
}: OpeningBalanceCardProps) {
  const displayAmount =
    derived || edit?.amount === '' || edit?.amount == null ? item.amount : Number(edit.amount)

  return (
    <div
      className={cn(
        installmentCardClass({ expanded }),
        dashboardOpeningCardClass,
        walletItemCardClass
      )}
    >
      <button
        type="button"
        className={cn(installmentHeaderClass(expanded), 'wallet-item-header')}
        onClick={onToggle}
      >
        <div className={walletItemInfoClass}>
          <div className={walletItemTitleRowClass}>
            <div className={walletItemTitleClass}>{formatJalaliMonthLabel(item.monthKey)}</div>
            <div className={cn(walletItemAmountClass, listCardAmountPillClass)} dir="ltr">
              {formatMoney(displayAmount)}
            </div>
          </div>
          <div className={walletItemNoteClass}>
            {isAnchor ? 'مبنای محاسبه' : derived ? 'محاسبه خودکار' : 'ثبت دستی (تاریخی)'}
            {item.updatedAt ? ` • ${item.updatedAt}` : ''}
          </div>
        </div>
        <span className={installmentChevronClass}>▼</span>
      </button>

      <AccordionCollapse open={expanded && (derived || !!edit)}>
        <div className={cn(installmentPaymentsClass, dashboardOpeningBodyClass)}>
          {derived ? (
            <p className={openingBalancePageHintClass}>
              {isAnchor
                ? 'این ماه مبنای محاسبه خودکار است و بقیه ماه‌ها از آن زنجیر می‌شوند.'
                : 'این عدد از مانده پایان ماه قبل محاسبه شده است. برای تغییرش، درآمد یا هزینه ماه قبل را اصلاح کنید.'}
              {item.note ? ` ${item.note}` : ''}
            </p>
          ) : (
            edit && (
              <>
                <FormField label="موجودی اول دوره">
                  <AmountInput
                    value={edit.amount}
                    onChange={amount => onEditChange({ ...edit, amount })}
                  />
                </FormField>
                <FormField label="توضیحات">
                  <textarea
                    value={edit.note}
                    onChange={e => onEditChange({ ...edit, note: e.target.value })}
                    placeholder="توضیحات اختیاری"
                  />
                </FormField>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={onSave}
                  disabled={saving}
                  loading={saving}
                >
                  ذخیره
                </Button>
              </>
            )
          )}
        </div>
      </AccordionCollapse>
    </div>
  )
}
