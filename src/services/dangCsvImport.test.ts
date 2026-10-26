import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ rows: [] as string[][] }))

vi.mock('./importExport', async importOriginal => {
  const original = await importOriginal<Record<string, unknown>>()

  return {
    ...original,
    importSheetCsv: async (
      _id: string,
      _sheet: string,
      _headers: string[],
      csv: string,
      transform: (cells: string[]) => string[]
    ) => {
      const { parseImportCsv } = await import('./importPlan')
      const { DANG_HEADERS } = await import('./sheetHeaders')

      mocks.rows = parseImportCsv(csv, DANG_HEADERS).dataRows.map(transform)
    }
  }
})

const { importDangsCsv } = await import('./dang')
const { rowToDang } = await import('./dangRow')
const { DANG_HEADERS } = await import('./sheetHeaders')
const { parseImportCsv } = await import('./importPlan')

const NEW_HEADER = DANG_HEADERS.join(',')
const OLD_HEADER = DANG_HEADERS.slice(0, 12).join(',')
const OLDER_HEADER = DANG_HEADERS.slice(0, 13).join(',')

describe('debts CSV header', () => {
  it('is recognised in the old 12/13-column shapes and the new 14-column one', () => {
    for (const header of [OLD_HEADER, OLDER_HEADER, NEW_HEADER]) {
      expect(parseImportCsv(`${header}\nx,t`, DANG_HEADERS).firstLine).toBe(2)
    }
  })
})

describe('importing debts', () => {
  beforeEach(() => {
    mocks.rows = []
  })

  it('reads an old file without the payments column; a paid row becomes one full payment', async () => {
    await importDangsCsv(
      's',
      `${OLD_HEADER}\nd1,t,شام,خوراک,علی,200000,2026-10-20,,بله,2026-10-21,rec-old,زیر\nd2,t,ناهار,خوراک,علی,5000,2026-10-20,,خیر,,,\n`
    )

    expect(mocks.rows).toHaveLength(2)
    expect(mocks.rows[0]).toHaveLength(14)

    const [paid, open] = mocks.rows.map((row, index) => rowToDang(row, index + 2))

    expect(paid).toMatchObject({ amount: 200000, paid: true, paidAt: '2026-10-21' })
    expect(paid.payments).toHaveLength(1)
    // The old spreadsheet's record id means nothing here.
    expect(paid.transactionRecordId).toBe('')
    expect(paid.payments[0].transactionRecordId).toBeUndefined()
    expect(open).toMatchObject({ paid: false, payments: [] })
    expect(mocks.rows[1][13]).toBe('[]')
  })

  it('keeps the payments of a new file but drops their record ids', async () => {
    const payments = JSON.stringify([
      { id: 'p1', amount: 80000, paidAt: '2026-10-22', note: 'n', transactionRecordId: 'rec-x' }
    ]).replace(/"/g, '""')

    await importDangsCsv(
      's',
      `${NEW_HEADER}\nd1,t,شام,خوراک,علی,200000,2026-10-20,,خیر,,,,,"${payments}"\n`
    )

    const dang = rowToDang(mocks.rows[0], 2)

    expect(dang.paid).toBe(false)
    expect(dang.payments).toEqual([{ id: 'p1', amount: 80000, paidAt: '2026-10-22', note: 'n' }])
  })
})
