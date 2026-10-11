import { describe, expect, it } from 'vitest'

import { parseSheetNameFromRange, quoteSheetName } from './sheetsMeta'

describe('quoteSheetName', () => {
  it('quotes names and doubles apostrophes', () => {
    expect(quoteSheetName('هزینه')).toBe("'هزینه'")
    expect(quoteSheetName('هزینه 1404')).toBe("'هزینه 1404'")
    expect(quoteSheetName("o'neil")).toBe("'o''neil'")
  })

  it('round-trips through parseSheetNameFromRange', () => {
    expect(parseSheetNameFromRange(`${quoteSheetName('چک‌ها')}!A1:K9`)).toBe('چک‌ها')
    expect(parseSheetNameFromRange(`${quoteSheetName("o'neil")}!A1:B2`)).toBe("o'neil")
  })
})
