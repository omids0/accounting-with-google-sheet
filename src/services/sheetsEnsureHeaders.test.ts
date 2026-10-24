import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ensureManySheetsWithHeaders, isVerifiablyEmptyTab } from './sheetsEnsure'

const api = vi.hoisted(() => ({
  titles: [] as string[],
  headers: {} as Record<string, string[]>,
  row2: {} as Record<string, string[]>,
  omit: [] as string[],
  calls: [] as { method: string; url: string; body: Record<string, unknown> }[]
}))

vi.mock('./sheetsApi', () => ({
  SHEETS_API: 'https://sheets.test/v4/spreadsheets',
  isSpreadsheetAccessDeniedError: () => false,
  apiRequest: async (url: string, options?: { method?: string; body?: string }) => {
    api.calls.push({
      method: options?.method ?? 'GET',
      url: decodeURIComponent(url),
      body: options?.body ? JSON.parse(options.body) : {}
    })
    if (url.includes('values:batchGet')) {
      return {
        valueRanges: Object.entries(api.headers)
          .filter(([name]) => !api.omit.includes(name))
          .map(([name, row]) => {
            const second = api.row2[name]

            return {
              range: `'${name}'!A1:Z2`,
              values: row.length || second ? [row, ...(second ? [second] : [])] : undefined
            }
          })
      }
    }
    if (url.includes(':batchUpdate') && !url.includes('values:')) return {}
    if (url.includes('values')) return {}

    return { sheets: api.titles.map(title => ({ properties: { title } })) }
  }
}))

const spec = (sheetName: string) => ({ sheetName, headers: ['شناسه', sheetName] })

describe('ensuring many tabs with headers', () => {
  beforeEach(() => {
    api.calls.length = 0
    api.titles = []
    api.headers = {}
    api.row2 = {}
    api.omit = []
  })

  it('writes the headers of every empty tab in ONE batch', async () => {
    api.titles = ['t-a', 't-b', 't-c']
    api.headers = { 't-a': [], 't-b': [], 't-c': ['شناسه', 't-c'] }

    await ensureManySheetsWithHeaders('s1', [spec('t-a'), spec('t-b'), spec('t-c')])

    const writes = api.calls.filter(call => call.url.includes('values'))

    expect(writes.filter(call => call.url.includes('values:batchUpdate'))).toHaveLength(1)
    expect(writes.filter(call => call.method === 'PUT')).toHaveLength(0)

    const data = writes.find(call => call.url.includes('values:batchUpdate'))!.body.data as {
      range: string
      values: string[][]
    }[]

    expect(data.map(part => part.range)).toEqual(["'t-a'!A1:B1", "'t-b'!A1:B1"])
    expect(data[0].values).toEqual([['شناسه', 't-a']])
  })

  it('keeps a single header write a plain write', async () => {
    api.titles = ['u-a']
    api.headers = { 'u-a': [] }

    await ensureManySheetsWithHeaders('s2', [spec('u-a')])

    expect(api.calls.filter(call => call.method === 'PUT')).toHaveLength(1)
    expect(api.calls.some(call => call.url.includes('values:batchUpdate'))).toBe(false)
  })

  it('writes nothing for tabs that already have their headers', async () => {
    api.titles = ['v-a']
    api.headers = { 'v-a': ['شناسه', 'v-a'] }

    await ensureManySheetsWithHeaders('s3', [spec('v-a')])

    expect(api.calls.some(call => call.method === 'PUT')).toBe(false)
    expect(api.calls.some(call => call.url.includes('values:batchUpdate'))).toBe(false)
  })
})

describe('never overwriting a header over data', () => {
  beforeEach(() => {
    api.calls.length = 0
    api.titles = []
    api.headers = {}
    api.row2 = {}
    api.omit = []
  })

  const headerWrites = () =>
    api.calls.filter(
      call =>
        call.method === 'PUT' || (call.url.includes('values:batchUpdate') && call.method === 'POST')
    )

  it('writes nothing when the tab has data from row 2 but an empty row 1', async () => {
    api.titles = ['w-a']
    api.headers = { 'w-a': [] }
    api.row2 = { 'w-a': ['78c3356f', '۱۴۰۵/۵/۲۶', '2026-08-17'] }

    await ensureManySheetsWithHeaders('s4', [spec('w-a')])

    expect(headerWrites()).toHaveLength(0)
  })

  it('writes nothing when the response has no valueRange for the tab', async () => {
    api.titles = ['x-a']
    api.headers = { 'x-a': [] }
    api.omit = ['x-a']

    await ensureManySheetsWithHeaders('s5', [spec('x-a')])

    expect(headerWrites()).toHaveLength(0)
  })

  it('asks for rows 1 and 2, and tries an unreturned tab again on the next call', async () => {
    api.titles = ['y-a']
    api.headers = { 'y-a': [] }
    api.omit = ['y-a']

    await ensureManySheetsWithHeaders('s6', [spec('y-a')])
    api.omit = []
    await ensureManySheetsWithHeaders('s6', [spec('y-a')])

    const reads = api.calls.filter(call => call.url.includes('values:batchGet'))

    expect(reads).toHaveLength(2)
    expect(reads[0].url).toContain('!1:2')
    expect(headerWrites()).toHaveLength(1)
  })

  it('judges emptiness by rows 1 and 2 together', () => {
    expect(isVerifiablyEmptyTab(undefined)).toBe(false)
    expect(isVerifiablyEmptyTab([])).toBe(true)
    expect(isVerifiablyEmptyTab([[], ['', ' ']])).toBe(true)
    expect(isVerifiablyEmptyTab([[], ['x']])).toBe(false)
    expect(isVerifiablyEmptyTab([['شناسه']])).toBe(false)
  })
})
