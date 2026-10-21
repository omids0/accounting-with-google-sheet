import { describe, expect, it } from 'vitest'

import { counterpartyRowFromImportCells, rowToCounterparty } from './counterparties'
import { COUNTERPARTIES_HEADERS } from './sheetHeaders'

const base = ['id1', 'time', 'علی', 'احمدی', '', '', '', '[]', '[]', 'یادداشت']

describe('building people flags on counterparties', () => {
  it('puts «موقت» and «من» at the end of the row', () => {
    expect(COUNTERPARTIES_HEADERS.slice(-2)).toEqual(['موقت', 'من'])
    expect(COUNTERPARTIES_HEADERS).toHaveLength(12)
  })

  it('reads both flags from the last columns', () => {
    expect(rowToCounterparty([...base, 'بله', 'خیر'], 2)).toMatchObject({
      placeholder: true,
      me: false
    })
    expect(rowToCounterparty([...base, 'خیر', 'بله'], 2)).toMatchObject({
      placeholder: false,
      me: true
    })
  })

  it('reads an older row without the columns as an ordinary person', () => {
    expect(rowToCounterparty(base, 2)).toMatchObject({ placeholder: false, me: false })
  })

  it('carries the flags through a CSV import and a re-save', () => {
    const row = counterpartyRowFromImportCells([...base, 'بله', 'بله'])

    expect(row?.slice(-2)).toEqual(['بله', 'بله'])
    expect(counterpartyRowFromImportCells(base)?.slice(-2)).toEqual(['خیر', 'خیر'])
  })
})
