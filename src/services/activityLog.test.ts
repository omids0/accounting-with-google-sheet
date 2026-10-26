import { beforeEach, describe, expect, it, vi } from 'vitest'

const appendSheetRow = vi.fn(async (..._args: unknown[]) => undefined)
const ensureSheetWithHeaders = vi.fn(async () => undefined)
let email: string | null = 'Me@Example.com'

vi.mock('./auth', () => ({ getUserEmail: () => email, getUserName: () => 'امید' }))
vi.mock('./sheets', () => ({ appendSheetRow, ensureSheetWithHeaders }))

const { activityToRow, buildActivityEntry, fetchActivityLog, logActivity, rowToActivity } =
  await import('./activityLog')
const { ACTIVITY_LOG_FORM, planActivitySweepYears } = await import('./activityLogSweep')
const { firstPersonSummary, summaryFor } = await import('./activityLogText')
const { ACTIVITY_LOG_HEADERS } = await import('./sheetHeaders')
const { ACTIVITY_LOG_SHEET } = await import('./sheetNames')
const { clearStore, initStore, setSheetAllRows } = await import('./spreadsheetStore')

const SHEET_ID = 'sheet-activity-log'

describe('summaryFor', () => {
  it('writes the lines the wireframe shows', () => {
    expect(summaryFor('create', 'records', 'تعمیر یخچال')).toBe('«تعمیر یخچال» را ثبت کرد')
    expect(summaryFor('pay', 'installments', 'قسط مهر وام مسکن')).toBe(
      'قسط مهر وام مسکن را پرداخت‌شده زد'
    )
    expect(summaryFor('budget', 'budgets', 'خوراک', { amount: 900_000 })).toBe(
      'بودجهٔ «خوراک» را به ۹۰۰ هزار تغییر داد'
    )
  })

  it('covers every action', () => {
    expect(summaryFor('update', 'checks', 'چک ۱۲')).toBe('«چک ۱۲» را ویرایش کرد')
    expect(summaryFor('delete', 'records', 'x', { count: 3 })).toBe('۳ مورد را حذف کرد')
    expect(summaryFor('unpay', 'dang', 'بدهی «علی»')).toBe('بدهی «علی» را پرداخت‌نشده کرد')
    expect(summaryFor('budget', 'budgets', 'خوراک')).toBe('بودجهٔ «خوراک» را برداشت')
    expect(summaryFor('category', 'categories', 'خانه', { kind: 'rename', to: 'منزل' })).toBe(
      'دستهٔ «خانه» را به «منزل» تغییر داد'
    )
    expect(summaryFor('reconcile', 'wallet', 'ملت')).toBe('موجودی «ملت» را با پیامک‌ها تطبیق داد')
    expect(summaryFor('recurring', 'recurring', 'اجاره', { count: 2 })).toBe(
      '۲ تکرار ماهانه را ثبت کرد'
    )
    expect(summaryFor('goal', 'goals', 'سفر', { amount: -50_000 })).toBe(
      '۵۰ هزار از هدف «سفر» برداشت'
    )
  })

  it('turns my own lines into first person', () => {
    expect(firstPersonSummary('قسط مهر را پرداخت‌شده زد')).toBe('قسط مهر را پرداخت‌شده زدم')
    expect(firstPersonSummary('نسخهٔ من کنار گذاشته شد')).toBe('نسخهٔ من کنار گذاشته شد')
  })

  it('turns the debt and receivable payment lines into first person too', () => {
    // The lines dangPayments.ts and receivablesCrud.ts write for a piece paid or taken back.
    expect(firstPersonSummary('۳۰ هزار از بدهی «لامپ» را پرداخت کرد')).toBe(
      '۳۰ هزار از بدهی «لامپ» را پرداخت کردم'
    )
    expect(firstPersonSummary('پرداخت ۳۰ هزار از بدهی «لامپ» را حذف کرد')).toBe(
      'پرداخت ۳۰ هزار از بدهی «لامپ» را حذف کردم'
    )
    expect(firstPersonSummary('دریافت ۳۰ هزار از طلب «وام» را حذف کرد')).toBe(
      'دریافت ۳۰ هزار از طلب «وام» را حذف کردم'
    )
  })
})

describe('activity rows', () => {
  beforeEach(() => {
    email = 'Me@Example.com'
    appendSheetRow.mockClear()
    ensureSheetWithHeaders.mockClear()
    clearStore(SHEET_ID)
    initStore(SHEET_ID)
  })

  it('builds a row in header order and reads it back', () => {
    const entry = buildActivityEntry(
      { action: 'create', module: 'records', itemId: 'r1', summary: 's' },
      new Date('2026-10-13T10:00:00Z')
    )!
    const row = activityToRow(entry)

    expect(row).toHaveLength(ACTIVITY_LOG_HEADERS.length)
    expect(row.slice(1, 7)).toEqual([
      '2026-10-13T10:00:00.000Z',
      'me@example.com',
      'امید',
      'create',
      'records',
      'r1'
    ])
    expect(rowToActivity(row)).toEqual(entry)
  })

  it('queues one append and creates the tab first when missing', async () => {
    logActivity(SHEET_ID, { action: 'pay', module: 'checks', itemId: 'c1', summary: 's' })
    await vi.waitFor(() => expect(appendSheetRow).toHaveBeenCalledTimes(1))

    expect(ensureSheetWithHeaders).toHaveBeenCalledTimes(1)
    expect(appendSheetRow.mock.calls[0][1]).toBe(ACTIVITY_LOG_SHEET)
    expect(appendSheetRow.mock.calls[0][3]).toEqual({ skipActivity: true, skipRevision: true })
  })

  it('does nothing when signed out', async () => {
    email = null
    logActivity(SHEET_ID, { action: 'pay', module: 'checks', itemId: 'c1', summary: 's' })
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(appendSheetRow).not.toHaveBeenCalled()
  })

  it('lists the mirror newest first, a page at a time', async () => {
    setSheetAllRows(SHEET_ID, ACTIVITY_LOG_SHEET, [
      ACTIVITY_LOG_HEADERS,
      ['a', '2026-10-01T00:00:00Z', 'x@y', 'X', 'create', 'records', '', 'one', 'Android'],
      ['b', '2026-10-03T00:00:00Z', 'x@y', 'X', 'create', 'records', '', 'three', 'Android'],
      ['c', '2026-10-02T00:00:00Z', 'x@y', 'X', 'create', 'records', '', 'two', 'Android']
    ])

    expect((await fetchActivityLog(SHEET_ID, 2, 0)).map(entry => entry.summary)).toEqual([
      'three',
      'two'
    ])
    expect((await fetchActivityLog(SHEET_ID, 2, 2)).map(entry => entry.summary)).toEqual(['one'])
  })
})

describe('planActivitySweepYears', () => {
  const rows = (dates: string[]) => [
    ACTIVITY_LOG_HEADERS,
    ...dates.map((at, index) => [`id${index}`, at, '', '', 'create', 'records', '', '', ''])
  ]

  it('keeps a tab at or under the limit', () => {
    expect(planActivitySweepYears(rows(['2024-01-01', '2025-01-01']), 1405, 2)).toEqual([])
  })

  it('moves the past years that hold the oldest rows', () => {
    // 1402 and 1403 are past the 2 newest rows; the current year 1405 never moves.
    const dates = ['2023-06-01', '2024-06-01', '2026-06-01', '2026-07-01', '2026-08-01']

    expect(planActivitySweepYears(rows(dates), 1405, 2)).toEqual([1402, 1403])
    expect(planActivitySweepYears(rows(dates), 1405, 4)).toEqual([1402])
  })

  it('reads the «زمان» column as the date of a pseudo form', () => {
    expect(ACTIVITY_LOG_FORM.fields[0].label).toBe(ACTIVITY_LOG_HEADERS[1])
  })
})
