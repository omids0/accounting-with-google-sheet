import type { MonthlyFlow } from '../../types'
import { formatCompactNumber, formatSignedMoney } from '../../utils/formatMoney'
import { calmEmptyClass } from '../ui/calmListStyles'

const PLOT_HEIGHT = 112

/** Bar heights (px) above and below a shared zero line for each month's net. */
export function netBarHeights(
  flow: MonthlyFlow[],
  plotHeight = PLOT_HEIGHT
): { up: number; down: number; zero: number }[] {
  const maxUp = Math.max(0, ...flow.map(item => item.net))
  const maxDown = Math.max(0, ...flow.map(item => -item.net))
  const scale = plotHeight / (maxUp + maxDown || 1)

  return flow.map(item => ({
    up: item.net > 0 ? Math.max(item.net * scale, 2) : 0,
    down: item.net < 0 ? Math.max(-item.net * scale, 2) : 0,
    zero: maxUp * scale
  }))
}

/** «خالص ماهانه»: one bar per month, green above zero, red below. */
export default function MonthlyNetBars({ flow }: { flow: MonthlyFlow[] }) {
  if (!flow.some(item => item.income || item.expense)) {
    return <p className={calmEmptyClass}>تراکنشی در این بازه نیست</p>
  }

  const heights = netBarHeights(flow)
  const zero = heights[0]?.zero ?? 0

  return (
    <ul className="m-0 flex list-none items-stretch justify-between gap-1.5 p-0">
      {flow.map((item, index) => {
        const { up, down } = heights[index]
        const month = item.label.split(' ')[0] ?? item.label

        return (
          <li
            key={item.monthKey}
            className="flex min-w-0 flex-1 flex-col items-center"
            title={`${month}: ${formatSignedMoney(item.net, { showPlus: true })}`}
          >
            <span className="sr-only">{`${month}: ${formatSignedMoney(item.net, {
              showPlus: true
            })}`}</span>
            <span
              className="font-numeric text-[0.6rem] leading-4 text-muted tabular-nums"
              aria-hidden="true"
            >
              {item.net ? formatCompactNumber(item.net) : '—'}
            </span>
            <span
              className="relative w-full max-w-7 border-b border-border"
              style={{ height: zero }}
              aria-hidden="true"
            >
              <span
                className="absolute inset-x-0 bottom-0 rounded-t-[4px] bg-[var(--color-income)]"
                style={{ height: up }}
              />
            </span>
            <span
              className="relative w-full max-w-7"
              style={{ height: PLOT_HEIGHT - zero }}
              aria-hidden="true"
            >
              <span
                className="absolute inset-x-0 top-0 rounded-b-[4px] bg-[var(--color-expense)]"
                style={{ height: down }}
              />
            </span>
            <span className="mt-1 truncate text-[0.66rem] text-muted" aria-hidden="true">
              {month}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
