type FuelFill = { mileage?: number; fuelLiters?: number }

/**
 * Litres per 100 km by the full-tank method. The litres of the fill at the highest
 * odometer reading are not counted: that tank has not been driven yet, so only the
 * earlier fills burned fuel over the distance between the first and last reading.
 */
export function computeFuelEfficiencyL100km(fills: FuelFill[]): number | null {
  const withMileage = fills.filter(
    (fill): fill is { mileage: number; fuelLiters?: number } => (fill.mileage ?? 0) > 0
  )

  if (withMileage.length < 2) return null

  const mileages = withMileage.map(fill => fill.mileage)
  const first = Math.min(...mileages)
  const last = Math.max(...mileages)
  const distance = last - first

  if (distance <= 0) return null

  const burnedLiters = withMileage
    .filter(fill => fill.mileage < last)
    .reduce((sum, fill) => sum + (fill.fuelLiters ?? 0), 0)

  if (burnedLiters <= 0) return null

  return (burnedLiters / distance) * 100
}
