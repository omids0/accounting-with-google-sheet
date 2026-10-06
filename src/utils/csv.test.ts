import { describe, expect, it } from 'vitest'

import { escapeCsvValue, neutralizeCsvFormula, parseCsv, restoreCsvFormula, rowsToCsv } from './csv'

describe('CSV formula injection guard', () => {
  it.each(['=HYPERLINK("http://x")', '+cmd', '-2+3', '@SUM(A1)', '\tfoo', '\rbar', '-', '=1+1'])(
    'prefixes a quote to %j',
    value => {
      expect(neutralizeCsvFormula(value)).toBe(`'${value}`)
    }
  )

  it.each(['-1500', '+98', '1500', '-1500.25', '-1,500', '-۱۵۰۰', '.5', 'متن', '', 'a=b'])(
    'leaves %j untouched',
    value => {
      expect(neutralizeCsvFormula(value)).toBe(value)
    }
  )

  it('escapes the neutralized value inside rowsToCsv', () => {
    const csv = rowsToCsv(['h'], [['=1+1'], ['-1500'], ['=A1,B1']])

    expect(csv).toBe(`h\r\n'=1+1\r\n-1500\r\n"'=A1,B1"`)
  })

  it('quotes a value whose escape adds no special characters only when needed', () => {
    expect(escapeCsvValue('@x')).toBe("'@x")
    expect(escapeCsvValue('a,b')).toBe('"a,b"')
  })

  it('round-trips exported cells back to their original text', () => {
    const rows = [['=SUM(A1)', '-1500', '@home', "'quoted", 'plain']]

    const parsed = parseCsv(rowsToCsv(['a', 'b', 'c', 'd', 'e'], rows))

    expect(parsed[1].map(restoreCsvFormula)).toEqual(rows[0])
  })
})
