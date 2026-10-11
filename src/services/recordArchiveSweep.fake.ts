// Test-only fake of the Google Sheets endpoints the archive sweep uses.

export interface FakeTab {
  sheetId: number
  rows: string[][]
  rowCount: number
  columnCount: number
  marked: boolean
}

interface Hooks {
  dropCopy: boolean
  afterCopy: null | (() => void)
  beforeDelete: null | (() => void)
}

type GridRange = { sheetId: number; startRowIndex: number; endRowIndex: number }

/** The fields of the batchUpdate requests the sweep sends. */
interface RequestBody {
  properties?: {
    sheetId: number
    title: string
    gridProperties?: { rowCount?: number; columnCount?: number }
  }
  developerMetadata?: { location: { sheetId: number } }
  sheetId?: number
  dimension?: string
  length?: number
  source?: GridRange
  destination?: GridRange
  range?: { sheetId: number; startIndex: number; endIndex: number }
}

function trimmed(rows: string[][]): string[][] {
  const out = rows.map(row => [...row])

  while (out.length && !out[out.length - 1].some(cell => cell)) out.pop()

  return out
}

export function fakeSheets() {
  const tabs = new Map<string, FakeTab>()
  const log: { kind: string; body: unknown }[] = []
  const hooks: Hooks = { dropCopy: false, afterCopy: null, beforeDelete: null }
  let calls = 0
  let nextId = 1

  const bySheetId = (sheetId: number) => [...tabs.values()].find(tab => tab.sheetId === sheetId)!

  function tabFromUrl(url: string): FakeTab {
    const name = decodeURIComponent(url.split('/values/')[1].split(/[?:!]/)[0]).replace(
      /^'|'$/g,
      ''
    )

    return tabs.get(name)!
  }

  function apply(request: Record<string, RequestBody>) {
    const [kind, body] = Object.entries(request)[0]

    log.push({ kind, body })

    if (kind === 'addSheet') {
      const { sheetId, title, gridProperties } = body.properties!

      tabs.set(title, {
        sheetId,
        rows: [],
        rowCount: gridProperties?.rowCount ?? 1000,
        columnCount: gridProperties?.columnCount ?? 26,
        marked: false
      })
    } else if (kind === 'createDeveloperMetadata') {
      bySheetId(body.developerMetadata!.location.sheetId).marked = true
    } else if (kind === 'appendDimension') {
      const tab = bySheetId(body.sheetId!)

      if (body.dimension === 'ROWS') tab.rowCount += body.length!
      else tab.columnCount += body.length!
    } else if (kind === 'copyPaste') {
      if (hooks.dropCopy) return

      const source = body.source!
      const dest = body.destination!
      const from = bySheetId(source.sheetId).rows.slice(source.startRowIndex, source.endRowIndex)
      const target = bySheetId(dest.sheetId)

      from.forEach((row, offset) => {
        while (target.rows.length < dest.startRowIndex + offset) target.rows.push([])
        target.rows[dest.startRowIndex + offset] = [...row]
      })
    } else if (kind === 'deleteDimension') {
      const { sheetId, startIndex, endIndex } = body.range!
      const tab = bySheetId(sheetId)

      tab.rows.splice(startIndex, endIndex - startIndex)
      tab.rowCount -= endIndex - startIndex
    }
  }

  async function api(url: string, init?: RequestInit) {
    calls += 1

    const method = init?.method ?? 'GET'

    if (method === 'GET') {
      return {
        sheets: [...tabs.entries()].map(([title, tab]) => ({
          properties: {
            sheetId: tab.sheetId,
            title,
            gridProperties: { rowCount: tab.rowCount, columnCount: tab.columnCount }
          },
          developerMetadata: tab.marked ? [{ metadataKey: 'accounting_archive' }] : []
        }))
      }
    }

    const body = JSON.parse(String(init?.body ?? '{}'))

    if (url.includes(':batchUpdate')) {
      const requests = body.requests as Record<string, RequestBody>[]

      if (requests.some(r => 'deleteDimension' in r)) hooks.beforeDelete?.()
      requests.forEach(apply)
      if (requests.some(r => 'copyPaste' in r)) hooks.afterCopy?.()
      hooks.beforeDelete = requests.some(r => 'deleteDimension' in r) ? null : hooks.beforeDelete

      return { replies: [] }
    }
    if (url.includes(':append')) {
      tabFromUrl(url).rows.push(...body.values.map((row: unknown[]) => row.map(String)))

      return {}
    }
    // values PUT: the header row.
    tabFromUrl(url).rows[0] = body.values[0]

    return {}
  }

  return {
    hooks,
    api,
    get calls() {
      return calls
    },
    reset(seed: Record<string, Partial<FakeTab>>) {
      tabs.clear()
      log.length = 0
      calls = 0
      nextId = 1
      Object.assign(hooks, { dropCopy: false, afterCopy: null, beforeDelete: null })
      for (const [title, tab] of Object.entries(seed)) {
        tabs.set(title, {
          sheetId: nextId++,
          rows: tab.rows ?? [],
          rowCount: tab.rowCount ?? 6000,
          columnCount: tab.columnCount ?? 4,
          marked: tab.marked ?? false
        })
      }
    },
    read(name: string, suffix?: string): string[][] {
      const tab = tabs.get(name)

      if (!tab) return []

      return suffix === '1:1' ? trimmed(tab.rows.slice(0, 1)) : trimmed(tab.rows)
    },
    tab: (name: string) => tabs.get(name)!,
    has: (name: string) => tabs.has(name),
    ids: (name: string) =>
      (tabs.get(name)?.rows ?? [])
        .slice(1)
        .map(row => row[0])
        .filter(Boolean),
    requests: (kind: string) => log.filter(entry => entry.kind === kind).map(entry => entry.body)
  }
}
