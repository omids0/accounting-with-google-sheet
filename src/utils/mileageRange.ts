export type MileageRangeValue = {
  min: number
  max: number
}

export function resolveMileageSliderStep(maxKm: number): number {
  if (maxKm <= 50_000) return 1_000
  if (maxKm <= 200_000) return 5_000

  return 10_000
}

export function resolveMileageSliderMax(mileages: number[], fallback = 100_000): number {
  if (mileages.length === 0) return fallback

  const peak = Math.max(...mileages)
  const step = resolveMileageSliderStep(peak)

  return Math.max(step, Math.ceil(peak / step) * step)
}

export function createFullMileageRange(maxKm: number): MileageRangeValue {
  return { min: 0, max: maxKm }
}

export function clampMileageRange(range: MileageRangeValue, maxKm: number): MileageRangeValue {
  const step = resolveMileageSliderStep(maxKm)
  const min = Math.min(range.min, range.max)
  const max = Math.max(range.min, range.max)

  return {
    min: Math.max(0, Math.round(Math.min(min, maxKm) / step) * step),
    max: Math.max(0, Math.round(Math.min(max, maxKm) / step) * step)
  }
}

export function isFullMileageRange(range: MileageRangeValue, maxKm: number): boolean {
  return range.min <= 0 && range.max >= maxKm
}

export function formatMileageKm(value: number): string {
  return `${value.toLocaleString('fa-IR')} km`
}

export function formatMileageRangeChipLabel(range: MileageRangeValue, maxKm: number): string {
  if (isFullMileageRange(range, maxKm)) return ''

  return `کارکرد: ${range.min.toLocaleString('fa-IR')} – ${range.max.toLocaleString('fa-IR')} km`
}
