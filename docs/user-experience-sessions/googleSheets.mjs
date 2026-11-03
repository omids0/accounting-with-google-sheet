// Sheets v4 on the fake Google: POST /v4/spreadsheets (create) and everything under
// /v4/spreadsheets/<id> (delegated to the spreadsheet's book), with Drive's permission checks.
import { googleError } from './googleStore.mjs'

/** Returns { status?, json } or null when the path is not a Sheets call. */
export function handleSheets(store, user, { method, pathname, searchParams, body }) {
  if (pathname === '/v4/spreadsheets' && method === 'POST') {
    const title = body.properties?.title || 'Untitled spreadsheet'
    const sheets = (body.sheets?.length ? body.sheets : [{ properties: { title: 'Sheet1' } }]).map(sheet => sheet.properties ?? {})
    const file = store.createSpreadsheetFile(user.email, title, { tabNames: [] })

    for (const props of sheets) {
      file.book.handleRest('POST', ':batchUpdate', searchParams, { requests: [{ addSheet: { properties: props } }] }, file.id)
    }

    return { json: file.book.handleRest('GET', '', searchParams, {}, file.id).json }
  }

  const m = /^\/v4\/spreadsheets\/([^/:]+)(.*)$/.exec(pathname)

  if (!m) return null
  const id = decodeURIComponent(m[1])
  const rest = decodeURIComponent(m[2])
  let file

  try {
    file = store.requireFile(id, user.email, method === 'GET' ? 'reader' : 'writer').file
  } catch (error) {
    if (error.status === 404) throw googleError(404, 'Requested entity was not found.', 'NOT_FOUND')
    throw error
  }

  if (!file.book) throw googleError(400, 'This operation is not supported for this document', 'FAILED_PRECONDITION')

  return file.book.handleRest(method, rest, searchParams, body, id)
}
