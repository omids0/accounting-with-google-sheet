import type { ChildEntry } from './childViewModel'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import MoneyText from '../MoneyText'
import TransactionListItem from '../TransactionListItem'
import { amountExpenseClass, amountIncomeClass } from '../ui/recordsStyles'

interface ChildRecordRowProps {
  entry: ChildEntry
  index?: number
  onOpen: (entry: ChildEntry) => void
}

/** One record of the child in a list: title, «دسته · زیردسته · تاریخ», the amount. A tap opens the details. */
export default function ChildRecordRow({ entry, index = 0, onOpen }: ChildRecordRowProps) {
  const income = entry.kind === 'income'

  const meta = [
    entry.category,
    entry.subCategory,
    entry.date ? formatIsoDatePersian(entry.date) : ''
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <TransactionListItem
      title={entry.title}
      meta={meta}
      tone={income ? 'income' : 'expense'}
      index={index}
      onOpen={() => onOpen(entry)}
      openLabel={`جزئیات ${entry.title}`}
    >
      <div className={`shrink-0 ${income ? amountIncomeClass : amountExpenseClass}`}>
        <MoneyText amount={income ? entry.amount : -entry.amount} signed={income ? 'plus' : true} />
      </div>
    </TransactionListItem>
  )
}
