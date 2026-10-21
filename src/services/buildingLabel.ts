/** The word that opens a building's label and its spreadsheet title. */
export const BUILDING_WORD = 'ساختمان'

const STARTS_WITH_WORD = /^ساختمان(\s|$)/

/**
 * «ساختمان نرگس» for a building named «نرگس». A name that already starts with the word («ساختمان
 * تست») is kept as it is instead of becoming «ساختمان ساختمان تست»; an old title that already
 * carries the doubled word is shown as stored, never stripped or doubled again.
 */
export function buildingLabel(name: string): string {
  const trimmed = name.trim()

  if (!trimmed) return BUILDING_WORD

  return STARTS_WITH_WORD.test(trimmed) ? trimmed : `${BUILDING_WORD} ${trimmed}`
}
