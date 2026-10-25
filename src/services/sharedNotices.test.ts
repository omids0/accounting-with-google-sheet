import { beforeEach, describe, expect, it, vi } from 'vitest'

import { onSharedCopyChanged } from './sharedCopyChanged'
import { enqueueSharedLink, runSharedLinks } from './sharedLink'
import { buildCopyRow, sharedRecordForm, sharedRef } from './sharedLinkRows'
import {
  applyNotice,
  dismissNotice,
  raiseNotice,
  readNotices,
  refreshNotices,
  SHARED_NOTICE_REFRESH_MS,
  type SharedNotice
} from './sharedNotices'
import { CATEGORIES_SHEET, PERIOD_SETTINGS_SHEET } from './sheetNames'
import { buildHeaders } from './sheetsHeaders'
import { SHARED_CREATOR_FIELD_ID, SHARED_REF_FIELD_ID } from '../components/form/sharedFields'

const { setMemberSetting, writeToWorkspace, batchFetch } = vi.hoisted(() => ({
  setMemberSetting: vi.fn(async (_id: string, _key: string, _value: string) => undefined),
  writeToWorkspace: vi.fn(async (_id: string, _operation: unknown) => true),
  batchFetch: vi.fn()
}))

vi.mock('./buildingSettings', () => ({ setMemberSetting }))
vi.mock('./workspaceBridge', () => ({ writeToWorkspace, drainWorkspace: async () => true }))
vi.mock('./sheetsRows', () => ({ batchFetchSheetRangesFromApi: batchFetch }))
vi.mock('./sheetsEnsure', () => ({ getSheetTitles: async () => ['هزینه'] }))
vi.mock('./auth', () => ({ getUserEmail: () => 'me@x.com' }))
vi.mock('./settings', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getSettings: () => ({ spreadsheetId: SHARED, forms: [] })
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

const noticeRow = (email: string, id: string, value: SharedNotice) => [
  `اعلان:${email}:${id}`,
  JSON.stringify(value)
]

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
  setMemberSetting.mockClear()
  writeToWorkspace.mockClear()
  batchFetch.mockReset()
  vi.stubGlobal('navigator', { onLine: true })
  vi.restoreAllMocks()
})

describe('raiseNotice', () => {
  const change = { field: 'amount', old: '1', new: '2', kind: 'edit' } as const

  it('is a no-op when the creator edits their own copy', async () => {
    const copy = { ref: REF, creator: 'Me@x.com ' }

    expect(await raiseNotice(SHARED, copy, 'me@x.com', change)).toBe(false)
    expect(setMemberSetting).not.toHaveBeenCalled()
  })

  it('is a no-op for a copy without a share: reference', async () => {
    expect(await raiseNotice(SHARED, { ref: '', creator: 'a@x.com' }, 'me@x.com', change)).toBe(
      false
    )
    expect(await raiseNotice(SHARED, { ref: 'x:1', creator: 'a@x.com' }, 'me@x.com', change)).toBe(
      false
    )
    expect(setMemberSetting).not.toHaveBeenCalled()
  })

  it('writes one row keyed اعلان:<creator>:<id> with the notice as JSON', async () => {
    expect(await raiseNotice(SHARED, { ref: REF, creator: 'Nima@x.com' }, 'me@x.com', change)).toBe(
      true
    )
    expect(setMemberSetting).toHaveBeenCalledTimes(1)

    const [target, key, value] = setMemberSetting.mock.calls[0]

    expect(target).toBe(SHARED)
    expect(key).toMatch(/^اعلان:nima@x\.com:[0-9a-f-]{36}$/)
    expect(JSON.parse(value)).toMatchObject({
      recordRef: REF,
      field: 'amount',
      old: '1',
      new: '2',
      by: 'me@x.com',
      kind: 'edit'
    })
    expect(Number.isNaN(Date.parse(JSON.parse(value).time))).toBe(false)
  })
})

describe('onSharedCopyChanged', () => {
  const values = {
    title: 'میوه',
    amount: '850000',
    category: 'خوراک',
    [SHARED_CREATOR_FIELD_ID]: 'nima@x.com',
    [SHARED_REF_FIELD_ID]: REF
  }

  it('raises one notice per changed field, none for an unchanged one', async () => {
    await onSharedCopyChanged({
      kind: 'edit',
      recordId: 'c1',
      values,
      next: { amount: 900000, title: 'میوه', category: 'رستوران' }
    })

    const fields = setMemberSetting.mock.calls.map(([, , value]) => JSON.parse(value).field)

    expect(fields.sort()).toEqual(['amount', 'category'])
  })

  it('a delete raises one delete notice', async () => {
    await onSharedCopyChanged({ kind: 'delete', recordId: 'c1', values })

    expect(setMemberSetting).toHaveBeenCalledTimes(1)
    expect(JSON.parse(setMemberSetting.mock.calls[0][2])).toMatchObject({
      field: 'delete',
      kind: 'delete',
      title: 'میوه'
    })
  })
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
})

describe('reading and dismissing', () => {
  const rows = [
    ['کلید', 'مقدار'],
    ['نقش:me@x.com', 'owner'],
    noticeRow('me@x.com', 'n1', notice()),
    noticeRow('mina@x.com', 'n2', notice({ by: 'me@x.com' })),
    noticeRow('ME@x.com', 'n3', notice({ field: 'title', old: 'a', new: 'b' }))
  ]

  it('readNotices returns only the given e-mail’s notices, after one throttled read', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    batchFetch.mockResolvedValue(new Map([[PERIOD_SETTINGS_SHEET, rows]]))

    await refreshNotices('shared-r')
    await refreshNotices('shared-r')

    expect(batchFetch).toHaveBeenCalledTimes(1)
    expect(readNotices('shared-r', 'me@x.com').map(item => item.id)).toEqual(['n1', 'n3'])
    expect(readNotices('shared-r', 'mina@x.com').map(item => item.id)).toEqual(['n2'])

    vi.spyOn(Date, 'now').mockReturnValue(1_000_000 + SHARED_NOTICE_REFRESH_MS + 1)
    await refreshNotices('shared-r')

    expect(batchFetch).toHaveBeenCalledTimes(2)
  })

  it('dismissNotice deletes only that notice row', async () => {
    batchFetch.mockResolvedValue(new Map([[PERIOD_SETTINGS_SHEET, rows]]))

    await dismissNotice('shared-d', 'n3')

    const [[target, operations]] = written() as [string, { type: string; rowNumber: number }[]][]

    expect(target).toBe('shared-d')
    expect(operations).toEqual([expect.objectContaining({ type: 'delete', rowNumber: 5 })])
  })
})

describe('superseding', () => {
  it('saving the personal record removes the pending notice for that record only', async () => {
    const form = sharedRecordForm('expense')
    const headers = buildHeaders(form.fields)
    const copy = buildCopyRow({
      form,
      headers,
      recordId: 'copy-1',
      values: { date: '2026-10-20', title: 'میوه', amount: 900000 },
      split: 'equal',
      payer: 'me@x.com',
      creator: 'me@x.com',
      category: 'خوراک',
      ref: REF
    })

    batchFetch.mockResolvedValue(
      new Map([
        [
          PERIOD_SETTINGS_SHEET,
          [
            ['کلید'],
            ['نقش:me@x.com', 'owner'],
            noticeRow('me@x.com', 'other', notice({ recordRef: sharedRef('p1', 'r9') })),
            noticeRow('me@x.com', 'mine', notice())
          ]
        ],
        [CATEGORIES_SHEET, [['نوع'], ['هزینه', 'خوراک']]],
        ['هزینه', [headers, copy]]
      ])
    )
    enqueueSharedLink({
      kind: 'update',
      sharedId: SHARED,
      personalId: 'p1',
      recordId: 'r1',
      ref: REF,
      type: 'expense',
      values: { date: '2026-10-20', title: 'میوه', amount: 850000, category: '' },
      split: '',
      payer: ''
    })
    await runSharedLinks()

    const deletes = written()
      .map(([, operation]) => operation)
      .filter(Array.isArray)

    expect(deletes).toEqual([[expect.objectContaining({ type: 'delete', rowNumber: 4 })]])
  })
})
