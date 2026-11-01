type FuelFill = { mileage?: number; fuelLiters?: number }

type FillWithMileage = { mileage: number; fuelLiters?: number }

/**
 * Litres per 100 km by the full-tank method: the litres of a fill are the fuel burned since
 * the fill before it, so they cover the distance up to that fill's odometer reading.
 *
 * - With `previousMileage` (the last reading before this period) every fill of the period counts
 *   and the distance runs from that reading to the period's last one.
 * - Without it the first fill of the period only tops the tank up, so its litres are left out
 *   and the distance runs from the first reading to the last one.
 */
export function computeFuelEfficiencyL100km(
  fills: FuelFill[],
  previousMileage: number | null = null
): number | null {
  const hasBaseline = previousMileage !== null && previousMileage > 0
  const withMileage = fills.filter(
    (fill): fill is FillWithMileage => (fill.mileage ?? 0) > (hasBaseline ? previousMileage : 0)
  )

  if (!withMileage.length) return null

  const mileages = withMileage.map(fill => fill.mileage)
  const last = Math.max(...mileages)
  const start = hasBaseline ? previousMileage : Math.min(...mileages)
  const distance = last - start

  if (distance <= 0) return null

  const burnedLiters = withMileage
    .filter(fill => hasBaseline || fill.mileage > start)
    .reduce((sum, fill) => sum + (fill.fuelLiters ?? 0), 0)

  if (burnedLiters <= 0) return null

  return (burnedLiters / distance) * 100
}
