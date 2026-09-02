import { normalizeDigits } from './normalizeDigits'

export function normalizeSearchText(value: string): string {
  return normalizeDigits(value).normalize('NFC').trim().toLowerCase()
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
