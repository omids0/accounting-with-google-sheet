import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ensureManySheetsWithHeaders } from './sheetsEnsure'

const api = vi.hoisted(() => ({
  titles: [] as string[],
  headers: {} as Record<string, string[]>,
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
        valueRanges: Object.entries(api.headers).map(([name, row]) => ({
          range: `'${name}'!A1:Z1`,
          values: row.length ? [row] : undefined
        }))
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
