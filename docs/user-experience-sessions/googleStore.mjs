// The state of the fake Google: users, Drive files (spreadsheets, folders, uploads), their
// permissions and the in-memory spreadsheet behind every spreadsheet file. HTTP-free; the
// handlers (googleDrive.mjs, googleSheets.mjs) and the server (mockGoogle.mjs) sit on top.
import { randomBytes } from 'node:crypto'

import { ApiError, createBook } from './sheetsBook.mjs'

export const SHEET_MIME = 'application/vnd.google-apps.spreadsheet'
export const FOLDER_MIME = 'application/vnd.google-apps.folder'
export const TOKEN_PREFIX = 'mock-token-'

export const normEmail = email => String(email ?? '').trim().toLowerCase()

export const googleError = (status, message, code) => new ApiError(status, message, code)

export function createStore({ strictDriveFile = false, log = () => {} } = {}) {
  const files = new Map()
  const users = new Map()
  const mails = []
  let lastTime = 0
  let permissionSeq = 1000

  /** ISO time that never repeats or goes back, so every write changes Drive's modifiedTime. */
  const tick = () => {
    lastTime = Math.max(Date.now(), lastTime + 1)

    return new Date(lastTime).toISOString()
  }
  const newId = () => randomBytes(33).toString('base64url')

  function ensureUser(email, name) {
    const key = normEmail(email)
    let user = users.get(key)

    if (!user) {
      user = { email: key, name: name || key.split('@')[0], rootId: `root-${newId().slice(0, 12)}`, personalId: null }
      users.set(key, user)
    } else if (name) user.name = name

    return user
  }

  /** Looks the user up from `Authorization: Bearer mock-token-<email>`; null = not signed in. */
  function userOfToken(header) {
    const m = /^Bearer\s+(\S+)$/i.exec(header ?? '')

    if (!m?.[1].startsWith(TOKEN_PREFIX)) return null
    const email = normEmail(m[1].slice(TOKEN_PREFIX.length))

    return email.includes('@') ? ensureUser(email) : null
  }

  function addFile({ owner, name, mimeType, parents, appProperties, content, book }) {
    const user = ensureUser(owner)
    const time = tick()
    const file = {
      id: newId(),
      name,
      mimeType,
      createdTime: time,
      modifiedTime: time,
      parents: parents?.length ? parents.map(p => (p === 'root' ? user.rootId : p)) : [user.rootId],
      trashed: false,
      appProperties: appProperties ?? {},
      content: content ?? null,
      book: book ?? null,
      owner: user.email,
      opened: new Set([user.email]),
      permissions: [
        { id: String(permissionSeq++), type: 'user', role: 'owner', emailAddress: user.email, displayName: user.name }
      ]
    }

    files.set(file.id, file)

    return file
  }

  /** A new spreadsheet file with its in-memory book; its modifiedTime follows every write. */
  function createSpreadsheetFile(owner, title, { initial, tabNames, tabs } = {}) {
    const file = addFile({ owner, name: title, mimeType: SHEET_MIME })

    file.book = createBook({
      initial,
      tabNames: tabNames ?? tabs,
      title,
      strictRanges: true,
      onWrite: () => {
        file.modifiedTime = tick()
      },
      log
    })

    return file
  }

  /** owner / writer / reader (commenter reads) or null. Under strict drive.file a shared file must have been opened. */
  function roleOf(file, email) {
    const key = normEmail(email)
    const perm = file.permissions.find(item => item.emailAddress === key)

    if (!perm) return null
    if (strictDriveFile && perm.role !== 'owner' && !file.opened.has(key)) return null

    return perm.role === 'commenter' || perm.role === 'reader' ? 'reader' : perm.role === 'owner' ? 'owner' : 'writer'
  }

  function requireFile(id, email, need = 'reader') {
    const file = files.get(id)
    const role = file ? roleOf(file, email) : null

    if (!file || !role) {
      throw googleError(404, `File not found: ${id}.`, 'NOT_FOUND')
    }
    if (need === 'writer' && role === 'reader') throw googleError(403, 'The caller does not have permission', 'PERMISSION_DENIED')
    if (need === 'owner' && role !== 'owner' && role !== 'writer')
      throw googleError(403, 'The user does not have sufficient permissions for this file.', 'PERMISSION_DENIED')

    return { file, role }
  }

  function share(file, { email, role, displayName }) {
    const key = normEmail(email)
    const existing = file.permissions.find(item => item.emailAddress === key)

    if (existing) {
      if (existing.role !== 'owner') existing.role = role

      return existing
    }
    const perm = {
      id: String(permissionSeq++),
      type: 'user',
      role,
      emailAddress: key,
      displayName: displayName ?? users.get(key)?.name ?? key.split('@')[0]
    }

    file.permissions.push(perm)

    return perm
  }

  return { files, users, mails, tick, newId, ensureUser, userOfToken, addFile, createSpreadsheetFile, roleOf, requireFile, share, strictDriveFile }
}
