// A small stateful stand-in for the Google Sheets v4 API, used by driver.mjs.
//
// The stock mock in e2e/helpers/mockAppState.ts answers every write with `{}` and every read with
// the same static rows, so anything the app saves vanishes on the next read and the app reports
// «not saved». This mock keeps the tabs in memory: appends, updates, clears and the structural
// batchUpdate requests the app sends change the tabs, and reads see the change.

const colIndex = letters => [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1
const colName = index => {
  let n = index + 1
  let name = ''

  while (n > 0) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name
    n = Math.floor((n - 1) / 26)
  }

  return name
}

/** "'Tab name'!B2:D9" → { title, r1, r2, c1, c2 } with 0-based inclusive bounds (null = open). */
export function parseRange(raw) {
  const text = decodeURIComponent(raw)
  const bang = text.lastIndexOf('!')
  const titlePart = bang === -1 ? text : text.slice(0, bang)
  const title = titlePart.replace(/^'|'$/g, '').replace(/''/g, "'")
  const area = bang === -1 ? '' : text.slice(bang + 1)
  const [from = '', to = from] = area.split(':')
  const cell = part => {
    const m = /^([A-Za-z]*)(\d*)$/.exec(part)

    return { c: m?.[1] ? colIndex(m[1].toUpperCase()) : null, r: m?.[2] ? Number(m[2]) - 1 : null }
  }
  const a = cell(from)
  const b = cell(to)

  return { title, r1: a.r, r2: b.r, c1: a.c, c2: b.c }
}

export function createSheetsMock(initial, tabNames) {
  const tabs = new Map()
  let nextId = 1
  const metadata = []
  const addTab = title => {
    if (!tabs.has(title)) tabs.set(title, { id: nextId++, rows: [] })

    return tabs.get(title)
  }

  for (const title of tabNames) addTab(title)
  for (const [title, rows] of Object.entries(initial ?? {}))
    addTab(title).rows = rows.map(row => [...row])

  const byId = id => [...tabs.entries()].find(([, tab]) => tab.id === id)
  const props = ([title, tab]) => ({
    properties: {
      title,
      sheetId: tab.id,
      index: tab.id,
      gridProperties: { rowCount: Math.max(1000, tab.rows.length), columnCount: 26 }
    }
  })
  const cellText = value => (value === undefined || value === null ? '' : String(value))
  const trimRow = row => {
    const copy = row.map(cellText)

    while (copy.length && copy[copy.length - 1] === '') copy.pop()

    return copy
  }

  function read(range) {
    const tab = tabs.get(range.title)

    if (!tab) return []
    const rows = tab.rows.slice(range.r1 ?? 0, range.r2 === null ? undefined : range.r2 + 1)
    const sliced = rows.map(row =>
      range.c1 === null && range.c2 === null ? row : row.slice(range.c1 ?? 0, (range.c2 ?? 1e6) + 1)
    )

    while (sliced.length && trimRow(sliced[sliced.length - 1]).length === 0) sliced.pop()

    return sliced.map(trimRow)
  }

  function write(range, values) {
    const tab = addTab(range.title)
    const r0 = range.r1 ?? 0
    const c0 = range.c1 ?? 0

    values.forEach((row, i) => {
      while (tab.rows.length <= r0 + i) tab.rows.push([])
      row.forEach((value, j) => {
        const target = tab.rows[r0 + i]

        while (target.length <= c0 + j) target.push('')
        target[c0 + j] = value
      })
    })

    const width = Math.max(1, ...values.map(row => row.length))

    return {
      updatedRange: `'${range.title}'!${colName(c0)}${r0 + 1}:${colName(c0 + width - 1)}${r0 + values.length}`,
      updatedRows: values.length,
      updatedColumns: width,
      updatedCells: values.reduce((n, row) => n + row.length, 0)
    }
  }

  function append(range, values) {
    const tab = addTab(range.title)
    let last = tab.rows.length

    while (last > 0 && trimRow(tab.rows[last - 1]).length === 0) last -= 1
    tab.rows.length = last

    return write({ ...range, r1: last, c1: range.c1 ?? 0 }, values)
  }

  function clear(range) {
    const tab = tabs.get(range.title)

    if (!tab) return
    for (let r = range.r1 ?? 0; r <= Math.min(range.r2 ?? tab.rows.length - 1, tab.rows.length - 1); r += 1) {
      const row = tab.rows[r]

      if (range.c1 === null && range.c2 === null) tab.rows[r] = []
      else for (let c = range.c1 ?? 0; c <= Math.min(range.c2 ?? row.length - 1, row.length - 1); c += 1) row[c] = ''
    }
  }

  /** Applies one spreadsheets.batchUpdate request; returns its reply. */
  function structural(request) {
    const [kind] = Object.keys(request)
    const body = request[kind]

    if (kind === 'addSheet') {
      const title = body.properties?.title ?? `Sheet${nextId}`
      const tab = addTab(title)

      return { addSheet: props([title, tab]) }
    }
    if (kind === 'deleteSheet') {
      const found = byId(body.sheetId)

      if (found) tabs.delete(found[0])
    } else if (kind === 'deleteDimension') {
      const found = byId(body.range.sheetId)

      if (found && body.range.dimension === 'ROWS') found[1].rows.splice(body.range.startIndex, body.range.endIndex - body.range.startIndex)
      else if (found)
        for (const row of found[1].rows) row.splice(body.range.startIndex, body.range.endIndex - body.range.startIndex)
    } else if (kind === 'deleteRange') {
      const found = byId(body.range.sheetId)

      if (found) {
        const { startRowIndex: r1 = 0, endRowIndex: r2 = found[1].rows.length, startColumnIndex: c1, endColumnIndex: c2 } = body.range

        if (c1 === undefined && body.shiftDimension === 'ROWS') found[1].rows.splice(r1, r2 - r1)
        else clear({ title: found[0], r1, r2: r2 - 1, c1: c1 ?? null, c2: c2 === undefined ? null : c2 - 1 })
      }
    } else if (kind === 'copyPaste') {
      const src = byId(body.source.sheetId)
      const dst = byId(body.destination.sheetId)

      if (src && dst) {
        const { startRowIndex: sr = 0, endRowIndex: er = src[1].rows.length, startColumnIndex: sc = 0, endColumnIndex: ec = 26 } = body.source
        const block = src[1].rows.slice(sr, er).map(row => row.slice(sc, ec))

        write({ title: dst[0], r1: body.destination.startRowIndex ?? 0, c1: body.destination.startColumnIndex ?? 0 }, block)
      }
    } else if (kind === 'createDeveloperMetadata' || kind === 'updateDeveloperMetadata') {
      const dm = body.developerMetadata ?? {}

      metadata.push(dm)

      return { [kind]: { developerMetadata: { metadataId: metadata.length, ...dm } } }
    }

    return {}
  }

  /** Handles one request; returns { status, json } or null when the URL is not a Sheets call. */
  function handle(method, url, postData) {
    const { pathname, searchParams } = new URL(url)
    const m = /\/v4\/spreadsheets\/([^/:]+)(.*)$/.exec(pathname)

    if (!m) return null
    const id = m[1]
    const rest = decodeURIComponent(m[2])
    const body = postData ? JSON.parse(postData) : {}

    if (rest === '' && method === 'GET')
      return { json: { spreadsheetId: id, properties: { title: 'حسابداری تست' }, sheets: [...tabs.entries()].map(props) } }
    if (rest === ':batchUpdate')
      return { json: { spreadsheetId: id, replies: (body.requests ?? []).map(structural) } }
    if (rest === '/values:batchGet')
      return {
        json: {
          spreadsheetId: id,
          valueRanges: searchParams.getAll('ranges').map(raw => ({
            range: decodeURIComponent(raw),
            majorDimension: 'ROWS',
            values: read(parseRange(raw))
          }))
        }
      }
    if (rest === '/values:batchUpdate') {
      const responses = (body.data ?? []).map(item => write(parseRange(item.range), item.values ?? []))

      return { json: { spreadsheetId: id, totalUpdatedRows: responses.reduce((n, r) => n + r.updatedRows, 0), responses } }
    }
    if (rest === '/values:batchClear') {
      for (const raw of body.ranges ?? []) clear(parseRange(raw))

      return { json: { spreadsheetId: id, clearedRanges: body.ranges ?? [] } }
    }
    const v = /^\/values\/(.+?)(:append|:clear)?$/.exec(rest)

    if (!v) return null
    const range = parseRange(v[1])

    if (v[2] === ':append') return { json: { spreadsheetId: id, updates: { spreadsheetId: id, ...append(range, body.values ?? []) } } }
    if (v[2] === ':clear') {
      clear(range)

      return { json: { spreadsheetId: id, clearedRange: decodeURIComponent(v[1]) } }
    }
    if (method === 'PUT') return { json: { spreadsheetId: id, ...write(range, body.values ?? []) } }

    return { json: { range: decodeURIComponent(v[1]), majorDimension: 'ROWS', values: read(range) } }
  }

  return { handle, tabs }
}

/** Installs the mock on a Playwright page (call after mockGoogleApis so it wins). */
export async function installSheetsMock(page, mock) {
  await page.route('**/sheets.googleapis.com/**', async route => {
    const request = route.request()
    const reply = mock.handle(request.method(), request.url(), request.postData())

    if (!reply) return route.fallback()

    return route.fulfill({
      status: reply.status ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(reply.json)
    })
  })
}
