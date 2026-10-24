/** Pure request helpers: CORS, JSON body limits and the id_token payload. */

/** Every request carries a short code or a 43 character id; anything bigger is abuse. */
export const MAX_BODY_BYTES = 4096

export function parseAllowedOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map(origin => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean)
}

/** The request's Origin when it is on the allow list, otherwise null. */
export function allowedOrigin(request: Request, allowed: string[]): string | null {
  const origin = request.headers.get('Origin')

  return origin && allowed.includes(origin) ? origin : null
}

export function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  }
}

export function jsonResponse(data: unknown, status: number, origin?: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(origin ? corsHeaders(origin) : {})
    }
  })
}

export type BodyResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; status: number }

export async function readJsonBody(
  request: Request,
  maxBytes = MAX_BODY_BYTES
): Promise<BodyResult> {
  const declared = Number(request.headers.get('Content-Length') ?? 0)

  if (declared > maxBytes) return { ok: false, status: 413 }

  const text = await request.text()

  if (new TextEncoder().encode(text).length > maxBytes) return { ok: false, status: 413 }

  try {
    const value: unknown = JSON.parse(text)

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { ok: false, status: 400 }
    }

    return { ok: true, value: value as Record<string, unknown> }
  } catch {
    return { ok: false, status: 400 }
  }
}

/**
 * The email in an id_token Google just returned over TLS. The signature is not
 * checked: the token never passed through the browser.
 */
export function emailFromIdToken(idToken: unknown): string {
  if (typeof idToken !== 'string') return ''

  try {
    const payload = idToken.split('.')[1] ?? ''

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')

    const json = new TextDecoder().decode(
      Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), c =>
        c.charCodeAt(0)
      )
    )

    const email = (JSON.parse(json) as { email?: unknown }).email

    return typeof email === 'string' ? email : ''
  } catch {
    return ''
  }
}
