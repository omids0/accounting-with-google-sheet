const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/[۰-۹]/g, d => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, d => String(ARABIC_DIGITS.indexOf(d)))
}

export function matchSearch(
  query: string,
  ...parts: (string | number | undefined | null)[]
): boolean {
  const normalizedQuery = normalizeSearchText(query)

  if (!normalizedQuery) return true

  const haystack = parts
    .filter(part => part != null && part !== '')
    .map(part => normalizeSearchText(String(part)))
    .join(' ')

  return haystack.includes(normalizedQuery)
}
