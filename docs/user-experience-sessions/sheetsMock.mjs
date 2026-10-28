// A small stateful stand-in for the Google Sheets v4 API, used by driver.mjs (single phone, no
// --backend).
//
// The stock mock in e2e/helpers/mockAppState.ts answers every write with `{}` and every read with
// the same static rows, so anything the app saves vanishes on the next read and the app reports
// «not saved». This mock keeps the tabs in memory: appends, updates, clears and the structural
// batchUpdate requests the app sends change the tabs, and reads see the change.
//
// The tab logic lives in sheetsBook.mjs, shared with mockGoogle.mjs (the two-phone backend).
import { ApiError, createBook, parseRange } from './sheetsBook.mjs'

export { parseRange }

export function createSheetsMock(initial, tabNames) {
  const { handleRest, tabs } = createBook({ initial, tabNames })

  /** Handles one request; returns { status, json } or null when the URL is not a Sheets call. */
  function handle(method, url, postData) {
    const { pathname, searchParams } = new URL(url)
    const m = /\/v4\/spreadsheets\/([^/:]+)(.*)$/.exec(pathname)

    if (!m) return null
    try {
      return handleRest(method, decodeURIComponent(m[2]), searchParams, postData ? JSON.parse(postData) : {}, m[1])
    } catch (error) {
      if (error instanceof ApiError) return { status: error.status, json: { error: { code: error.status, message: error.message } } }
      throw error
    }
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
