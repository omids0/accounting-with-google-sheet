import { beforeEach, describe, expect, it, vi } from 'vitest'

import { sharedRef } from './sharedLinkRows'
import { applyNotice, type SharedNotice } from './sharedNotices'
import { CATEGORIES_SHEET } from './sheetNames'
import { setWorkspaceType } from './workspace'

const { writeToWorkspace, batchFetch } = vi.hoisted(() => ({
  writeToWorkspace: vi.fn(async (_id: string, _operation: unknown) => true),
  batchFetch: vi.fn()
}))

vi.mock('./workspaceBridge', () => ({ writeToWorkspace, drainWorkspace: async () => true }))
vi.mock('./sheetsRows', () => ({ batchFetchSheetRangesFromApi: batchFetch }))
vi.mock('./sheetsEnsure', () => ({ getSheetTitles: async () => ['هزینه'] }))
vi.mock('./auth', () => ({ getUserEmail: () => 'me@x.com' }))
vi.mock('./settings', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getSettings: () => ({ spreadsheetId: SHARED, forms: [] }),
  getSpreadsheets: () => [{ id: 'p1', name: 'شخصی', createdAt: '' }]
}))

const SHARED = 'shared-1'
const REF = sharedRef('p1', 'r1')
const PERSONAL_HEADER = ['شناسه', 'زمان ثبت', 'تاریخ', 'عنوان', 'دسته‌بندی', 'مبلغ', 'حساب مشترک']
const personalRow = ['r1', 't', '2026-10-20', 'میوه', 'خوراک', '850000', SHARED]

const notice = (patch: Partial<SharedNotice> = {}): SharedNotice => ({
  recordRef: REF,
  field: 'amount',
  old: '850000',
  new: '900000',
  by: 'mina@x.com',
  time: '2026-10-26T10:00:00.000Z',
  kind: 'edit',
  ...patch
})

const personal = (categories: string[][] = [['نوع'], ['هزینه', 'خوراک']]) =>
  batchFetch.mockResolvedValue(
    new Map([
      ['هزینه', [PERSONAL_HEADER, personalRow]],
      ['درآمد', [PERSONAL_HEADER]],
      [CATEGORIES_SHEET, categories]
    ])
  )

const written = () =>
  writeToWorkspace.mock.calls.map(([id, op]) => [id, op]) as unknown as [
    string,
    { type: string; row?: string[]; rowNumber?: number } | { type: string; rowNumber: number }[]
  ][]

beforeEach(() => {
  localStorage.clear()
  writeToWorkspace.mockClear()
  batchFetch.mockReset()
  vi.stubGlobal('navigator', { onLine: true })
  vi.restoreAllMocks()
})

describe('applyNotice', () => {
  it('amount: changes only the amount of the personal record', async () => {
    personal()

    expect(await applyNotice(notice())).toBe('applied')

    const [[target, operation]] = written() as [string, { type: string; row: string[] }][]

    expect(target).toBe('p1')
    expect(operation.type).toBe('update')
    expect(operation.row).toEqual(['r1', 't', '2026-10-20', 'میوه', 'خوراک', '900000', SHARED])
  })

  it('category with no personal category of that name: changes nothing, skipped', async () => {
    personal()

    expect(await applyNotice(notice({ field: 'category', old: 'خوراک', new: 'رستوران' }))).toBe(
      'skipped'
    )
    expect(writeToWorkspace).not.toHaveBeenCalled()
  })

  it('category of an existing personal category is applied', async () => {
    personal([['نوع'], ['هزینه', 'خوراک'], ['هزینه', 'رستوران']])

    expect(await applyNotice(notice({ field: 'category', old: 'خوراک', new: 'رستوران' }))).toBe(
      'applied'
    )

    const [[, operation]] = written() as [string, { row: string[] }][]

    expect(operation.row).toEqual(['r1', 't', '2026-10-20', 'میوه', 'رستوران', '850000', SHARED])
  })

  it('delete: clears only the shared marker', async () => {
    personal()

    await applyNotice(notice({ field: 'delete', kind: 'delete', new: '' }))

    const [[, operation]] = written() as [string, { row: string[] }][]

    expect(operation.row).toEqual(['r1', 't', '2026-10-20', 'میوه', 'خوراک', '850000', ''])
  })

  it('a field outside amount, title, category and delete is skipped with no read or write', async () => {
    personal()

    for (const field of ['payer', 'date', '__proto__'])
      expect(await applyNotice(notice({ field: field as SharedNotice['field'], new: 'x' }))).toBe(
        'skipped'
      )
    expect(batchFetch).not.toHaveBeenCalled()
    expect(writeToWorkspace).not.toHaveBeenCalled()
  })

  it('a record reference of a spreadsheet that is not the user’s own is skipped', async () => {
    personal()

    expect(await applyNotice(notice({ recordRef: sharedRef('foreign', 'r1') }))).toBe('skipped')
    expect(batchFetch).not.toHaveBeenCalled()
    expect(writeToWorkspace).not.toHaveBeenCalled()
  })

  it('a reference to a spreadsheet that is not a personal one is skipped', async () => {
    personal()
    setWorkspaceType('p1', 'shared')

    expect(await applyNotice(notice())).toBe('skipped')
    expect(batchFetch).not.toHaveBeenCalled()
    expect(writeToWorkspace).not.toHaveBeenCalled()
    setWorkspaceType('p1', 'personal')
  })

  it('title is applied to the personal record', async () => {
    personal()

    expect(await applyNotice(notice({ field: 'title', old: 'میوه', new: 'سبزی' }))).toBe('applied')

    const [[, operation]] = written() as [string, { row: string[] }][]

    expect(operation.row).toEqual(['r1', 't', '2026-10-20', 'سبزی', 'خوراک', '850000', SHARED])
  })
})
