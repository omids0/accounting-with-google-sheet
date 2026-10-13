import { useMemo, useState } from 'react'

import { useRecordInputsState } from '../../hooks/useRecordInputs'
import type { RecordInput } from '../../services/recordInputs'
import { formatPersianNumber } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import MoneyText from '../MoneyText'
import Button from '../ui/Button'
import {
  calmEmptyClass,
  calmListClass,
  calmRowButtonClass,
  calmRowClass,
  calmRowEndClass,
  calmRowSubClass,
  calmRowTitleClass
} from '../ui/calmListStyles'

/** Records listed before «بیشتر» adds another page. */
const PAGE_SIZE = 50

/** «تراکنش‌ها» tab of a counterparty: totals of what the records name it for, newest first. */
export default function CounterpartyRecordsTab({
  name,
  onOpenRecord
}: {
  name: string
  onOpenRecord: (record: RecordInput) => void
}) {
  const { records, loaded } = useRecordInputsState()

  const [visible, setVisible] = useState(PAGE_SIZE)

  const mine = useMemo(
    () =>
      records
        .filter(record => record.counterparty === name)
        .sort(
          (a, b) => b.date.localeCompare(a.date) || (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0)
        ),
    [records, name]
  )

  const totals = useMemo(
    () => ({
      income: mine.reduce((sum, r) => sum + (r.type === 'income' ? r.amount : 0), 0),
      expense: mine.reduce((sum, r) => sum + (r.type === 'expense' ? r.amount : 0), 0)
    }),
    [mine]
  )

  if (!loaded) return <p className={calmEmptyClass}>در حال بارگذاری…</p>

  if (!mine.length) return <p className={calmEmptyClass}>هنوز تراکنشی با این طرف حساب ثبت نشده</p>

  return (
    <div>
      <p className="m-0 mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.82rem] text-muted">
        <span>
          {'درآمد: '}
          <span className="font-bold text-success">
            <MoneyText amount={totals.income} />
          </span>
        </span>
        <span>
          {'هزینه: '}
          <span className="font-bold text-danger">
            <MoneyText amount={totals.expense} />
          </span>
        </span>
      </p>
      <ul className={calmListClass}>
        {mine.slice(0, visible).map(record => (
          <li key={record.id} className={calmRowClass}>
            <button
              type="button"
              className={calmRowButtonClass}
              onClick={() => onOpenRecord(record)}
            >
              <span className={calmRowTitleClass}>{record.title || record.category || '—'}</span>
              <span className={calmRowSubClass}>
                {[record.date ? formatIsoDatePersian(record.date) : '', record.category]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </button>
            <span
              className={`${calmRowEndClass} ${
                record.type === 'income' ? 'text-success' : 'text-danger'
              }`}
            >
              <MoneyText amount={record.type === 'income' ? record.amount : -record.amount} />
            </span>
          </li>
        ))}
      </ul>
      {mine.length > visible ? (
        <div className="flex justify-center py-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setVisible(count => count + PAGE_SIZE)}
          >
            {`بیشتر (${formatPersianNumber(mine.length - visible)} مورد دیگر)`}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
