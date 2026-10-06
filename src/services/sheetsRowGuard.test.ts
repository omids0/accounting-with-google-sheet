import { beforeEach, describe, expect, it, vi } from 'vitest'

import { columnLetter, toSheetCellValue } from './sheetsCellValues'

let remoteRows: string[][] = []

const fetchSheetRangeFromApi = vi.fn(async () => remoteRows.map(row => [...row]))

vi.mock('./sheetsRows', () => ({ fetchSheetRangeFromApi }))

const HEADER = ['شناسه', 'زمان ثبت', 'عنوان', 'مبلغ']

async function guard() {
  return import('./sheetsRowGuard')
}

describe('toSheetCellValue', () => {
  it('keeps plain numbers numeric so sheet formulas still add them up', () => {
    expect(toSheetCellValue('1500000')).toBe(1500000)
    expect(toSheetCellValue('-250')).toBe(-250)
    expect(toSheetCellValue('0')).toBe(0)
    expect(toSheetCellValue('12.5')).toBe(12.5)
  })

  it('keeps text that Sheets would have mangled as text', () => {
    expect(toSheetCellValue('09121234567')).toBe('09121234567')
    expect(toSheetCellValue('1234567890123456')).toBe('1234567890123456')
    expect(toSheetCellValue('+989121234567')).toBe('+989121234567')
    expect(toSheetCellValue('1405/07/14')).toBe('1405/07/14')
    expect(toSheetCellValue('=IMPORTXML("https://x")')).toBe('=IMPORTXML("https://x")')
    expect(toSheetCellValue('TRUE')).toBe('TRUE')
    expect(toSheetCellValue('')).toBe('')
  })
})

describe('columnLetter', () => {
  it('handles columns past Z', () => {
    expect(columnLetter(1)).toBe('A')
    expect(columnLetter(26)).toBe('Z')
    expect(columnLetter(27)).toBe('AA')
    expect(columnLetter(52)).toBe('AZ')
  })
})

describe('resolveTargetRow', () => {
  beforeEach(() => {
    fetchSheetRangeFromApi.mockClear()
    remoteRows = [
      HEADER,
      ['a', 't1', 'نان', '100'],
      ['b', 't2', 'شیر', '200'],
      ['c', 't3', 'چای', '300']
    ]
  })

  it('keeps the old row number for operations queued without a snapshot', async () => {
    const { createRowGuardSession, resolveTargetRow } = await guard()

    await expect(resolveTargetRow(createRowGuardSession(), 's', 'x', 3)).resolves.toBe(3)
    expect(fetchSheetRangeFromApi).not.toHaveBeenCalled()
  })

  it('uses the stored row number when the row is still there', async () => {
    const { createRowGuardSession, resolveTargetRow } = await guard()

    await expect(
      resolveTargetRow(createRowGuardSession(), 's', 'x', 3, ['b', 't2', 'شیر', '200'])
    ).resolves.toBe(3)
  })

  it('follows the record by ID after another device removed a row above it', async () => {
    remoteRows = [HEADER, ['b', 't2', 'شیر', '200'], ['c', 't3', 'چای', '300']]
    const { createRowGuardSession, resolveTargetRow } = await guard()

    await expect(
      resolveTargetRow(createRowGuardSession(), 's', 'x', 4, ['c', 't3', 'چای', '300'])
    ).resolves.toBe(3)
  })

  it('ignores number formatting differences', async () => {
    remoteRows = [HEADER, ['a', 't1', 'نان', '1,500,000']]
    const { createRowGuardSession, resolveTargetRow } = await guard()

    await expect(
      resolveTargetRow(createRowGuardSession(), 's', 'x', 2, ['a', 't1', 'نان', '۱۵۰۰۰۰۰'])
    ).resolves.toBe(2)
  })

  it('refuses to touch a row when the record is gone', async () => {
    remoteRows = [HEADER, ['a', 't1', 'نان', '100'], ['c', 't3', 'چای', '300']]
    const { createRowGuardSession, resolveTargetRow, RowConflictError } = await guard()

    await expect(
      resolveTargetRow(createRowGuardSession(), 's', 'x', 3, ['b', 't2', 'شیر', '200'])
    ).rejects.toBeInstanceOf(RowConflictError)
  })

  it('matches sheets without an ID column by full content', async () => {
    remoteRows = [
      ['نوع', 'دسته‌بندی'],
      ['هزینه', 'خوراک'],
      ['هزینه', 'دارو']
    ]
    const { createRowGuardSession, resolveTargetRow } = await guard()

    await expect(
      resolveTargetRow(createRowGuardSession(), 's', 'cats', 2, ['هزینه', 'دارو'])
    ).resolves.toBe(3)
  })

  it('reads each sheet once per flush and tracks the writes it sends', async () => {
    const { createRowGuardSession, resolveTargetRow, trackDelete } = await guard()
    const session = createRowGuardSession()

    const first = await resolveTargetRow(session, 's', 'x', 2, ['a', 't1', 'نان', '100'])

    trackDelete(session, 'x', first)

    // Locally "a" is gone too, so the next queued op already points at row 3 for "c".
    await expect(resolveTargetRow(session, 's', 'x', 3, ['c', 't3', 'چای', '300'])).resolves.toBe(3)
    expect(fetchSheetRangeFromApi).toHaveBeenCalledTimes(1)
  })

  it('detects an append that already landed before a lost response', async () => {
    const { appendAlreadyApplied, createRowGuardSession } = await guard()

    await expect(
      appendAlreadyApplied(createRowGuardSession(), 's', 'x', ['b', 't2', 'شیر', '200'])
    ).resolves.toBe(true)
    await expect(
      appendAlreadyApplied(createRowGuardSession(), 's', 'x', ['z', 't9', 'قهوه', '50'])
    ).resolves.toBe(false)
  })
})
