import { beforeEach, describe, expect, it, vi } from 'vitest'

const io = vi.hoisted(() => ({
  marker: [] as string[][],
  email: 'parent@x.com' as string | null,
  drive: [] as string[],
  exists: true,
  unshared: [] as string[],
  access: {} as { ownedByMe?: boolean; capabilities?: { canEdit?: boolean } },
  accessFails: false
}))

vi.mock('./sheetsRows', () => ({
  batchFetchSheetRangesFromApi: vi.fn(async () => new Map([['تنظیمات دوره', io.marker]]))
}))
vi.mock('./drive', () => ({
  getDriveFileAccess: vi.fn(async () => {
    if (io.accessFails) throw new Error('offline')

    return io.access
  })
}))
vi.mock('./sheets', () => ({ verifySpreadsheetExists: vi.fn(async () => io.exists) }))
vi.mock('./auth', () => ({ getUserEmail: () => io.email }))
vi.mock('./driveShare', () => ({
  listSharedEmails: vi.fn(async () => io.drive),
  unshareFile: vi.fn(async (_id: string, email: string) => {
    io.unshared.push(email)
  })
}))

const switchActiveSpreadsheet = vi.hoisted(() => vi.fn(async () => ''))

vi.mock('./spreadsheetSetup', () => ({ switchActiveSpreadsheet }))
vi.mock('./spreadsheetSwitch', () => ({ moveSyncToSpreadsheet: vi.fn(async () => undefined) }))
vi.mock('./spreadsheetStore', () => ({ clearStore: vi.fn() }))

import {
  CHILD_NO_ACCESS_BADGE,
  clearChildAccessLost,
  isChildAccessLost,
  lostChildren,
  markChildAccessLostIfDenied,
  probeChildAccess
} from './childAccessLost'
import {
  connectChildAccount,
  OWN_DRIVE_SHEET_MESSAGE,
  OWN_SHEET_AS_CHILD_MESSAGE
} from './childConnect'
import { forgetChild } from './childForget'
import {
  addChild,
  CHILDREN_STORAGE_KEY,
  getChild,
  listChildren,
  removeChild,
  renameChild
} from './childrenRegistry'
import { getSettings, getSpreadsheets } from './settings'
import { SheetsApiError } from './sheetsApi'
import { setItem, STORAGE_KEYS } from './storage'
import { getWorkspaceType, isChildWorkspace } from './workspace'

const personalSettings = () =>
  setItem(STORAGE_KEYS.SETTINGS, {
    spreadsheetId: 'P1',
    spreadsheets: [{ id: 'P1', name: 'من', createdAt: '' }],
    forms: []
  })

const header = ['کلید', 'مقدار', 'زمان']

beforeEach(() => {
  localStorage.clear()
  io.marker = [header]
  io.email = 'parent@x.com'
  io.drive = []
  io.exists = true
  io.unshared = []
  io.access = { ownedByMe: false, capabilities: { canEdit: false } }
  io.accessFails = false
  vi.clearAllMocks()
  personalSettings()
})

describe('children registry', () => {
  it('adds several children and mirrors each into the settings list as kind child', () => {
    addChild({ id: 'C1', name: 'سارا', email: ' Sara@X.com ' })
    addChild({ id: 'C2', name: 'علی' })

    expect(listChildren().map(child => child.id)).toEqual(['C1', 'C2'])
    expect(getChild('C1')?.email).toBe('sara@x.com')
    expect(getSpreadsheets().filter(sheet => sheet.kind === 'child')).toHaveLength(2)
    expect(getWorkspaceType('C2')).toBe('child')
    expect(JSON.parse(localStorage.getItem(CHILDREN_STORAGE_KEY) ?? '[]')).toHaveLength(2)
  })

  it('adding again updates in place and keeps the first date', () => {
    const first = addChild({ id: 'C1', name: 'سارا' })

    addChild({ id: 'C1', name: 'سارا جان' })

    expect(listChildren()).toHaveLength(1)
    expect(getChild('C1')?.addedAt).toBe(first.addedAt)
    expect(getSpreadsheets().find(sheet => sheet.id === 'C1')?.name).toBe('سارا جان')
  })

  it('renames the record and its settings entry', () => {
    addChild({ id: 'C1', name: 'سارا' })

    expect(renameChild('C1', ' ساره ')?.name).toBe('ساره')
    expect(getSpreadsheets().find(sheet => sheet.id === 'C1')?.name).toBe('ساره')
    expect(renameChild('C1', '  ')?.name).toBe('ساره')
  })

  it('removes the record, the settings entry and the cached type', () => {
    addChild({ id: 'C1', name: 'سارا' })

    expect(removeChild('C1')).toBe(true)
    expect(listChildren()).toEqual([])
    expect(getSpreadsheets().map(sheet => sheet.id)).toEqual(['P1'])
    expect(isChildWorkspace('C1')).toBe(false)
  })

  it('refuses to remove the open sheet', () => {
    addChild({ id: 'C1', name: 'سارا' })
    setItem(STORAGE_KEYS.SETTINGS, { ...getSettings(), spreadsheetId: 'C1' })

    expect(removeChild('C1')).toBe(false)
    expect(listChildren()).toHaveLength(1)
  })
})

describe('connectChildAccount', () => {
  it('registers a sheet whose marker says personal', async () => {
    const child = await connectChildAccount('C1', 'سارا')

    expect(child?.name).toBe('سارا')
    expect(getWorkspaceType('C1')).toBe('child')
  })

  it('allows many children and connecting one again is harmless', async () => {
    await connectChildAccount('C1', 'سارا')
    await connectChildAccount('C2', 'علی')
    await connectChildAccount('C1')

    expect(listChildren().map(child => child.name)).toEqual(['علی', 'سارا'])
  })

  it('refuses a building or shared sheet and a non-accounting file', async () => {
    io.marker = [header, ['نوع فضا', 'ساختمان']]
    expect(await connectChildAccount('B1')).toBeNull()

    io.marker = [header, ['نوع فضا', 'حساب مشترک']]
    expect(await connectChildAccount('S1')).toBeNull()

    io.marker = []
    expect(await connectChildAccount('X1')).toBeNull()
    expect(listChildren()).toEqual([])
  })

  it('refuses a sheet this device already lists as its own', async () => {
    await expect(connectChildAccount('P1')).rejects.toThrow(OWN_SHEET_AS_CHILD_MESSAGE)
  })

  it('refuses a sheet Drive says the user owns, and registers nothing', async () => {
    io.access = { ownedByMe: true, capabilities: { canEdit: true } }
    await expect(connectChildAccount('C1', 'سارا')).rejects.toThrow(OWN_DRIVE_SHEET_MESSAGE)

    expect(listChildren()).toEqual([])
  })

  it('still connects a sheet the parent was given edit access to', async () => {
    io.access = { ownedByMe: false, capabilities: { canEdit: true } }
    expect(await connectChildAccount('C1', 'سارا')).not.toBeNull()
  })

  it('still connects a read-only sheet, and one Drive says nothing about or cannot be asked', async () => {
    expect(await connectChildAccount('C1', 'سارا')).not.toBeNull()

    io.access = {}
    expect(await connectChildAccount('C2', 'علی')).not.toBeNull()

    io.accessFails = true
    expect(await connectChildAccount('C3', 'رضا')).not.toBeNull()
  })
})

describe('forgetChild', () => {
  it('takes the own Drive permission back, then forgets the child locally', async () => {
    addChild({ id: 'C1', name: 'سارا' })
    io.drive = ['parent@x.com']

    expect(await forgetChild('C1')).toBe('removed')
    expect(io.unshared).toEqual(['parent@x.com'])
    expect(listChildren()).toEqual([])
  })

  it('forgets locally when Drive does not list the parent', async () => {
    addChild({ id: 'C1', name: 'سارا' })

    expect(await forgetChild('C1')).toBe('local')
    expect(io.unshared).toEqual([])
    expect(listChildren()).toEqual([])
  })

  it('opens the personal sheet first when the child is the open sheet', async () => {
    addChild({ id: 'C1', name: 'سارا' })
    setItem(STORAGE_KEYS.SETTINGS, { ...getSettings(), spreadsheetId: 'C1' })

    await forgetChild('C1')

    expect(switchActiveSpreadsheet).toHaveBeenCalledWith('P1')
  })
})

describe('access lost', () => {
  it('marks a denied open, clears it when the file opens again', async () => {
    addChild({ id: 'C1', name: 'سارا' })

    expect(markChildAccessLostIfDenied('C1', new SheetsApiError('x', 403))).toBe(false)
    expect(markChildAccessLostIfDenied('C1', new Error('offline'))).toBe(false)

    io.exists = false
    expect(await probeChildAccess('C1')).toBe('lost')
    expect(isChildAccessLost('C1')).toBe(true)
    expect(lostChildren().map(child => child.id)).toEqual(['C1'])

    io.exists = true
    expect(await probeChildAccess('C1')).toBe('ok')
    expect(isChildAccessLost('C1')).toBe(false)
    expect(CHILD_NO_ACCESS_BADGE).toBeTruthy()
    clearChildAccessLost('C1')
  })
})
