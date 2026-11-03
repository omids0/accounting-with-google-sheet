#!/usr/bin/env node
// A fake Google for two (or more) simulated phones: ONE in-memory backend with many spreadsheets,
// Drive files and permissions, Sheets v4, Drive v3 and the OAuth / userinfo endpoints. Who is
// calling comes from the bearer token `mock-token-<email>`.
//
//   node docs/user-experience-sessions/mockGoogle.mjs --port 4900 [--strict-drive-file]
//
// Debug (no auth):  GET /__debug/state?spreadsheet=ID[&tab=NAME&n=20]   tabs, or the rows of a tab
//                   GET /__debug/requests?n=30     the last Google calls: who, what, status
//                   GET /__debug/files             every file with its permissions
//                   GET /__debug/mails             the sharing e-mails Drive would have sent
//                   POST /__debug/open {email,id}  strict mode: the user "opened the file with Google Picker"
// Admin:            POST /__admin/user {email,name,title,data,tabNames}  → their personal spreadsheet
//
// Driven by driver.mjs --backend; see README-shared.md.
import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'

import { handleDrive } from './googleDrive.mjs'
import { handleSheets } from './googleSheets.mjs'
import { createStore, normEmail, SHEET_MIME, TOKEN_PREFIX } from './googleStore.mjs'

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
}

const errorBody = (status, message, code) => ({
  error: { code: status, message, status: code ?? 'INVALID_ARGUMENT', errors: [{ message, reason: code ?? 'invalid' }] }
})

export function createBackend({ strictDriveFile = false, quiet = false } = {}) {
  const unknown = []
  const calls = []
  const say = line => !quiet && console.log(`[mockGoogle] ${line}`)
  const store = createStore({ strictDriveFile, log: say })

  /** Google's own sign-in endpoints: they answer for whoever the token (or refresh token) names. */
  function handleAuth({ method, pathname, searchParams, body, headers }) {
    if (/^\/(oauth2\/(v[123]|v4)\/userinfo|userinfo\/v2\/me)$/.test(pathname)) {
      const user = store.userOfToken(headers.authorization)

      if (!user) return { status: 401, json: errorBody(401, 'Invalid Credentials', 'UNAUTHENTICATED') }

      return { json: { sub: user.email, email: user.email, email_verified: true, name: user.name, given_name: user.name, picture: '' } }
    }
    if (/^\/(oauth2\/v4\/token|token|o\/oauth2\/token)$/.test(pathname) && method === 'POST') {
      const refresh = String(body.refresh_token ?? '')
      const email = refresh.startsWith('mock-refresh-') ? refresh.slice('mock-refresh-'.length) : ''

      if (!email) return { status: 400, json: { error: 'invalid_grant', error_description: 'Bad Request' } }

      return {
        json: {
          access_token: TOKEN_PREFIX + normEmail(email),
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'openid email profile https://www.googleapis.com/auth/drive.file'
        }
      }
    }
    if (/^\/(oauth2\/v3\/tokeninfo)$/.test(pathname)) {
      const email = String(searchParams.get('access_token') ?? '').slice(TOKEN_PREFIX.length)

      return { json: { email, aud: 'mock', scope: 'openid email profile https://www.googleapis.com/auth/drive.file', expires_in: '3500' } }
    }
    if (/^\/(o\/oauth2\/revoke|revoke)$/.test(pathname)) return { json: {} }

    return null
  }

  function handleAdmin({ method, pathname, searchParams, body }) {
    if (pathname === '/__health') return { json: { ok: true, users: store.users.size, files: store.files.size } }
    if (pathname === '/__admin/user' && method === 'POST') {
      const user = store.ensureUser(body.email, body.name)
      let created = false

      if (!user.personalId && body.data !== null) {
        const file = store.createSpreadsheetFile(user.email, body.title || `حسابداری · ${user.name}`, {
          initial: body.data,
          tabNames: body.tabNames
        })

        user.personalId = file.id
        created = true
      }
      const file = store.files.get(user.personalId)

      return { json: { email: user.email, name: user.name, spreadsheetId: user.personalId, title: file?.name, createdTime: file?.createdTime, created } }
    }
    if (pathname === '/__debug/open' && method === 'POST') {
      store.files.get(body.id)?.opened.add(normEmail(body.email))

      return { json: { ok: true } }
    }
    if (pathname === '/__debug/state') {
      const file = store.files.get(searchParams.get('spreadsheet') ?? '')

      if (!file?.book) return { status: 404, json: { error: 'unknown spreadsheet' } }
      const tab = searchParams.get('tab')

      if (!tab) {
        return {
          json: {
            title: file.name,
            modifiedTime: file.modifiedTime,
            tabs: [...file.book.tabs].map(([title, t]) => ({ title, sheetId: t.id, rows: t.rows.length })),
            metadata: file.book.metadata
          }
        }
      }
      const n = Number(searchParams.get('n') ?? 0)
      const rows = file.book.tabs.get(tab)?.rows ?? []

      return { json: { tab, rows: n ? rows.slice(-n) : rows } }
    }
    if (pathname === '/__debug/requests') {
      const n = Number(searchParams.get('n') ?? 30)

      return { json: { requests: calls.slice(-n), unknown: unknown.slice(-20) } }
    }
    if (pathname === '/__debug/files') {
      return {
        json: [...store.files.values()].map(f => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          owner: f.owner,
          modifiedTime: f.modifiedTime,
          permissions: f.permissions.map(p => `${p.emailAddress}:${p.role}`),
          opened: [...f.opened],
          tabs: f.book ? [...f.book.tabs.keys()] : undefined
        }))
      }
    }
    if (pathname === '/__debug/mails') return { json: store.mails }

    return null
  }

  /** One request in, one reply out: { status, json | raw, type }. Never throws. */
  function dispatch({ method, url, headers, rawBody }) {
    const { pathname, searchParams } = new URL(url, 'http://fake.google')
    const text = rawBody.length ? rawBody.toString('utf8') : ''
    const isJson = /json/i.test(headers['content-type'] ?? '') || text.startsWith('{')
    let body = {}

    try {
      if (isJson && text) body = JSON.parse(text)
      else if (/x-www-form-urlencoded/.test(headers['content-type'] ?? '')) body = Object.fromEntries(new URLSearchParams(text))
    } catch {
      return { status: 400, json: errorBody(400, 'Invalid JSON payload received.') }
    }
    const request = { method, pathname, searchParams, body, rawBody, headers, log: say }
    let user = null
    let reply

    try {
      reply = pathname.startsWith('/__') ? handleAdmin(request) : handleAuth(request)
      if (!reply) {
        user = store.userOfToken(headers.authorization)
        if (!user) {
          reply = { status: 401, json: errorBody(401, 'Request had invalid authentication credentials. Expected OAuth 2 access token, login cookie or other valid authentication credential.', 'UNAUTHENTICATED') }
        } else {
          reply = handleSheets(store, user, request) ?? handleDrive(store, user, request)
        }
      }
      if (!reply) {
        say(`unknown endpoint ${method} ${pathname}${searchParams.size ? `?${searchParams}` : ''}`)
        unknown.push(`${method} ${pathname}`)
        reply = { json: {} }
      }
    } catch (error) {
      if (!error.status) {
        say(`internal error on ${method} ${pathname}: ${error.stack}`)
        reply = { status: 500, json: errorBody(500, String(error.message), 'INTERNAL') }
      } else {
        reply = { status: error.status, json: errorBody(error.status, error.message, error.code) }
      }
    }
    if (!pathname.startsWith('/__')) {
      calls.push({
        n: calls.length + 1,
        user: user?.email ?? '-',
        call: `${method} ${decodeURIComponent(pathname + (searchParams.size ? `?${searchParams}` : ''))}`.slice(0, 220),
        status: reply.status ?? 200,
        body: method === 'GET' ? '' : text.slice(0, 300)
      })
    }

    return reply
  }

  return { dispatch, store, calls, unknown }
}

export function startServer({ port = 4900, strictDriveFile = false, quiet = false } = {}) {
  const backend = createBackend({ strictDriveFile, quiet })
  const server = createServer(async (req, res) => {
    const chunks = []

    for await (const chunk of req) chunks.push(chunk)
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS)
      res.end()

      return
    }
    const reply = backend.dispatch({ method: req.method, url: req.url, headers: req.headers, rawBody: Buffer.concat(chunks) })
    const status = reply.status ?? 200

    if (reply.raw) {
      res.writeHead(status, { ...CORS, 'content-type': reply.type ?? 'application/octet-stream' })
      res.end(reply.raw)
    } else if (status === 204) {
      res.writeHead(204, CORS)
      res.end()
    } else {
      res.writeHead(status, { ...CORS, 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify(reply.json ?? {}))
    }
  })

  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve({ server, ...backend })))
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv.slice(2)
  const at = argv.indexOf('--port')
  const port = at === -1 ? 4900 : Number(argv[at + 1])

  await startServer({ port, strictDriveFile: argv.includes('--strict-drive-file') })
  console.log(`mockGoogle ready on http://127.0.0.1:${port} (${SHEET_MIME.split('.').pop()} + drive + oauth)`)
}
