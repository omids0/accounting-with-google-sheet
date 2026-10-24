import { describe, expect, it } from 'vitest'

import {
  KEY_B64,
  ORIGIN,
  OTHER_KEY_B64,
  SECRET_REFRESH_TOKEN,
  idToken,
  post
} from './authRefreshWorkerKit'
import {
  fromBase64Url,
  importEncryptionKey,
  isValidSessionId,
  newSessionId,
  openText,
  sealText,
  toBase64Url
} from '../../workers/auth-refresh/src/crypto'
import {
  MAX_BODY_BYTES,
  allowedOrigin,
  corsHeaders,
  emailFromIdToken,
  parseAllowedOrigins,
  readJsonBody
} from '../../workers/auth-refresh/src/http'

describe('worker crypto helpers', () => {
  it('seals and opens a token round trip', async () => {
    const key = await importEncryptionKey(KEY_B64)

    const blob = await sealText(SECRET_REFRESH_TOKEN, key, 'session-a')

    expect(blob).not.toContain(SECRET_REFRESH_TOKEN)
    await expect(openText(blob, key, 'session-a')).resolves.toBe(SECRET_REFRESH_TOKEN)
  })

  it('uses a fresh iv every time', async () => {
    const key = await importEncryptionKey(KEY_B64)

    expect(await sealText('x', key, 'a')).not.toBe(await sealText('x', key, 'a'))
  })

  it('refuses another key, another session id, a tampered blob and garbage', async () => {
    const key = await importEncryptionKey(KEY_B64)

    const blob = await sealText(SECRET_REFRESH_TOKEN, key, 'session-a')

    await expect(
      openText(blob, await importEncryptionKey(OTHER_KEY_B64), 'session-a')
    ).resolves.toBe(null)
    await expect(openText(blob, key, 'session-b')).resolves.toBeNull()

    const bytes = fromBase64Url(blob)

    bytes[bytes.length - 1] ^= 1
    await expect(openText(toBase64Url(bytes), key, 'session-a')).resolves.toBeNull()
    await expect(openText('###', key, 'session-a')).resolves.toBeNull()
  })

  it('rejects an encryption key that is not 32 bytes', async () => {
    await expect(importEncryptionKey(toBase64Url(new Uint8Array(16)))).rejects.toThrow()
  })

  it('makes unguessable session ids and validates their shape', () => {
    const id = newSessionId()

    expect(id).toHaveLength(43)
    expect(isValidSessionId(id)).toBe(true)
    expect(newSessionId()).not.toBe(id)
    expect(isValidSessionId('short')).toBe(false)
    expect(isValidSessionId(`${id}=`)).toBe(false)
    expect(isValidSessionId(null)).toBe(false)
    expect(isValidSessionId(`${'a'.repeat(42)}/`)).toBe(false)
  })
})

describe('worker request helpers', () => {
  it('parses the allow list and matches an origin exactly', () => {
    const allowed = parseAllowedOrigins(' http://localhost:5173 ,https://omids0.github.io/ ,')

    expect(allowed).toEqual(['http://localhost:5173', 'https://omids0.github.io'])
    expect(allowedOrigin(post('/x', {}, ORIGIN), allowed)).toBe(ORIGIN)
    expect(allowedOrigin(post('/x', {}, 'https://evil.example'), allowed)).toBeNull()
    expect(allowedOrigin(post('/x', {}, `${ORIGIN}.evil.example`), allowed)).toBeNull()
    expect(allowedOrigin(post('/x', {}, null), allowed)).toBeNull()
    expect(parseAllowedOrigins(undefined)).toEqual([])
  })

  it('answers CORS for the one origin only', () => {
    const headers = corsHeaders(ORIGIN)

    expect(headers['Access-Control-Allow-Origin']).toBe(ORIGIN)
    expect(headers['Access-Control-Allow-Methods']).toBe('POST, OPTIONS')
    expect(headers.Vary).toBe('Origin')
  })

  it('reads a small JSON object and refuses big, malformed or non-object bodies', async () => {
    await expect(readJsonBody(post('/x', { a: 1 }))).resolves.toEqual({
      ok: true,
      value: { a: 1 }
    })
    await expect(readJsonBody(post('/x', { a: 'x'.repeat(MAX_BODY_BYTES) }))).resolves.toEqual({
      ok: false,
      status: 413
    })
    await expect(readJsonBody(post('/x', '{nope'))).resolves.toEqual({ ok: false, status: 400 })
    await expect(readJsonBody(post('/x', '[1]'))).resolves.toEqual({ ok: false, status: 400 })
  })

  it('reads the email from an id_token and tolerates junk', () => {
    expect(emailFromIdToken(idToken('a@example.com'))).toBe('a@example.com')
    expect(emailFromIdToken('not-a-jwt')).toBe('')
    expect(emailFromIdToken(undefined)).toBe('')
  })
})
