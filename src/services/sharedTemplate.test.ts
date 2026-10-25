import { beforeEach, describe, expect, it, vi } from 'vitest'

import { inviteMember } from './buildingMemberDrive'
import { getDefaultSettings, getSpreadsheets, saveSettings } from './settings'
import {
  NOT_A_SHARED_MESSAGE,
  connectSharedAccount,
  sharedConnectCandidates
} from './sharedConnect'
import {
  buildSharedTemplateRows,
  createSharedSpreadsheet,
  ONE_SHARED_ACCOUNT_MESSAGE,
  sharedSetupError
} from './sharedTemplate'
import { sharedLabel, WORKSPACE_SHARED_VALUE } from './sharedWorkspace'
import { SHARED_ACCOUNT_SHEETS } from './sheetNames'
import { SheetsApiError } from './sheetsApi'
import type { NewSheetTab } from './sheetsCreate'
import { formatSpreadsheetTitle } from './spreadsheetCatalog'
import { getStore, setSheetAllRows } from './spreadsheetStore'
import {
  getWorkspaceType,
  hasSharedAccount,
  setWorkspaceType,
  WORKSPACE_TYPE_ROW
} from './workspace'
import { hasSharedFields } from '../components/form/sharedFields'
import type { CustomForm } from '../types'

const PERIOD = 'تنظیمات دوره'

const state = vi.hoisted(() => ({
  log: [] as string[],
  created: null as null | { title: string; forms: CustomForm[]; tabs: NewSheetTab[] },
  shareError: null as Error | null,
  periodRows: [] as string[][]
}))

vi.mock('./auth', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getUserEmail: () => 'Owner@x.com',
  getUserName: () => 'امید'
}))

vi.mock('./sheetsCreate', () => ({
  createSpreadsheet: async (title: string, forms: CustomForm[], tabs: NewSheetTab[]) => {
    state.log.push('create')
    state.created = { title, forms, tabs }

    return 'new-shared'
  }
}))

vi.mock('./driveShare', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  shareFile: async (_id: string, email: string, role: string) => {
    state.log.push(`share:${email}:${role}`)
    if (state.shareError) throw state.shareError
  }
}))

vi.mock('./sharing', () => ({ refreshSharingInfo: async () => undefined }))

vi.mock('./sheetsOutboxApi', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  appendSheetRowsApi: async (_id: string, sheetName: string, rows: string[][]) => {
    for (const row of rows) state.log.push(`append:${sheetName}:${row[0]}=${row[1]}`)
  }
}))

vi.mock('./sheetsRows', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  batchFetchSheetRangesFromApi: async () =>
    new Map([[PERIOD, [['کلید', 'مقدار', 'زمان ثبت'], ...state.periodRows]]])
}))

const periodRowsOf = (tabs: NewSheetTab[]) => tabs.find(tab => tab.sheetName === PERIOD)?.rows ?? []

beforeEach(() => {
  state.log.length = 0
  state.created = null
  state.shareError = null
  state.periodRows = []
  localStorage.clear()
  saveSettings({
    ...getDefaultSettings(),
    spreadsheetId: 'p1',
    spreadsheets: [{ id: 'p1', name: 'حسابداری · من', createdAt: '' }]
  })
  setWorkspaceType('p1', 'personal')
  // The open (personal) sheet's mirror: creating the shared file must never replace it.
  setSheetAllRows('p1', PERIOD, [['کلید', 'مقدار', 'زمان ثبت']])
})

describe('the rows a new shared account starts with', () => {
  it('holds the type marker and the creator as owner', () => {
    const { period } = buildSharedTemplateRows('خانه ما', ' Owner@X.com ', new Date(2026, 0, 1))

    const stamp = new Date(2026, 0, 1).toLocaleString('fa-IR')

    expect(period).toContainEqual([WORKSPACE_TYPE_ROW, WORKSPACE_SHARED_VALUE, stamp])
    expect(period).toContainEqual(['نقش:owner@x.com', 'owner', stamp])
  })
})

describe('step 2 of the wizard', () => {
  it('needs a name and a partner Google e-mail that is not the creator own', () => {
    expect(sharedSetupError({ name: ' ', email: 'p@x.com' }, 'owner@x.com')).toBe(
      'نام حساب مشترک را بنویسید'
    )
    expect(sharedSetupError({ name: 'خانه', email: 'p@x' }, 'owner@x.com')).toBe(
      'ایمیل گوگل شریک را درست وارد کنید'
    )
    expect(sharedSetupError({ name: 'خانه', email: ' OWNER@x.com' }, 'owner@x.com')).toBe(
      'این ایمیل خود شماست؛ ایمیل گوگل شریک‌تان را وارد کنید'
    )
    expect(sharedSetupError({ name: 'خانه', email: 'p@x.com' }, 'owner@x.com')).toBeNull()
  })
})

describe('createSharedSpreadsheet', () => {
  it('creates the file with the marker inside, registers it, then invites (Drive first)', async () => {
    expect(await createSharedSpreadsheet(' خانه ما ', 'Partner@x.com', 'partner')).toBe(
      'new-shared'
    )

    const created = state.created!

    expect(created.title).toBe(formatSpreadsheetTitle(sharedLabel('خانه ما')))
    expect(created.tabs.map(tab => tab.sheetName).sort()).toEqual([...SHARED_ACCOUNT_SHEETS].sort())
    expect(periodRowsOf(created.tabs).map(row => row.slice(0, 2))).toEqual(
      expect.arrayContaining([
        [WORKSPACE_TYPE_ROW, WORKSPACE_SHARED_VALUE],
        ['نقش:owner@x.com', 'owner']
      ])
    )
    expect(
      created.forms
        .filter(hasSharedFields)
        .map(form => form.type)
        .sort()
    ).toEqual(['expense', 'income'])
    expect(state.log[0]).toBe('create')
    expect(state.log[1]).toBe('share:partner@x.com:writer')
    expect(state.log.slice(2)).toEqual([
      `append:${PERIOD}:نقش:partner@x.com=partner`,
      expect.stringMatching(`^append:${PERIOD}:دعوت:partner@x.com=`)
    ])
    expect(getWorkspaceType('new-shared')).toBe('shared')
    expect(getSpreadsheets().find(sheet => sheet.id === 'new-shared')?.kind).toBe('shared')
    expect(hasSharedAccount()).toBe(true)
  })

  it('invites a viewer with Drive «فقط مشاهده»', async () => {
    await createSharedSpreadsheet('خانه', 'v@x.com', 'viewer')
    expect(state.log[1]).toBe('share:v@x.com:reader')
  })

  it('keeps the registered file but writes no invite when Drive refuses the share', async () => {
    state.shareError = new SheetsApiError('forbidden', 403)

    await expect(createSharedSpreadsheet('خانه', 'partner@x.com', 'partner')).rejects.toBe(
      state.shareError
    )
    expect(state.log).toEqual(['create', 'share:partner@x.com:writer'])
    expect(state.log.some(line => line.includes('دعوت:'))).toBe(false)
    expect(getSpreadsheets().find(sheet => sheet.id === 'new-shared')?.kind).toBe('shared')
    // The marker went out with the file, before any sync could read it.
    expect(periodRowsOf(state.created!.tabs)[0]?.[0]).toBe(WORKSPACE_TYPE_ROW)
  })

  it('never touches the mirror of the open personal sheet', async () => {
    await createSharedSpreadsheet('خانه', 'partner@x.com', 'partner')
    expect(getStore('p1')).not.toBeNull()
  })

  it('refuses a second shared account, also a hidden one', async () => {
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'p1',
      spreadsheets: [{ id: 'old', name: 'حسابداری · مشترک قبلی', createdAt: '', kind: 'shared' }]
    })

    await expect(createSharedSpreadsheet('خانه', 'partner@x.com', 'partner')).rejects.toThrow(
      ONE_SHARED_ACCOUNT_MESSAGE
    )
    expect(state.log).toEqual([])
  })

  it('refuses the creator own e-mail or a broken one before creating anything', async () => {
    await expect(createSharedSpreadsheet('خانه', 'owner@x.com', 'partner')).rejects.toThrow()
    await expect(createSharedSpreadsheet('خانه', 'not-an-email', 'partner')).rejects.toThrow()
    await expect(createSharedSpreadsheet('  ', 'partner@x.com', 'partner')).rejects.toThrow()
    expect(state.log).toEqual([])
  })
})

describe('inviting into a file that is not the open one', () => {
  it('refuses a second partner', async () => {
    setWorkspaceType('new-shared', 'shared')

    const known = [
      { email: 'owner@x.com', role: 'owner', overrides: {} },
      { email: 'partner@x.com', role: 'partner', overrides: {} }
    ]

    expect(await inviteMember('new-shared', 'b@x.com', 'partner', 'خانه', known)).toBe(
      'partner-limit'
    )
    expect(await inviteMember('new-shared', 'b@x.com', 'owner', 'خانه', known)).toBe('owner-fixed')
    expect(state.log).toEqual([])
  })
})

describe('connectSharedAccount', () => {
  it('refuses a building file and registers nothing', async () => {
    state.periodRows = [[WORKSPACE_TYPE_ROW, 'ساختمان', 't']]

    expect(await connectSharedAccount('b9', 'حسابداری · مشترک خانه')).toBe(false)
    expect(getSpreadsheets().some(sheet => sheet.id === 'b9')).toBe(false)
    expect(NOT_A_SHARED_MESSAGE).toBeTruthy()
  })

  it('lists a shared file on this device as the shared account', async () => {
    state.periodRows = [[WORKSPACE_TYPE_ROW, WORKSPACE_SHARED_VALUE, 't']]

    expect(await connectSharedAccount('s9', 'حسابداری · مشترک خانه')).toBe(true)
    expect(getWorkspaceType('s9')).toBe('shared')
    expect(getSpreadsheets().find(sheet => sheet.id === 's9')).toMatchObject({
      kind: 'shared',
      name: 'حسابداری · مشترک خانه'
    })
  })

  it('refuses a second, different shared account', async () => {
    state.periodRows = [[WORKSPACE_TYPE_ROW, WORKSPACE_SHARED_VALUE, 't']]
    await connectSharedAccount('s9', 'حسابداری · مشترک خانه')

    await expect(connectSharedAccount('s10', 'حسابداری · مشترک دیگر')).rejects.toThrow(
      ONE_SHARED_ACCOUNT_MESSAGE
    )
    expect(await connectSharedAccount('s9', 'حسابداری · مشترک خانه')).toBe(true)
  })

  it('offers the Drive sheets named like a shared account that are not registered yet', () => {
    const entries = [
      { id: 'a', name: 'حسابداری · مشترک خانه', createdAt: '' },
      { id: 'b', name: 'حسابداری · ساختمان برج', createdAt: '' },
      { id: 'c', name: 'حسابداری · مشترک ثبت‌شده', createdAt: '', kind: 'shared' as const },
      { id: 'd', name: 'حسابداری · من', createdAt: '' }
    ]

    expect(sharedConnectCandidates(entries).map(entry => entry.id)).toEqual(['a'])
  })
})
