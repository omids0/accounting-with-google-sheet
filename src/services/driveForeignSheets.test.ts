import { beforeEach, describe, expect, it, vi } from 'vitest'

const io = vi.hoisted(() => ({ urls: [] as string[], files: [] as unknown[] }))

vi.mock('./auth', () => ({ getAccessToken: () => 'token' }))
vi.mock('./sheetsApi', () => ({
  fetchWithTimeout: vi.fn(async (url: string) => {
    io.urls.push(url)

    return { ok: true, json: async () => ({ files: io.files }) }
  })
}))

import { isForeignReadOnlyFile, listAccountingSpreadsheetsFromDrive } from './drive'
import { getDefaultSettings, getSettings, saveSettings } from './settings'
import { syncSpreadsheetsFromDrive } from './spreadsheetDriveSync'
import { personalSpreadsheet } from './workspace'

const OWN = {
  id: 'own',
  name: 'حسابداری ۱۴۰۵',
  modifiedTime: '2026-10-01T00:00:00Z',
  ownedByMe: true
}

const CHILD_FILE = {
  id: 'kid',
  name: 'حسابداری سارا',
  modifiedTime: '2026-10-02T00:00:00Z',
  ownedByMe: false,
  capabilities: { canEdit: false }
}

// A shared account's partner edits a sheet the other partner owns.
const PARTNER_FILE = {
  id: 'partner',
  name: 'حسابداری مشترک',
  modifiedTime: '2026-10-03T00:00:00Z',
  ownedByMe: false,
  capabilities: { canEdit: true }
}

beforeEach(() => {
  localStorage.clear()
  io.urls = []
  io.files = []
  saveSettings({ ...getDefaultSettings(), spreadsheetId: '', spreadsheets: [] })
})

describe('Drive list of accounting sheets', () => {
  it('asks Drive who owns each file and whether the user can edit it', async () => {
    io.files = [OWN]
    await listAccountingSpreadsheetsFromDrive()

    const fields = decodeURIComponent(new URL(io.urls[0]).searchParams.get('fields') ?? '')

    expect(fields).toContain('ownedByMe')
    expect(fields).toContain('capabilities/canEdit')
  })

  it('tells a foreign read-only file from the others', () => {
    expect(isForeignReadOnlyFile(CHILD_FILE)).toBe(true)
    expect(isForeignReadOnlyFile(PARTNER_FILE)).toBe(false)
    expect(isForeignReadOnlyFile(OWN)).toBe(false)
    // Drive said nothing about it: never guessed to be read-only.
    expect(isForeignReadOnlyFile({ id: 'x', name: 'x', modifiedTime: '' })).toBe(false)
  })
})

describe('a child sheet once the local registry is gone', () => {
  it('is not registered, so it is neither offered nor taken for the own books', async () => {
    io.files = [OWN, CHILD_FILE, PARTNER_FILE]

    const synced = await syncSpreadsheetsFromDrive()

    expect(synced.map(sheet => sheet.id).sort()).toEqual(['own', 'partner'])
    expect(getSettings()?.spreadsheets?.map(sheet => sheet.id)).not.toContain('kid')
    expect(personalSpreadsheet(synced)?.id).not.toBe('kid')
  })

  it('stays a child, with the name the parent gave it, when this device registered it', async () => {
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'own',
      spreadsheets: [{ id: 'kid', name: 'سارا', createdAt: '2026-09-01', kind: 'child' }]
    })
    io.files = [OWN, CHILD_FILE]

    const synced = await syncSpreadsheetsFromDrive()

    const kid = synced.find(sheet => sheet.id === 'kid')

    expect(kid).toMatchObject({ name: 'سارا', kind: 'child' })
    expect(personalSpreadsheet(synced)?.id).toBe('own')
  })
})
