/** recharts' default gap between the axis line and the tick label start. */
const RECHARTS_TICK_SIZE = 6

interface RtlCategoryTickProps {
  x?: number | string
  y?: number | string
  payload?: { value?: unknown }
  /** Width of the right-hand category `<YAxis>`. */
  axisWidth: number
  tickMargin: number
  fill: string
  fontSize: number
  format?: (label: string) => string
}

/**
 * Category label for a right-hand `<YAxis orientation="right">`: right-aligned to
 * the chart's edge and rendered right-to-left, on one line (recharts' default
 * tick wraps long Persian labels into two broken lines).
 */
export default function RtlCategoryTick({
  x = 0,
  y = 0,
  payload,
  axisWidth,
  tickMargin,
  fill,
  fontSize,
  format
}: RtlCategoryTickProps) {
  const label = String(payload?.value ?? '')

  const shown = format ? format(label) : label

  return (
    <text
      x={Number(x) + axisWidth - RECHARTS_TICK_SIZE - tickMargin}
      y={Number(y)}
      dy="0.355em"
      fill={fill}
      fontSize={fontSize}
      textAnchor="start"
      direction="rtl"
      className="recharts-cartesian-axis-tick-value"
    >
      {shown !== label ? <title>{label}</title> : null}
      {shown}
    </text>
  )
}
