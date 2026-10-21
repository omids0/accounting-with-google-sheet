import { describe, expect, it } from 'vitest'

import { buildingLabel } from './buildingLabel'
import { formatSpreadsheetTitle, getSpreadsheetLabel } from './spreadsheetCatalog'

describe('buildingLabel', () => {
  it('puts the word in front of a plain name', () => {
    expect(buildingLabel('نرگس')).toBe('ساختمان نرگس')
    expect(buildingLabel('  نرگس  ')).toBe('ساختمان نرگس')
  })

  it('does not double the word of a name that already starts with it', () => {
    expect(buildingLabel('ساختمان تست')).toBe('ساختمان تست')
    expect(buildingLabel(' ساختمان  تست')).toBe('ساختمان  تست')
  })

  it('treats a longer word that merely starts with the letters as a plain name', () => {
    expect(buildingLabel('ساختمانی')).toBe('ساختمان ساختمانی')
  })

  it('builds the file title once', () => {
    expect(formatSpreadsheetTitle(buildingLabel('ساختمان تست'))).toBe('حسابداری · ساختمان تست')
    expect(getSpreadsheetLabel('حسابداری · ساختمان تست')).toBe('ساختمان تست')
  })

  it('leaves an old doubled title as it was stored', () => {
    const old = 'حسابداری · ساختمان ساختمان تست'

    expect(getSpreadsheetLabel(old)).toBe('ساختمان ساختمان تست')
    expect(buildingLabel(getSpreadsheetLabel(old))).toBe('ساختمان ساختمان تست')
  })
})
