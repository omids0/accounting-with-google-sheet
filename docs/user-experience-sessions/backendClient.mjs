// driver.mjs --backend: everything that ties one simulated phone to the shared fake Google
// (mockGoogle.mjs): the user's identity and personal spreadsheet, the signed-in session seed, and
// the Playwright route that forwards every googleapis.com request to the backend.

export const mockToken = email => `mock-token-${email.trim().toLowerCase()}`

/** Creates (first time) or finds the user's personal spreadsheet on the backend. */
export async function ensureBackendUser(backend, { email, name, title, data, tabNames }) {
  const res = await fetch(`${backend}/__admin/user`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, name, title, data: data ?? {}, tabNames })
  })

  if (!res.ok) throw new Error(`backend ${backend} refused the user: ${res.status} ${await res.text()}`)

  return res.json()
}

/**
 * Seeds the phone like e2e/helpers/mockAppState.ts#seedMockAppState, but for this user and
 * their own spreadsheet, and ONLY ONCE: a reload must not overwrite the registry (the shared
 * account the app listed meanwhile), the mirror or the session the app has changed since.
 */
export async function seedBackendSession(page, { seed, user, sheets }) {
  const session = {
    ...seed.session,
    email: user.email,
    name: user.name,
    accessToken: mockToken(user.email),
    tokenExpiry: Date.now() + 12 * 60 * 60 * 1000
  }
  const settings = {
    ...seed.settings,
    spreadsheetId: user.spreadsheetId,
    spreadsheets: [{ id: user.spreadsheetId, name: user.title, createdAt: user.createdTime ?? new Date().toISOString() }]
  }

  await page.addInitScript(
    ({ session: s, settings: st, id, store }) => {
      sessionStorage.setItem('accounting_sheets_ready', sessionStorage.getItem('accounting_sheets_ready') ?? id)
      if (localStorage.getItem('accounting_session')) return
      localStorage.setItem('accounting_session', JSON.stringify(s))
      localStorage.setItem('accounting_settings', JSON.stringify(st))
      localStorage.setItem(
        `accounting_sheet_store_${id}`,
        JSON.stringify({ spreadsheetId: id, sheets: store, lastSyncedAt: Date.now() })
      )
      localStorage.setItem('accounting_onboarding_v1', JSON.stringify({ [id]: { status: 'finished', steps: {} } }))
    },
    { session, settings, id: user.spreadsheetId, store: { ...seed.sheets, ...(sheets ?? {}) } }
  )
}

/**
 * Forwards every googleapis.com request of the page to the backend as this user (bearer token
 * from the request is replaced by the user's mock token). Installed after mockGoogleApis, so it
 * wins over the stock stubs.
 */
export async function installBackendRoutes(page, backend, email, onCall) {
  await page.route(/^https:\/\/([a-z0-9-]+\.)?googleapis\.com\//, async route => {
    const request = route.request()
    const url = new URL(request.url())
    const headers = { authorization: `Bearer ${mockToken(email)}` }
    const type = request.headers()['content-type']

    if (type) headers['content-type'] = type
    try {
      const res = await fetch(backend + url.pathname + url.search, {
        method: request.method(),
        headers,
        body: ['GET', 'HEAD'].includes(request.method()) ? undefined : request.postDataBuffer() ?? undefined
      })
      const body = Buffer.from(await res.arrayBuffer())

      onCall?.(request.method(), url.pathname, res.status)

      return route.fulfill({
        status: res.status,
        headers: {
          'content-type': res.headers.get('content-type') ?? 'application/json',
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*'
        },
        body
      })
    } catch (error) {
      return route.abort('connectionrefused').catch(() => console.error(`driver: backend unreachable: ${error.message}`))
    }
  })
}

/** GET a JSON path of the backend (debug endpoints). */
export async function backendGet(backend, path) {
  return (await fetch(backend + path)).json()
}
