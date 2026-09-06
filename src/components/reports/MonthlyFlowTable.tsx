import type { MonthlyFlow } from '../../types'
import { formatMoney } from '../../utils/formatMoney'
import Card from '../ui/Card'
import { chartTitleClass } from '../ui/chartStyles'
import { emptyTextClass } from '../ui/displayStyles'
import {
  reportDataTableClass,
  reportDataTableHeaderClass,
  reportDataTableRowClass,
  reportValueExpenseClass,
  reportValueIncomeClass,
  reportValueNegativeClass,
  reportValuePositiveClass
} from '../ui/toolsPageStyles'

export default function MonthlyFlowTable({ items }: { items: MonthlyFlow[] }) {
  return (
    <Card>
      <h3 className={chartTitleClass}>جدول ماهانه</h3>
      {!items.length ? (
        <p className={emptyTextClass}>داده‌ای برای این سال ثبت نشده</p>
      ) : (
        <div className={reportDataTableClass}>
          <div className={reportDataTableHeaderClass}>
            <span>ماه</span>
            <span>درآمد</span>
            <span>هزینه</span>
            <span>خالص</span>
          </div>
          {items.map(item => (
            <div key={item.monthKey} className={reportDataTableRowClass}>
              <span>{item.label}</span>
              <span className={reportValueIncomeClass} dir="ltr">
                {formatMoney(item.income)}
              </span>
              <span className={reportValueExpenseClass} dir="ltr">
                {formatMoney(item.expense)}
              </span>
              <span
                className={
                  item.net < 0
                    ? reportValueNegativeClass
                    : item.net > 0
                    ? reportValuePositiveClass
                    : 'font-numeric tabular-nums'
                }
                dir="ltr"
              >
                {formatMoney(item.net)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
