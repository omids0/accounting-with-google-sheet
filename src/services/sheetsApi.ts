import { getAccessToken, isTokenValid } from './auth'

export const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'

function token(): string {
  return getAccessToken()
}

export function isSpreadsheetNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)

  return /not found|requested entity was not found/i.test(msg)
}

/** Error from the Sheets API that keeps the HTTP status, so callers need not match text. */
export class SheetsApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'SheetsApiError'
    this.status = status
  }
}

/**
 * With the drive.file scope Google answers a spreadsheet this app neither created
 * nor opened through the Picker with 403 "The caller does not have permission"
 * (or hides it behind a 404). Either way the app cannot use that file. Other 403s
 * (quota, missing scope, API disabled) are not this case.
 */
export function isSpreadsheetAccessDeniedError(err: unknown): boolean {
  if (isSpreadsheetNotFoundError(err)) return true
  if (err instanceof SheetsApiError && err.status === 404) return true

  const msg = err instanceof Error ? err.message : String(err)

  return /caller does not have permission|permission[_ ]denied/i.test(msg)
}

export function isQuotaExceededError(err: unknown): boolean {
  if (err instanceof SheetsApiError && err.status === 429) return true

  const msg = err instanceof Error ? err.message : String(err)

  return /quota exceeded|rate limit|too many requests/i.test(msg)
}

/**
 * True when retrying the same request can never succeed (bad range, invalid
 * value, oversized cell). Auth, quota and server errors are worth retrying.
 */
export function isPermanentApiError(err: unknown): boolean {
  if (!(err instanceof SheetsApiError)) return false

  const { status } = err

  return status >= 400 && status < 500 && ![401, 403, 408, 409, 429].includes(status)
}

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
  allowAuthRetry = true
): Promise<T> {
  if (!isTokenValid()) {
    const { ensureFreshAccessToken } = await import('./tokenRefresh')

    await ensureFreshAccessToken()
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  // A token the app still believes in can already be dead on Google's side, and
  // the reply carries no status the caller could match on. Renew once, quietly.
  if (res.status === 401 && allowAuthRetry) {
    const { forceRefreshAccessToken } = await import('./tokenRefresh')

    if (await forceRefreshAccessToken()) return apiRequest<T>(url, options, false)
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))

    const message =
      (err as { error?: { message?: string } }).error?.message || `خطای API: ${res.status}`

    if (res.status === 429 || isQuotaExceededError(message)) {
      const { markQuotaExceeded } = await import('./sheetSync')

      markQuotaExceeded()
      throw new SheetsApiError(
        'محدودیت درخواست Google Sheets پر شده. حدود یک دقیقه صبر کنید و دوباره تلاش کنید.',
        429
      )
    }
    throw new SheetsApiError(message, res.status)
  }
  if (res.status === 204) return {} as T

  return res.json() as Promise<T>
}
