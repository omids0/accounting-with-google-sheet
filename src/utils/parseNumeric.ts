import { normalizeDigits } from './normalizeDigits'

export function parseNumeric(value: string | number | undefined | null): number {
  if (value == null || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  const normalized = normalizeDigits(String(value).trim()).replace(/[,\u060C\u066B\u066C\s]/g, '')

  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : 0
}
