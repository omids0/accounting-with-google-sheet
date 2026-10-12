/**
 * Turns any thrown value into a Persian sentence safe to show the user.
 * Error objects keep their original (often English) message, because
 * `isAuthError` and the Sheets error matchers rely on that text.
 */
export const USER_MESSAGES = {
  offline: 'اتصال اینترنت برقرار نیست؛ تغییرها بعد از اتصال ارسال می‌شوند.',
  exportOffline: 'برای خروجی به اینترنت نیاز است',
  auth: 'نشست ورود منقضی شده؛ دوباره با گوگل وارد شوید.',
  noAccess: 'به این شیت دسترسی ندارید؛ با همان حساب گوگلی که شیت را ساخته وارد شوید.',
  notFound: 'شیت یا برگه موردنظر پیدا نشد؛ شاید حذف یا جابه‌جا شده باشد.',
  quota: 'محدودیت درخواست Google Sheets پر شده. حدود یک دقیقه صبر کنید و دوباره تلاش کنید.',
  badRequest: 'گوگل شیت این درخواست را نپذیرفت؛ اگر تکرار شد، شیت را از تنظیمات دوباره باز کنید.',
  server: 'گوگل شیت موقتاً پاسخ نمی‌دهد؛ کمی بعد دوباره تلاش کنید.'
} as const

const TEXT_RULES: [RegExp, string][] = [
  [
    /failed to fetch|networkerror|load failed|network request failed|err_internet|timed? ?out|aborted/i,
    USER_MESSAGES.offline
  ],
  [
    /invalid authentication|invalid credentials|unauthenticated|expected oauth|invalid_grant|invalid_token/i,
    USER_MESSAGES.auth
  ],
  [
    /caller does not have permission|permission[_ ]denied|insufficient permission/i,
    USER_MESSAGES.noAccess
  ],
  [/requested entity was not found|not found/i, USER_MESSAGES.notFound],
  [/quota|rate limit|too many requests/i, USER_MESSAGES.quota],
  [/unable to parse range|invalid argument|bad request/i, USER_MESSAGES.badRequest]
]

const PERSIAN_LETTER = /[؀-ۿ]/

const LATIN_WORD = /[A-Za-z]{3,}/

function statusMessage(status: number): string | null {
  if (status === 401) return USER_MESSAGES.auth
  if (status === 403) return USER_MESSAGES.noAccess
  if (status === 404) return USER_MESSAGES.notFound
  if (status === 429) return USER_MESSAGES.quota
  if (status === 400) return USER_MESSAGES.badRequest
  if (status >= 500) return USER_MESSAGES.server

  return null
}

export function toUserMessage(err: unknown, fallback: string): string {
  const text =
    err instanceof Error ? err.message : typeof err === 'string' ? err : String(err ?? '')

  // Persian sentences the app threw itself are already meant for the user.
  if (PERSIAN_LETTER.test(text) && !LATIN_WORD.test(text)) return text

  for (const [pattern, message] of TEXT_RULES) {
    if (pattern.test(text)) return message
  }

  const status = (err as { status?: unknown } | null)?.status

  if (typeof status === 'number') return statusMessage(status) ?? fallback
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return USER_MESSAGES.offline

  return PERSIAN_LETTER.test(text) ? text : fallback
}

/** Exports are not queued like sheet writes, so "sent after reconnect" would be a false promise. */
export function toExportErrorMessage(err: unknown, fallback: string): string {
  const message = toUserMessage(err, fallback)

  return message === USER_MESSAGES.offline ? USER_MESSAGES.exportOffline : message
}
