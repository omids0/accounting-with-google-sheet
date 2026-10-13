import { useIsAmountsHidden } from '../../../hooks/useAmountsHidden'
import { maskedText } from '../../../utils/amountMask'
import { formatJalaliMonthLabel } from '../../../utils/dateRange'
import { formatCompactNumber, formatMoney } from '../../../utils/formatMoney'

const PLOT_HEIGHT = 96

/** One bar per month for a single item (12 months), all in one tone. */
export default function LineItemMonthBars({
  history,
  tone
}: {
  history: { month: string; total: number }[]
  tone: 'income' | 'expense'
}) {
  const hidden = useIsAmountsHidden()

  const max = Math.max(1, ...history.map(entry => entry.total))

  // Twelve bars leave no room for twelve figures: label the tallest and the latest month.
  const labelled = new Set([history.findIndex(entry => entry.total === max), history.length - 1])

  return (
    <ul
      className="m-0 flex list-none items-end justify-between gap-1.5 p-0"
      aria-label="مبلغ ماهانه این قلم"
    >
      {history.map((entry, index) => {
        const month = formatJalaliMonthLabel(entry.month).split(' ')[0]

        const amountText = maskedText(hidden, formatMoney(entry.total))

        return (
          <li
            key={entry.month}
            className="flex min-w-0 flex-1 flex-col items-center"
            title={`${month}: ${amountText}`}
          >
            <span className="sr-only">{`${month}: ${amountText}`}</span>
            <span
              className="font-numeric whitespace-nowrap text-[0.6rem] leading-4 text-muted tabular-nums"
              aria-hidden="true"
            >
              {hidden || !labelled.has(index) || !entry.total
                ? ' '
                : formatCompactNumber(entry.total)}
            </span>
            <span
              className="flex w-full max-w-7 items-end"
              style={{ height: PLOT_HEIGHT }}
              aria-hidden="true"
            >
              <span
                className="w-full rounded-t-[4px]"
                style={{
                  height: entry.total ? Math.max((entry.total / max) * PLOT_HEIGHT, 3) : 0,
                  background: tone === 'income' ? 'var(--color-income)' : 'var(--color-expense)'
                }}
              />
            </span>
            <span className="mt-1 truncate text-[0.6rem] text-muted" aria-hidden="true">
              {month.slice(0, 3)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
