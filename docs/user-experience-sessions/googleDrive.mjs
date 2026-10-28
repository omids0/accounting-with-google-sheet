// Drive v3 on the fake Google, as far as the app uses it: files.list / get / create / update /
// copy / delete, multipart uploads, alt=media and permissions create / list / update / delete,
// with owner / writer / reader checks. Returns { status?, json | raw, type? } or null.
import { compileQuery, project } from './googleDriveQuery.mjs'
import { FOLDER_MIME, googleError, normEmail } from './googleStore.mjs'

const DEFAULT_FILE_FIELDS = 'kind,id,name,mimeType'
const ROLES = new Set(['owner', 'organizer', 'fileOrganizer', 'writer', 'commenter', 'reader'])

/** The file as Drive shows it to `user`: only owners see parents; only writers see everyone. */
function fileResource(store, file, user) {
  const role = store.roleOf(file, user.email)
  const owner = store.users.get(file.owner)
  const permissions = role === 'reader' ? file.permissions.filter(p => p.emailAddress === user.email) : file.permissions

  return {
    kind: 'drive#file',
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    createdTime: file.createdTime,
    modifiedTime: file.modifiedTime,
    trashed: file.trashed,
    ...(role === 'owner' ? { parents: file.parents } : {}),
    appProperties: file.appProperties,
    ...(file.content ? { size: String(file.content.length) } : {}),
    webViewLink: file.book ? `https://docs.google.com/spreadsheets/d/${file.id}/edit` : `https://drive.google.com/file/d/${file.id}/view`,
    owners: [{ emailAddress: file.owner, displayName: owner?.name ?? file.owner }],
    permissions,
    capabilities: { canShare: role === 'owner' || role === 'writer', canEdit: role !== 'reader' }
  }
}

/** multipart/related: JSON metadata part, then the bytes. */
function parseMultipart(buffer, contentType) {
  const boundary = /boundary="?([^";]+)"?/i.exec(contentType ?? '')?.[1]

  if (!boundary) return { meta: {}, content: buffer }
  const parts = buffer.toString('latin1').split(`--${boundary}`).slice(1, -1)
  const split = part => {
    const at = part.indexOf('\r\n\r\n')

    return { head: part.slice(0, at), body: part.slice(at + 4).replace(/\r\n$/, '') }
  }
  const [metaPart, dataPart] = parts.map(split)

  return {
    meta: JSON.parse(Buffer.from(metaPart?.body ?? '{}', 'latin1').toString('utf8') || '{}'),
    content: Buffer.from(dataPart?.body ?? '', 'latin1')
  }
}

function applyMetadata(file, meta, store) {
  if (meta.name) file.name = meta.name
  if (meta.trashed !== undefined) file.trashed = Boolean(meta.trashed)
  if (meta.appProperties) file.appProperties = { ...file.appProperties, ...meta.appProperties }
  if (meta.parents) file.parents = meta.parents.map(p => (p === 'root' ? store.users.get(file.owner).rootId : p))
  file.modifiedTime = store.tick()
}

export function handleDrive(store, user, { method, pathname, searchParams, body, rawBody, headers, log }) {
  const fields = searchParams.get('fields')

  if (pathname === '/drive/v3/about') {
    return { json: { user: { emailAddress: user.email, displayName: user.name }, kind: 'drive#about' } }
  }

  if (pathname === '/upload/drive/v3/files' || /^\/upload\/drive\/v3\/files\/[^/]+$/.test(pathname)) {
    const uploadType = searchParams.get('uploadType')
    const { meta, content } = uploadType === 'multipart' ? parseMultipart(rawBody, headers['content-type']) : { meta: {}, content: rawBody }
    const id = pathname.split('/')[5]

    if (id) {
      const { file } = store.requireFile(id, user.email, 'writer')

      file.content = content
      applyMetadata(file, meta, store)

      return { json: project(fileResource(store, file, user), fields, DEFAULT_FILE_FIELDS) }
    }
    const parents = meta.parents?.length ? meta.parents : ['root']

    for (const parent of parents) assertParentUsable(store, user, parent)
    const file = store.addFile({
      owner: user.email,
      name: meta.name || 'Untitled',
      mimeType: meta.mimeType || headers['content-type'] || 'application/octet-stream',
      parents,
      appProperties: meta.appProperties,
      content
    })

    return { json: project(fileResource(store, file, user), fields, DEFAULT_FILE_FIELDS) }
  }

  const m = /^\/drive\/v3\/files(?:\/([^/]+))?(?:\/(permissions|copy)(?:\/([^/]+))?)?$/.exec(pathname)

  if (!m) return null
  const [, id, sub, permissionId] = m

  if (!id) return method === 'GET' ? listFiles(store, user, searchParams, log) : createFile(store, user, body, fields)
  if (id === 'generateIds') return { json: { ids: Array.from({ length: 10 }, () => store.newId()), kind: 'drive#generatedIds' } }
  if (sub === 'permissions') return permissionsCall(store, user, method, id, permissionId, searchParams, body)
  if (sub === 'copy') {
    const { file } = store.requireFile(id, user.email)
    const copy = file.book
      ? store.createSpreadsheetFile(user.email, body.name ?? `Copy of ${file.name}`, {
          initial: Object.fromEntries([...file.book.tabs].map(([title, tab]) => [title, tab.rows])),
          tabNames: []
        })
      : store.addFile({ owner: user.email, name: body.name ?? `Copy of ${file.name}`, mimeType: file.mimeType, content: file.content })

    return { json: project(fileResource(store, copy, user), fields, DEFAULT_FILE_FIELDS) }
  }

  if (method === 'GET') {
    const { file } = store.requireFile(id, user.email)

    if (searchParams.get('alt') === 'media')
      return { raw: file.content ?? Buffer.alloc(0), type: file.mimeType ?? 'application/octet-stream' }

    return { json: project(fileResource(store, file, user), fields, DEFAULT_FILE_FIELDS) }
  }
  if (method === 'PATCH' || method === 'PUT') {
    const { file } = store.requireFile(id, user.email, 'writer')

    applyMetadata(file, body, store)

    return { json: project(fileResource(store, file, user), fields, DEFAULT_FILE_FIELDS) }
  }
  if (method === 'DELETE') {
    const { file, role } = store.requireFile(id, user.email)

    if (role !== 'owner') throw googleError(403, 'The user does not have sufficient permissions for this file.', 'forbidden')
    store.files.delete(file.id)

    return { status: 204, json: null }
  }

  return null
}

/** drive.file can only write into a folder this account made; a foreign parent is a 404. */
function assertParentUsable(store, user, parent) {
  if (parent === 'root' || parent === store.users.get(user.email)?.rootId) return
  const folder = store.files.get(parent)

  if (!folder || folder.mimeType !== FOLDER_MIME || !store.roleOf(folder, user.email)) throw googleError(404, `File not found: ${parent}.`, 'notFound')
}

function createFile(store, user, body, fields) {
  const parents = body.parents?.length ? body.parents : ['root']

  for (const parent of parents) assertParentUsable(store, user, parent)
  const file = store.addFile({
    owner: user.email,
    name: body.name || 'Untitled',
    mimeType: body.mimeType || 'application/octet-stream',
    parents,
    appProperties: body.appProperties
  })

  return { json: project(fileResource(store, file, user), fields, DEFAULT_FILE_FIELDS) }
}

function listFiles(store, user, searchParams, log) {
  const ctx = { email: user.email, rootId: user.rootId }
  const matches = compileQuery(searchParams.get('q') ?? '', log)
  const size = Math.min(Number(searchParams.get('pageSize') ?? 100), 1000)
  const start = Number(searchParams.get('pageToken') ?? 0)
  const [orderField, direction] = (searchParams.get('orderBy') ?? '').split(/\s+/)
  const all = [...store.files.values()].filter(file => store.roleOf(file, user.email) && matches(file, ctx))

  if (orderField) {
    const sign = direction === 'desc' ? -1 : 1

    all.sort((a, b) => sign * String(a[orderField] ?? '').localeCompare(String(b[orderField] ?? '')))
  }
  const page = all.slice(start, start + size)
  const inner = /files\((.*)\)/.exec(searchParams.get('fields') ?? '')?.[1]
  const next = start + size < all.length ? String(start + size) : undefined

  return {
    json: {
      kind: 'drive#fileList',
      incompleteSearch: false,
      files: page.map(file => project(fileResource(store, file, user), inner, DEFAULT_FILE_FIELDS)),
      ...(next ? { nextPageToken: next } : {})
    }
  }
}

function permissionsCall(store, user, method, fileId, permissionId, searchParams, body) {
  const { file, role } = store.requireFile(fileId, user.email)
  const fields = searchParams.get('fields')
  const view = perm => ({ kind: 'drive#permission', ...perm })
  const canShare = role === 'owner' || role === 'writer'

  if (method === 'GET' && !permissionId) {
    const visible = canShare ? file.permissions : file.permissions.filter(p => p.emailAddress === user.email)

    return { json: project({ kind: 'drive#permissionList', permissions: visible.map(view) }, fields, '*') }
  }
  if (method === 'POST') {
    if (!canShare) throw googleError(403, 'The user does not have sufficient permissions for this file.', 'forbidden')
    const email = normEmail(body.emailAddress)

    if (body.type !== 'user' || !email.includes('@')) throw googleError(400, 'Invalid value for: email address', 'invalid')
    if (!ROLES.has(body.role) || body.role === 'owner') throw googleError(400, 'Invalid or unsupported role', 'invalidSharingRequest')
    const perm = store.share(file, { email, role: body.role })

    if (searchParams.get('sendNotificationEmail') === 'true') {
      store.mails.push({ at: store.tick(), from: user.email, to: email, file: file.id, name: file.name, role: body.role, message: searchParams.get('emailMessage') ?? '' })
    }
    file.modifiedTime = store.tick()

    return { json: project(view(perm), fields, '*') }
  }
  const perm = file.permissions.find(p => p.id === permissionId)

  if (!perm) throw googleError(404, `Permission not found: ${permissionId}.`, 'notFound')
  if (!canShare) throw googleError(403, 'The user does not have sufficient permissions for this file.', 'forbidden')
  if (method === 'GET') return { json: project(view(perm), fields, '*') }
  if (perm.role === 'owner') throw googleError(403, 'The owner of a file cannot be removed or changed.', 'forbidden')
  if (method === 'PATCH' || method === 'PUT') {
    if (!ROLES.has(body.role) || body.role === 'owner') throw googleError(400, 'Invalid or unsupported role', 'invalidSharingRequest')
    perm.role = body.role

    return { json: project(view(perm), fields, '*') }
  }
  if (method === 'DELETE') {
    file.permissions = file.permissions.filter(p => p !== perm)
    file.opened.delete(perm.emailAddress)

    return { status: 204, json: null }
  }

  return null
}
