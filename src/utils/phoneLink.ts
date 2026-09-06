import { normalizeDigits } from './normalizeDigits'

export function buildPhoneTelHref(number: string): string | null {
  const normalized = normalizeDigits(number.trim()).replace(/[^\d+]/g, '')

  if (!normalized || normalized.replace(/\D/g, '').length < 3) return null

  return `tel:${normalized}`
}
