import type { MonthlyPoint } from '../../types'
import { formatCompactNumber, formatSignedMoney } from '../../utils/formatMoney'
import { calmEmptyClass } from '../ui/calmListStyles'

const WIDTH = 320
const HEIGHT = 120
const PAD_X = 10
const PAD_Y = 14

function monthName(label: string): string {
  return label.split(' ')[0] ?? label
}

/** Plot coordinates right-to-left (oldest month on the right) and the y of zero. */
export function lineChartLayout(points: MonthlyPoint[]): {
  coords: { x: number; y: number }[]
  zeroY: number
} {
  const values = points.map(point => point.value)
  const max = Math.max(0, ...values)
  const min = Math.min(0, ...values)
  const span = max - min || 1
  const step = points.length > 1 ? (WIDTH - PAD_X * 2) / (points.length - 1) : 0
  const yOf = (value: number) => PAD_Y + ((max - value) / span) * (HEIGHT - PAD_Y * 2)

  return {
    coords: points.map((point, index) => ({
      x: WIDTH - PAD_X - index * step,
      y: yOf(point.value)
    })),
    zeroY: yOf(0)
  }
}

/** A thin line of a month-by-month series with a zero line and the latest value. */
export default function CumulativeNetChart({ points }: { points: MonthlyPoint[] }) {
  if (!points.length || points.every(point => point.value === 0)) {
    return <p className={calmEmptyClass}>تراکنشی در این بازه نیست</p>
  }

  const { coords, zeroY } = lineChartLayout(points)
  const last = points[points.length - 1]
  const summary = points.map(
    point => `${monthName(point.label)}: ${formatCompactNumber(point.value)}`
  )

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block h-auto w-full"
        role="img"
        aria-label={summary.join('، ')}
      >
        <line
          x1={PAD_X}
          x2={WIDTH - PAD_X}
          y1={zeroY}
          y2={zeroY}
          stroke="var(--color-border)"
          strokeDasharray="3 3"
        />
        <polyline
          points={coords.map(({ x, y }) => `${x},${y}`).join(' ')}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map(({ x, y }, index) => (
          <circle key={points[index].monthKey} cx={x} cy={y} r={3} fill="var(--color-primary)" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[0.66rem] text-muted" aria-hidden="true">
        {points.map(point => (
          <span key={point.monthKey}>{monthName(point.label)}</span>
        ))}
      </div>
      <figcaption className="mt-1.5 text-[0.74rem] text-muted">
        {`تا پایان ${monthName(last.label)}: `}
        <span className="font-numeric font-bold text-text">
          {formatSignedMoney(last.value, { showPlus: true })}
        </span>
      </figcaption>
    </figure>
  )
}
