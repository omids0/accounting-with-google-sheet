// One in-memory spreadsheet with the Sheets v4 calls the app makes. Shared by sheetsMock.mjs (the
// single-phone, in-process mock of driver.mjs) and mockGoogle.mjs (the multi-spreadsheet backend
// two phones talk to). A "book" knows nothing about Drive, users or HTTP: it gets the part of the
// URL after /v4/spreadsheets/<id> plus the parsed body, and answers { status?, json }.

export class ApiError extends Error {
  constructor(status, message, code = 'INVALID_ARGUMENT') {
    super(message)
    this.status = status
    this.code = code
  }
}

const colIndex = letters => [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1

export const colName = index => {
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

const cellText = value => (value === undefined || value === null ? '' : String(value))

const trimRow = row => {
  const copy = row.map(cellText)

  while (copy.length && copy[copy.length - 1] === '') copy.pop()

  return copy
}

/**
 * @param {object} [opts]
 * @param {Record<string, unknown[][]>} [opts.initial] tab title → rows
 * @param {string[]} [opts.tabNames] tabs that exist (empty) before `initial` is applied
 * @param {string} [opts.title]
 * @param {() => void} [opts.onWrite] called once after every request that changed something
 * @param {(line: string) => void} [opts.log] unknown requests are reported here
 * @param {boolean} [opts.strictRanges] a read of a missing tab is a 400 like Google (default: empty)
 */
export function createBook({ initial, tabNames = [], title = 'حسابداری تست', onWrite, log, strictRanges = false } = {}) {
  const tabs = new Map()
  let nextId = 1
  let metadataSeq = 1
  let dirty = false
  const metadata = []
  const book = { title }
  const addTab = (name, sheetId, grid) => {
    if (!tabs.has(name)) {
      const id = sheetId ?? nextId++

      tabs.set(name, { id, rows: [], rowCount: grid?.rowCount, columnCount: grid?.columnCount })
    }

    return tabs.get(name)
  }

  for (const name of tabNames) addTab(name)
  for (const [name, rows] of Object.entries(initial ?? {})) addTab(name).rows = rows.map(row => [...row])

  const byId = id => [...tabs.entries()].find(([, tab]) => tab.id === id)
  const props = ([name, tab]) => ({
    properties: {
      title: name,
      sheetId: tab.id,
      index: [...tabs.keys()].indexOf(name),
      gridProperties: {
        rowCount: Math.max(tab.rowCount ?? 1000, tab.rows.length),
        columnCount: Math.max(tab.columnCount ?? 26, ...tab.rows.map(row => row.length))
      }
    }
  })
  const sheetView = entry => {
    const own = metadata.filter(item => item.location?.sheetId === entry[1].id)

    return { ...props(entry), ...(own.length ? { developerMetadata: own } : {}) }
  }

  function read(range) {
    const tab = tabs.get(range.title)

    if (!tab && strictRanges) throw new ApiError(400, `Unable to parse range: ${range.title}`)
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

    dirty = true
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
    dirty = true
    for (let r = range.r1 ?? 0; r <= Math.min(range.r2 ?? tab.rows.length - 1, tab.rows.length - 1); r += 1) {
      const row = tab.rows[r]

      if (range.c1 === null && range.c2 === null) tab.rows[r] = []
      else for (let c = range.c1 ?? 0; c <= Math.min(range.c2 ?? row.length - 1, row.length - 1); c += 1) row[c] = ''
    }
  }

  const matchesFilter = (item, filter) => {
    const lookup = filter.developerMetadataLookup ?? {}

    return (
      (lookup.metadataId === undefined || lookup.metadataId === item.metadataId) &&
      (lookup.metadataKey === undefined || lookup.metadataKey === item.metadataKey)
    )
  }

  /** Applies one spreadsheets.batchUpdate request; returns its reply. */
  function structural(request) {
    const [kind] = Object.keys(request)
    const body = request[kind]

    dirty = true
    if (kind === 'addSheet') {
      const name = body.properties?.title ?? `Sheet${nextId}`
      const tab = addTab(name, body.properties?.sheetId, body.properties?.gridProperties)

      return { addSheet: sheetView([name, tab]) }
    }
    if (kind === 'deleteSheet') {
      const found = byId(body.sheetId)

      if (found) {
        tabs.delete(found[0])
        for (let i = metadata.length - 1; i >= 0; i -= 1)
          if (metadata[i].location?.sheetId === body.sheetId) metadata.splice(i, 1)
      }
    } else if (kind === 'deleteDimension') {
      const found = byId(body.range.sheetId)
      const { startIndex, endIndex } = body.range

      if (!found) return {}
      if (body.range.dimension === 'ROWS') {
        found[1].rows.splice(startIndex, endIndex - startIndex)
        if (found[1].rowCount) found[1].rowCount = Math.max(1, found[1].rowCount - (endIndex - startIndex))
      } else {
        for (const row of found[1].rows) row.splice(startIndex, endIndex - startIndex)
        if (found[1].columnCount) found[1].columnCount = Math.max(1, found[1].columnCount - (endIndex - startIndex))
      }
    } else if (kind === 'appendDimension') {
      const found = byId(body.sheetId)

      if (found && body.dimension === 'ROWS') found[1].rowCount = Math.max(found[1].rowCount ?? 1000, found[1].rows.length) + body.length
      else if (found) found[1].columnCount = (found[1].columnCount ?? 26) + body.length
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
    } else if (kind === 'createDeveloperMetadata') {
      const item = { ...(body.developerMetadata ?? {}), metadataId: metadataSeq++ }

      metadata.push(item)

      return { createDeveloperMetadata: { developerMetadata: item } }
    } else if (kind === 'updateDeveloperMetadata') {
      const hits = metadata.filter(item => (body.dataFilters ?? []).some(f => matchesFilter(item, f)))

      for (const item of hits) Object.assign(item, body.developerMetadata ?? {}, { metadataId: item.metadataId })

      return { updateDeveloperMetadata: { developerMetadata: hits } }
    } else if (kind === 'deleteDeveloperMetadata') {
      const hits = metadata.filter(item => matchesFilter(item, body.dataFilter ?? {}))

      for (const item of hits) metadata.splice(metadata.indexOf(item), 1)

      return { deleteDeveloperMetadata: { deletedDeveloperMetadata: hits } }
    } else if (kind === 'updateSpreadsheetProperties') {
      if (body.properties?.title) book.title = body.properties.title
    } else if (kind === 'updateSheetProperties') {
      const found = byId(body.properties?.sheetId)

      if (found && body.properties.title && body.properties.title !== found[0]) {
        const rebuilt = [...tabs.entries()].map(([name, tab]) => [name === found[0] ? body.properties.title : name, tab])

        tabs.clear()
        for (const [name, tab] of rebuilt) tabs.set(name, tab)
      }
      if (found && body.properties.gridProperties) Object.assign(found[1], body.properties.gridProperties)
    } else log?.(`sheets: ignored batchUpdate request ${kind}`)

    return {}
  }

  /**
   * Handles one call. `rest` is what follows /v4/spreadsheets/<id> (already URL-decoded, e.g.
   * ":batchUpdate", "/values:batchGet", "/values/Tab!A1:append"); returns { status?, json }.
   */
  function handleRest(method, rest, searchParams, body, id) {
    dirty = false
    const reply = route(method, rest, searchParams, body ?? {}, id)

    if (dirty) onWrite?.()

    return reply
  }

  function route(method, rest, searchParams, body, id) {
    if (rest === '' && method === 'GET')
      return {
        json: {
          spreadsheetId: id,
          properties: { title: book.title },
          sheets: [...tabs.entries()].map(sheetView),
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${id}/edit`
        }
      }
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

    if (!v) {
      log?.(`sheets: unknown call ${method} ${rest}`)

      return { json: {} }
    }
    const range = parseRange(v[1])

    if (v[2] === ':append') return { json: { spreadsheetId: id, updates: { spreadsheetId: id, ...append(range, body.values ?? []) } } }
    if (v[2] === ':clear') {
      clear(range)

      return { json: { spreadsheetId: id, clearedRange: decodeURIComponent(v[1]) } }
    }
    if (method === 'PUT') return { json: { spreadsheetId: id, ...write(range, body.values ?? []) } }

    return { json: { range: decodeURIComponent(v[1]), majorDimension: 'ROWS', values: read(range) } }
  }

  return { handleRest, tabs, metadata, book }
}
