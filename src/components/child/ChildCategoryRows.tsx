import type { CategoryRow } from './childViewModel'
import { cn } from '../../utils/cn'
import { toPersianDigits } from '../../utils/normalizeDigits'
import MoneyText from '../MoneyText'
import {
  calmListClass,
  calmRowClass,
  calmRowEndClass,
  calmRowMainClass,
  calmRowSubClass,
  calmRowTitleClass
} from '../ui/calmListStyles'

const fa = (value: number) => toPersianDigits(String(Math.round(value)))

interface ChildCategoryRowsProps {
  rows: CategoryRow[]
  /** Opens the records of a category (a row becomes a button). */
  onOpen?: (category: string) => void
}

function Bar({ percent, over }: { percent: number; over: boolean }) {
  return (
    <span
      className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-accent-soft)]"
      aria-hidden="true"
    >
      <i
        className={cn('block h-full rounded-full', over ? 'bg-danger' : 'bg-primary')}
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </span>
  )
}

function RowBody({ row }: { row: CategoryRow }) {
  const over = row.usage?.over ?? false

  return (
    <>
      <span className={calmRowMainClass}>
        <span className={calmRowTitleClass}>{row.category}</span>
        <span className={calmRowSubClass}>
          {row.budget ? (
            <>
              {'بودجه '}
              <MoneyText amount={row.budget} />
              {row.usage ? ` · ${fa(row.usage.ratio * 100)}٪ از بودجه` : null}
              {over ? <b className="text-danger"> · بیش از بودجه</b> : null}
            </>
          ) : (
            `${fa(row.count)} تراکنش · ${fa(row.share)}٪`
          )}
        </span>
        <Bar percent={row.usage ? row.usage.ratio * 100 : row.share} over={over} />
      </span>
      <span className={calmRowEndClass}>
        <MoneyText amount={row.amount} />
      </span>
    </>
  )
}

/** A month's categories: name, count and share (or the budget and how far it is spent), the amount. */
export default function ChildCategoryRows({ rows, onOpen }: ChildCategoryRowsProps) {
  return (
    <ul className={calmListClass}>
      {rows.map(row => (
        <li key={row.category} className={calmRowClass}>
          {onOpen ? (
            <button
              type="button"
              className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 border-none bg-transparent p-0 text-start"
              onClick={() => onOpen(row.category)}
              aria-label={`تراکنش‌های ${row.category}`}
            >
              <RowBody row={row} />
            </button>
          ) : (
            <RowBody row={row} />
          )}
        </li>
      ))}
    </ul>
  )
}
