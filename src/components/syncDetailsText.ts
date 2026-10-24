import type { RetryOutcome } from '../services/failedWrites'

export type RetryToast = { kind: 'success' | 'error' | 'info'; message: string }

/** The toast after «دوباره بفرست»: what reached the sheet and what did not. */
export function describeRetryOutcome(outcome: RetryOutcome, offline: boolean): RetryToast {
  const { retried, pending, failed } = outcome

  if (failed > 0) {
    return {
      kind: 'error',
      message: `${failed.toLocaleString(
        'fa-IR'
      )} عملیات هنوز به شیت نمی‌رسد؛ علتش در همین پنجره نوشته شده است.`
    }
  }

  if (pending > 0) {
    return {
      kind: 'info',
      message: offline
        ? `آفلاین هستی؛ ${pending.toLocaleString(
            'fa-IR'
          )} تغییر در صف می‌ماند و با وصل شدن اینترنت فرستاده می‌شود.`
        : `${pending.toLocaleString('fa-IR')} تغییر هنوز در صف است و کمی بعد دوباره فرستاده می‌شود.`
    }
  }

  return {
    kind: 'success',
    message: retried
      ? `${retried.toLocaleString('fa-IR')} عملیات ناموفق دوباره فرستاده شد و به شیت رسید.`
      : 'همهٔ تغییرها به شیت رسید.'
  }
}
