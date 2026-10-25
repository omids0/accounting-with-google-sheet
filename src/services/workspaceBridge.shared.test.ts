import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getDefaultSettings, saveSettings } from './settings'
import { writeToWorkspace } from './workspaceBridge'
import { WALLET_ACCOUNT_FIELD_LABEL } from '../components/form/recordFieldIds'
import { SHARED_LINK_FIELD_LABEL, SHARED_REF_FIELD_LABEL } from '../components/form/sharedFields'

const { ensureManySheetsWithHeaders } = vi.hoisted(() => ({
  ensureManySheetsWithHeaders: vi.fn(async (_id: string, _specs: unknown) => undefined)
}))

vi.mock('./sheets', () => ({
  executeOutboxOperation: async (_id: string, op: { sheetName: string }) => op.sheetName,
  isQuotaExceededError: () => false
}))
vi.mock('./sheetSyncAnnounce', () => ({ announceWrites: async () => undefined }))
vi.mock('./sheetsEnsure', () => ({ ensureManySheetsWithHeaders }))

const SHARED = 'shared-1'

beforeEach(() => {
  localStorage.clear()
  ensureManySheetsWithHeaders.mockClear()
  saveSettings({
    ...getDefaultSettings(),
    spreadsheetId: 'personal-1',
    spreadsheets: [
      { id: 'personal-1', name: 'حسابداری · من', createdAt: '' },
      { id: SHARED, name: 'حسابداری · مشترک خانه', createdAt: '', kind: 'shared' }
    ]
  })
})

describe('a bridged copy into the shared account', () => {
  it('prepares the shared record tab with the shared columns, never the personal ones', async () => {
    await writeToWorkspace(SHARED, { type: 'append', sheetName: 'هزینه', row: ['c1'] })

    const [, specs] = ensureManySheetsWithHeaders.mock.calls[0] as unknown as [
      string,
      { sheetName: string; headers: string[] }[]
    ]

    expect(specs[0].sheetName).toBe('هزینه')
    expect(specs[0].headers).toContain(SHARED_REF_FIELD_LABEL)
    expect(specs[0].headers).not.toContain(SHARED_LINK_FIELD_LABEL)
    expect(specs[0].headers).not.toContain(WALLET_ACCOUNT_FIELD_LABEL)
  })
})
