import { showError, showSuccess } from './toast'

/**
 * Shares a plain text (a statement, a receipt, a reminder): the system share sheet when the
 * browser has one, else the clipboard. Closing the share sheet is not an error.
 */
export async function shareText(text: string, title: string): Promise<void> {
  if (!text) return

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text })

      return
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return
      // Any other failure falls through to the clipboard.
    }
  }

  try {
    await navigator.clipboard.writeText(text)
    showSuccess('متن کپی شد')
  } catch {
    showError('اشتراک‌گذاری ناموفق بود')
  }
}
