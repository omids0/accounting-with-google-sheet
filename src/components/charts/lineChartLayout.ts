/** viewBox and inner padding of the calm month-by-month line charts. */
export const LINE_CHART_BOX = { width: 320, height: 120, padX: 10, padY: 14 }

export type LineChartBox = typeof LINE_CHART_BOX

export interface LineChartLayout {
  /** One list of points per series, in the order given. */
  series: { x: number; y: number }[][]
  /** x of each month, shared by every series. */
  xs: number[]
  zeroY: number
}

/**
 * Plot coordinates of month series on one shared scale (zero always inside it),
 * right-to-left: the oldest month sits on the right edge.
 */
export function lineChartLayout(
  series: number[][],
  box: LineChartBox = LINE_CHART_BOX
): LineChartLayout {
  const all = series.flat()
  const max = Math.max(0, ...all)
  const min = Math.min(0, ...all)
  const span = max - min || 1
  const count = Math.max(0, ...series.map(values => values.length))
  const step = count > 1 ? (box.width - box.padX * 2) / (count - 1) : 0
  const yOf = (value: number) => box.padY + ((max - value) / span) * (box.height - box.padY * 2)
  const xs = Array.from({ length: count }, (_, index) =>
    count > 1 ? box.width - box.padX - index * step : box.width / 2
  )

  return {
    series: series.map(values => values.map((value, index) => ({ x: xs[index], y: yOf(value) }))),
    xs,
    zeroY: yOf(0)
  }
}

export function polylinePoints(points: { x: number; y: number }[]): string {
  return points.map(({ x, y }) => `${x},${y}`).join(' ')
}
