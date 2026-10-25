import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getDefaultSettings, saveSettings } from './settings'
import { clearPersonalLink, enqueueSharedLink, runSharedLinks } from './sharedLink'
import { linkSharedSave, readSharedLinks, typedTitle } from './sharedLinkPrefs'
import { sharedRecordForm, sharedRef } from './sharedLinkRows'
import { PERIOD_SETTINGS_SHEET } from './sheetNames'
import { buildHeaders } from './sheetsHeaders'

const { writeToWorkspace, batchFetch } = vi.hoisted(() => ({
  writeToWorkspace: vi.fn(async (_id: string, _operation: unknown) => true),
  batchFetch: vi.fn()
}))

vi.mock('./workspaceBridge', () => ({ writeToWorkspace, drainWorkspace: async () => true }))
vi.mock('./sheetsRows', () => ({ batchFetchSheetRangesFromApi: batchFetch }))
vi.mock('./sheetsEnsure', () => ({ getSheetTitles: async () => ['هزینه'] }))
vi.mock('./auth', () => ({ getUserEmail: () => 'me@x.com' }))

/** The personal side of the link: what reaches the queue, and the link column on the record. */

const SHARED = 'shared-1'
const headers = buildHeaders(sharedRecordForm('expense').fields)
const PERSONAL_HEADER = [
  'شناسه',
  'زمان ثبت',
  'تاریخ',
  'عنوان',
  'دسته‌بندی',
  'مبلغ',
  'توضیحات',
  'حساب مشترک'
]

const task = (kind: 'update') => ({
  kind,
  sharedId: SHARED,
  personalId: 'p1',
  recordId: 'r1',
  ref: sharedRef('p1', 'r1'),
  type: 'expense' as const,
  values: { date: '2026-10-20', title: 'میوه', amount: 1, category: 'خوراک' },
  split: '' as const,
  payer: ''
})

beforeEach(() => {
  localStorage.clear()
  writeToWorkspace.mockClear()
  batchFetch.mockReset()
  vi.stubGlobal('navigator', { onLine: true })
})

describe('the personal side of the link', () => {
  it('takes the typed title only: an auto title or a vehicle title never reaches the copy', async () => {
    expect(
      typedTitle({ title: 'رستوران خصوصی · کافه', category: 'رستوران خصوصی', subCategory: 'کافه' })
    ).toBe('')
    expect(typedTitle({ title: 'رستوران خصوصی', category: 'رستوران خصوصی' })).toBe('')
    expect(typedTitle({ title: 'سوخت پژو', category: 'خودرو' })).toBe('')
    expect(typedTitle({ title: ' شام ', category: 'رستوران خصوصی' })).toBe('شام')

    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'p1',
      spreadsheets: [
        { id: 'p1', name: 'حسابداری · من', createdAt: '' },
        { id: SHARED, name: 'حسابداری · مشترک خانه', createdAt: '', kind: 'shared' }
      ]
    })
    vi.stubGlobal('navigator', { onLine: false })
    linkSharedSave(
      'p1',
      'r1',
      'expense',
      {
        date: '2026-10-20',
        title: 'رستوران خصوصی · کافه',
        amount: 5,
        category: 'رستوران خصوصی',
        subCategory: 'کافه',
        note: 'n'
      },
      { on: true, sharedId: SHARED, category: '', split: '', payer: '', title: '' }
    )
    await vi.waitFor(() => expect(readSharedLinks()).toHaveLength(1))

    expect(readSharedLinks()[0].values).toEqual({
      date: '2026-10-20',
      title: '',
      amount: 5,
      category: 'رستوران خصوصی'
    })
  })

  it('never takes the stored auto or vehicle title of an edited record as typed', () => {
    const stored = { title: 'A · B', category: 'A', subCategory: 'B' }

    expect(typedTitle({ ...stored, subCategory: 'C' }, stored)).toBe('')
    expect(typedTitle({ ...stored, category: 'D', subCategory: '' }, stored)).toBe('')

    const car = { title: 'سوخت پژو', category: 'خودرو', subCategory: 'سوخت' }

    expect(typedTitle({ ...car, category: 'رفت‌وآمد', subCategory: '' }, car)).toBe('')
    expect(typedTitle({ ...stored, title: 'شام' }, stored)).toBe('شام')
  })

  it('a save after «لغو ارسال» of a failed create queues nothing (the record is unlinked)', async () => {
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'p1',
      spreadsheets: [
        { id: 'p1', name: 'حسابداری · من', createdAt: '' },
        { id: SHARED, name: 'حسابداری · مشترک خانه', createdAt: '', kind: 'shared' }
      ]
    })
    vi.stubGlobal('navigator', { onLine: false })
    linkSharedSave(
      'p1',
      'r1',
      'expense',
      { date: '2026-10-20', amount: 5, category: 'خوراک' },
      { on: false, sharedId: SHARED, category: '', split: '', payer: '', unlinked: true },
      SHARED
    )
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(readSharedLinks()).toEqual([])
  })

  it('a tick on a record still marked with a previous shared account creates a fresh copy', async () => {
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'p1',
      spreadsheets: [
        { id: 'p1', name: 'حسابداری · من', createdAt: '' },
        { id: SHARED, name: 'حسابداری · مشترک خانه', createdAt: '', kind: 'shared' }
      ]
    })
    vi.stubGlobal('navigator', { onLine: false })
    linkSharedSave(
      'p1',
      'r1',
      'expense',
      { date: '2026-10-20', amount: 5, category: 'خوراک' },
      { on: true, sharedId: SHARED, category: '', split: '', payer: '', title: '' },
      'old-shared'
    )
    await vi.waitFor(() => expect(readSharedLinks()).toHaveLength(1))

    expect(readSharedLinks()[0]).toMatchObject({
      kind: 'create',
      sharedId: SHARED,
      values: { category: 'خوراک' }
    })
  })

  it('clears the personal link when an update finds no copy (the shared account removed it)', async () => {
    batchFetch.mockImplementation(async (id: string) =>
      id === 'p1'
        ? new Map([
            [
              'هزینه',
              [PERSONAL_HEADER, ['r1', 't', '2026-10-20', 'میوه', 'خوراک', '1', '', SHARED]]
            ]
          ])
        : new Map([
            [PERIOD_SETTINGS_SHEET, [['کلید'], ['نقش:me@x.com', 'owner']]],
            ['هزینه', [headers]]
          ])
    )
    enqueueSharedLink(task('update'))
    await runSharedLinks()

    const [target, operation] = writeToWorkspace.mock.calls[0] as unknown as [
      string,
      { type: string; row: string[] }
    ]

    expect(target).toBe('p1')
    expect(operation.type).toBe('update')
    expect(operation.row[PERSONAL_HEADER.indexOf('حساب مشترک')]).toBe('')
    expect(readSharedLinks()).toEqual([])
  })

  it('clearPersonalLink blanks only the link cell of the personal row', async () => {
    batchFetch.mockResolvedValue(
      new Map([
        ['هزینه', [PERSONAL_HEADER, ['r1', 't', '2026-10-20', 'میوه', 'خوراک', '1', 'n', SHARED]]]
      ])
    )
    await clearPersonalLink('p1', 'r1', 'expense')

    const [, operation] = writeToWorkspace.mock.calls[0] as unknown as [string, { row: string[] }]

    expect(operation.row).toEqual(['r1', 't', '2026-10-20', 'میوه', 'خوراک', '1', 'n', ''])
  })
})
