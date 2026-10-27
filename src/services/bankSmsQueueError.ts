/** What the user reads when a save finished but the SMS did not leave the native queue. */
export const QUEUE_NOT_LEFT_MESSAGE =
  'رکورد ذخیره شد و موجودی به‌روز شد، ولی پیامک از صف بیرون نرفت. همان را «⋯ ← قبلاً ثبت شده» ببند و دوباره ثبتش نکن.'

/**
 * The record and its balance are saved, only the native «handled» mark failed. A caller that has a
 * message of its own for «the balance was not updated» must show this one instead.
 */
export class QueueNotLeftError extends Error {
  constructor() {
    super(QUEUE_NOT_LEFT_MESSAGE)
    this.name = 'QueueNotLeftError'
  }
}
