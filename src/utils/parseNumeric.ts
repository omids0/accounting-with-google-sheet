const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

export function parseNumeric(value: string | number | undefined | null): number {
  if (value == null || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  const normalized = String(value)
    .trim()
    .replace(/[۰-۹]/g, d => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, d => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/[,\u060C\u066B\u066C\s]/g, '')

  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : 0
}
