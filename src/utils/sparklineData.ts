import type { MonthlyFlow } from '../types'

export function monthlySparkline(data: MonthlyFlow[], key: 'income' | 'expense' | 'net'): number[] {
  if (!data.length) return []

  return data.map(item => item[key])
}

/** A sparkline is ~100 px wide: more points than this cannot be seen, only paid for. */
export const SPARKLINE_MAX_POINTS = 60

/**
 * Thins a long series to at most `maxPoints` values for a tiny chart, keeping the first and the
 * last value and, per bucket, the point that bends the outline most (largest-triangle-three-buckets),
 * so peaks survive. Series that already fit come back unchanged. Thousands of records otherwise
 * mean thousands of SVG points animated on every render.
 */
export function downsampleSparkline(
  values: number[],
  maxPoints: number = SPARKLINE_MAX_POINTS
): number[] {
  const count = values.length

  if (maxPoints < 3 || count <= maxPoints) return values

  const sampled = [values[0]]
  const bucketSize = (count - 2) / (maxPoints - 2)
  let anchor = 0

  for (let bucket = 0; bucket < maxPoints - 2; bucket += 1) {
    const nextStart = Math.floor((bucket + 1) * bucketSize) + 1
    const nextEnd = Math.min(Math.floor((bucket + 2) * bucketSize) + 1, count)
    let avgX = 0
    let avgY = 0

    for (let index = nextStart; index < nextEnd; index += 1) {
      avgX += index
      avgY += values[index]
    }

    avgX /= nextEnd - nextStart
    avgY /= nextEnd - nextStart

    const start = Math.floor(bucket * bucketSize) + 1
    const end = Math.floor((bucket + 1) * bucketSize) + 1
    let bestArea = -1
    let best = start

    for (let index = start; index < end; index += 1) {
      const area = Math.abs(
        (anchor - avgX) * (values[index] - values[anchor]) -
          (anchor - index) * (avgY - values[anchor])
      )

      if (area > bestArea) {
        bestArea = area
        best = index
      }
    }

    sampled.push(values[best])
    anchor = best
  }

  sampled.push(values[count - 1])

  return sampled
}

export function distributionSparkline(values: number[]): number[] {
  return downsampleSparkline(values.filter(value => Number.isFinite(value)))
}

export function cumulativeSparkline(values: number[]): number[] {
  let sum = 0

  return values.map(value => {
    sum += value

    return sum
  })
}

export function flowTrendSparkline(opening: number, income: number, expense: number): number[] {
  const mid = opening + income * 0.5 - expense * 0.25

  const end = opening + income - expense

  return [opening, mid, end]
}
