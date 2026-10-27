import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  records: [] as { id: string }[],
  sheetIds: [] as string[][] | Error,
  online: true
}))

vi.mock('./settings', () => ({
  getSettings: () => ({ forms: [{ type: 'expense', sheetName: 'هزینه' }] })
}))
vi.mock('./sheets', () => ({ fetchRecords: async () => mocks.records }))
vi.mock('./sheetsRows', () => ({
  fetchSheetRangeFromApi: async () => {
    if (mocks.sheetIds instanceof Error) throw mocks.sheetIds

    return mocks.sheetIds
  }
}))

const { liveRecordOfSms } = await import('./bankSmsRecordOf')
const { writeSmsCoverage, recordOfSms } = await import('./bankSmsCoverageStore')
const { BANK_SMS_PREFS_KEY } = await import('./bankSmsPrefs')

const header = ['id']

describe('liveRecordOfSms', () => {
  beforeEach(() => {
    localStorage.removeItem(BANK_SMS_PREFS_KEY)
    mocks.records = []
    mocks.sheetIds = [header]
    writeSmsCoverage('m1', 'rec-1', 3_000_000)
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => mocks.online)
    mocks.online = true
  })

  it('the record is in this tab: reused', async () => {
    mocks.records = [{ id: 'rec-1' }]
    expect(await liveRecordOfSms('sid', 'm1', 'expense')).toBe('rec-1')
  })

  it('NEW5: not in this tab (stale) but the sheet holds it (another tab wrote it): reused, entry kept', async () => {
    mocks.sheetIds = [header, ['rec-1']]
    expect(await liveRecordOfSms('sid', 'm1', 'expense')).toBe('rec-1')
    expect(recordOfSms('m1')).toBe('rec-1')
  })

  it('N2: neither this tab nor the sheet has it (deleted): the entry is dropped, a new record is due', async () => {
    expect(await liveRecordOfSms('sid', 'm1', 'expense')).toBe('')
    expect(recordOfSms('m1')).toBe('')
  })

  it('the sheet cannot be read (offline, or the read fails): the record is taken as deleted here', async () => {
    mocks.online = false
    expect(await liveRecordOfSms('sid', 'm1', 'expense')).toBe('')
    writeSmsCoverage('m1', 'rec-1', 3_000_000)
    mocks.online = true
    mocks.sheetIds = new Error('500')
    expect(await liveRecordOfSms('sid', 'm1', 'expense')).toBe('')
  })

  it('an SMS with no stored record has nothing to reuse', async () => {
    expect(await liveRecordOfSms('sid', 'other', 'expense')).toBe('')
  })
})
