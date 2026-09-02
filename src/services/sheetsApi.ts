import { getAccessToken } from './auth'

export const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'

function token(): string {
  return getAccessToken()
}

export function isSpreadsheetNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)

  return /not found|requested entity was not found/i.test(msg)
}

export function isQuotaExceededError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)

  return /quota exceeded|rate limit|too many requests/i.test(msg)
}

export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))

    const message =
      (err as { error?: { message?: string } }).error?.message || `خطای API: ${res.status}`

    if (isQuotaExceededError(message)) {
      const { markQuotaExceeded } = await import('./sheetSync')

      markQuotaExceeded()
      throw new Error(
        'محدودیت درخواست Google Sheets پر شده. حدود یک دقیقه صبر کنید و دوباره تلاش کنید.'
      )
    }
    throw new Error(message)
  }
  if (res.status === 204) return {} as T

  return res.json() as Promise<T>
}
