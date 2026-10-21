import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createBuildingSpreadsheet } from './buildingTemplate'
import { getDefaultSettings, getSettings, saveSettings } from './settings'
import { PERSONAL_ONLY_SHEETS } from './sheetNames'
import { resetSheetSync } from './sheetSync'
import { switchActiveSpreadsheet } from './spreadsheetSetup'
import { moveSyncToSpreadsheet } from './spreadsheetSwitch'
import { getWorkspaceType } from './workspace'

/**
 * A tiny fake of Google Sheets and Drive that counts every request, so the cost of creating and
 * entering a building is measured, not guessed. It is a counter: it checks no UI.
 */
const google = vi.hoisted(() => ({
  log: [] as string[],
  files: new Map<string, Map<string, string[][]>>(),
  counter: 0
}))

vi.mock('./auth', () => ({
  getAccessToken: () => 'token',
  isTokenValid: () => true,
  getUserEmail: () => 'manager@example.com'
}))
vi.mock('./localNotifications', () => ({ refreshScheduledReminders: async () => undefined }))
vi.mock('./pushNotifications', () => ({
  getCurrentPushSubscription: async () => null,
  getDeviceLabel: () => 'test'
}))
vi.mock('./sharing', () => ({ refreshSharingInfoIfStale: async () => undefined }))

const json = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body } as unknown as Response)

function sheetOfRange(range: string): string {
  const quoted = decodeURIComponent(range).match(/^'((?:[^']|'')*)'/)

  return quoted ? quoted[1].replace(/''/g, "'") : decodeURIComponent(range).split('!')[0]
}

function fakeFetch(input: string, init?: RequestInit): Response {
  const url = String(input)

  const method = init?.method ?? 'GET'

  const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {}

  const idMatch = url.match(/spreadsheets\/([^/?:]+)/)

  const file = idMatch ? google.files.get(idMatch[1]) : undefined

  const tag = (kind: string) => google.log.push(`${method} ${kind}`)

  if (url.includes('googleapis.com/drive')) {
    tag(url.includes('modifiedTime') && !url.includes('?q=') ? 'drive:modifiedTime' : 'drive:list')

    return json(
      url.includes('?q=')
        ? { files: [...google.files.keys()].map(id => ({ id, name: id, modifiedTime: 'now' })) }
        : { modifiedTime: 'v1' }
    )
  }
  if (url.endsWith('/spreadsheets') && method === 'POST') {
    tag('create')

    const id = `file-${++google.counter}`

    google.files.set(
      id,
      new Map(
        (body.sheets as { properties: { title: string } }[]).map(sheet => [
          sheet.properties.title,
          [] as string[][]
        ])
      )
    )

    return json({ spreadsheetId: id })
  }
  if (!file) return json({})
  if (url.includes('values:batchGet')) {
    tag('batchGet')

    const ranges = [...url.matchAll(/ranges=([^&]+)/g)].map(match => match[1])

    return json({
      valueRanges: ranges.flatMap(range => {
        const name = sheetOfRange(range)

        return file.has(name) ? [{ range: `'${name}'!A1`, values: file.get(name) }] : []
      })
    })
  }
  if (url.includes('values:batchUpdate')) {
    tag('values:batchUpdate')
    for (const part of body.data as { range: string; values: string[][] }[]) {
      const name = sheetOfRange(part.range)

      const rows = [...(file.get(name) ?? [])]

      part.values.forEach((row, index) => {
        rows[index] = row.map(String)
      })
      file.set(name, rows)
    }

    return json({})
  }
  if (url.includes(':batchUpdate')) {
    tag('batchUpdate')
    for (const request of (body.requests ?? []) as {
      addSheet?: { properties: { title: string } }
    }[]) {
      if (request.addSheet) file.set(request.addSheet.properties.title, [])
    }

    return json({ replies: [] })
  }
  if (url.includes(':append')) {
    tag('append')

    const name = sheetOfRange(url.split('/values/')[1])

    file.set(name, [
      ...(file.get(name) ?? []),
      ...(body.values as string[][]).map(r => r.map(String))
    ])

    return json({})
  }
  if (url.includes('/values/')) {
    tag(method === 'PUT' ? 'values:put' : 'values:get')

    const name = sheetOfRange(url.split('/values/')[1])

    if (method === 'PUT') {
      const start = Number(decodeURIComponent(url.split('/values/')[1]).match(/!A(d+)/)?.[1] ?? 1)

      const rows = [...(file.get(name) ?? [])]

      ;(body.values as string[][]).forEach((row, index) => {
        rows[start - 1 + index] = row.map(String)
      })
      file.set(name, rows)
    }

    return json({ values: file.get(name) ?? [] })
  }
  tag('meta')

  return json({
    sheets: [...file.keys()].map((title, index) => ({
      properties: { title, sheetId: index + 1, gridProperties: { rowCount: 100, columnCount: 30 } },
      developerMetadata: []
    }))
  })
}

const summary = () => {
  const counts: Record<string, number> = {}

  for (const entry of google.log) counts[entry] = (counts[entry] ?? 0) + 1

  return { total: google.log.length, counts }
}

const PROFILE = {
  name: 'نرگس',
  address: 'خیابان گل‌ها',
  floors: 4,
  defaultCharge: 1_500_000,
  chargeMethod: 'area' as const,
  issueDay: 1,
  dueDay: 10,
  vacancyRule: 'half' as const
}

const ACCOUNTS = [
  {
    title: 'حساب ساختمان',
    type: 'bank' as const,
    cardNumber: '6037991234567890',
    balance: 12_000_000
  }
]

describe('what creating and entering a building costs (request counts)', () => {
  beforeEach(() => {
    localStorage.clear()
    google.log.length = 0
    google.files.clear()
    google.counter = 0
    vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => fakeFetch(input, init))
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'personal-1',
      spreadsheets: [{ id: 'personal-1', name: 'حسابداری · ۱۴۰۵', createdAt: '' }]
    })
  })

  it('creates a building and enters it', async () => {
    const id = await createBuildingSpreadsheet(PROFILE, ACCOUNTS)
    const creation = summary()

    google.log.length = 0
    await switchActiveSpreadsheet(id)
    const activation = summary()

    google.log.length = 0
    await moveSyncToSpreadsheet('personal-1', id)
    await new Promise(resolve => setTimeout(resolve, 100))
    const pull = summary()

    // Measured before this round's speed-up on the same fake: 16 + 55 + 11 = 82 requests.
    expect(creation.total).toBe(2)
    expect(activation.total).toBeLessThanOrEqual(1)
    expect(pull.total).toBeLessThanOrEqual(3)

    const tabs = [...google.files.get(id)!.keys()]

    for (const personal of PERSONAL_ONLY_SHEETS) expect(tabs).not.toContain(personal)

    expect(getWorkspaceType(id)).toBe('building')
    expect(getSettings()?.spreadsheetId).toBe(id)
    expect(creation.total).toBeGreaterThan(0)
    resetSheetSync(id)
  })

  it('switches from one building to another that was opened before', async () => {
    const first = await createBuildingSpreadsheet(PROFILE, ACCOUNTS)

    await switchActiveSpreadsheet(first)
    await moveSyncToSpreadsheet('personal-1', first)

    const second = await createBuildingSpreadsheet({ ...PROFILE, name: 'گلسار' }, ACCOUNTS)

    await switchActiveSpreadsheet(second)
    await moveSyncToSpreadsheet(first, second)
    await new Promise(resolve => setTimeout(resolve, 100))

    // The user is in the second building and taps the first: the sheet the title cache forgot.
    google.log.length = 0
    await switchActiveSpreadsheet(first)
    const activation = summary()

    google.log.length = 0
    await moveSyncToSpreadsheet(second, first)
    await new Promise(resolve => setTimeout(resolve, 100))
    const pull = summary()

    // Measured before: 9 + 4 = 13 requests for the same switch.
    expect(activation.total).toBeLessThanOrEqual(1)
    expect(pull.total).toBeLessThanOrEqual(3)

    expect(getSettings()?.spreadsheetId).toBe(first)
    expect(getWorkspaceType(first)).toBe('building')
    resetSheetSync(first)
  })
})
