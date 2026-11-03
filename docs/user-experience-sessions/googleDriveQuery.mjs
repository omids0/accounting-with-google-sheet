// Pieces of Drive v3 the handlers share: the `q` search language (just what the app sends) and
// the `fields` mask (top-level names only; nested masks are applied to arrays of objects).

const unescapeQ = value => value.replace(/\\(['\\])/g, '$1')

const AND = /\s+and\s+/iy

/** Splits at top-level " and ": not inside 'quotes' or { braces }. */
function splitClauses(q) {
  const out = []
  let depth = 0
  let quoted = false
  let start = 0

  for (let i = 0; i < q.length; i += 1) {
    const ch = q[i]

    if (ch === '\\') i += 1
    else if (ch === "'") quoted = !quoted
    else if (!quoted && ch === '{') depth += 1
    else if (!quoted && ch === '}') depth -= 1
    else if (!quoted && depth === 0) {
      AND.lastIndex = i
      const hit = AND.exec(q)

      if (hit) {
        out.push(q.slice(start, i))
        start = i + hit[0].length
        i = start - 1
      }
    }
  }
  out.push(q.slice(start))

  return out.map(part => part.trim()).filter(Boolean)
}

/** Compiles `q` into (file, ctx) => boolean; ctx = { email, rootId }. Unknown clauses match all. */
export function compileQuery(q = '', log = () => {}) {
  const tests = splitClauses(q).map(clause => {
    let m

    if ((m = /^mimeType\s*(=|!=)\s*'(.*)'$/.exec(clause))) {
      const want = unescapeQ(m[2])

      return file => (m[1] === '=') === (file.mimeType === want)
    }
    if ((m = /^name\s*(=|contains)\s*'(.*)'$/.exec(clause))) {
      const want = unescapeQ(m[2]).toLowerCase()

      return file => (m[1] === '=' ? file.name.toLowerCase() === want : file.name.toLowerCase().includes(want))
    }
    if ((m = /^trashed\s*=\s*(true|false)$/.exec(clause))) return file => file.trashed === (m[1] === 'true')
    if ((m = /^'(.*)'\s+in\s+(parents|owners|writers|readers)$/.exec(clause))) {
      const who = unescapeQ(m[1])

      if (m[2] === 'parents') return (file, ctx) => file.parents.includes(who === 'root' ? ctx.rootId : who)
      if (m[2] === 'owners') return file => file.owner === who.toLowerCase()

      return file => file.permissions.some(p => p.emailAddress === who.toLowerCase() && p.role === (m[2] === 'writers' ? 'writer' : 'reader'))
    }
    if ((m = /^sharedWithMe\s*=\s*(true|false)$/.exec(clause)))
      return (file, ctx) => (file.owner !== ctx.email) === (m[1] === 'true')
    if ((m = /^appProperties\s+has\s*\{\s*key\s*=\s*'(.*?)'\s+and\s+value\s*=\s*'(.*)'\s*\}$/.exec(clause))) {
      const [key, value] = [unescapeQ(m[1]), unescapeQ(m[2])]

      return file => file.appProperties?.[key] === value
    }
    log(`drive: ignored q clause ${clause}`)

    return () => true
  })

  return (file, ctx) => tests.every(test => test(file, ctx))
}

/** Splits "a,b(c,d),e" at depth 0 into [{ name, inner }]. */
export function parseFields(spec) {
  if (!spec) return null
  const out = []
  let depth = 0
  let start = 0

  const push = end => {
    const token = spec.slice(start, end).trim()
    const open = token.indexOf('(')

    if (token) out.push(open === -1 ? { name: token } : { name: token.slice(0, open), inner: token.slice(open + 1, -1) })
  }

  for (let i = 0; i < spec.length; i += 1) {
    if (spec[i] === '(') depth += 1
    else if (spec[i] === ')') depth -= 1
    else if (spec[i] === ',' && depth === 0) {
      push(i)
      start = i + 1
    }
  }
  push(spec.length)

  return out
}

/** Keeps only the masked fields; `fallback` is the mask when the request names none. */
export function project(value, spec, fallback) {
  const fields = parseFields(spec) ?? parseFields(fallback)

  if (!fields || fields.some(field => field.name === '*')) return value
  const out = {}

  for (const { name, inner } of fields) {
    // «sheets.properties» style dotted paths are Sheets, not Drive: a plain name is all we need.
    if (!(name in value)) continue
    out[name] = inner && Array.isArray(value[name]) ? value[name].map(item => project(item, inner)) : value[name]
  }

  return out
}
