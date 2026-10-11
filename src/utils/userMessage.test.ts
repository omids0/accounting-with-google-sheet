import { describe, expect, it } from 'vitest'

import { toUserMessage, USER_MESSAGES } from './userMessage'

class StatusError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

describe('toUserMessage', () => {
  it('passes Persian messages the app threw itself', () => {
    expect(toUserMessage(new Error('مبلغ نامعتبر است'), 'x')).toBe('مبلغ نامعتبر است')
    expect(toUserMessage(new Error('خطا در خروجی PDF'), 'x')).toBe('خطا در خروجی PDF')
  })

  it('translates Google prose by its wording', () => {
    expect(
      toUserMessage(
        new Error('Request had invalid authentication credentials. Expected OAuth 2 access token'),
        'x'
      )
    ).toBe(USER_MESSAGES.auth)
    expect(toUserMessage(new Error('The caller does not have permission'), 'x')).toBe(
      USER_MESSAGES.noAccess
    )
    expect(toUserMessage(new Error('Requested entity was not found.'), 'x')).toBe(
      USER_MESSAGES.notFound
    )
    expect(toUserMessage(new Error('Unable to parse range: Foo!A1'), 'x')).toBe(
      USER_MESSAGES.badRequest
    )
  })

  it('recognises network failures from every engine', () => {
    for (const text of [
      'Failed to fetch',
      'NetworkError when attempting to fetch resource.',
      'Load failed'
    ]) {
      expect(toUserMessage(new TypeError(text), 'x')).toBe(USER_MESSAGES.offline)
    }
  })

  it('falls back to the HTTP status when the wording is unknown', () => {
    expect(toUserMessage(new StatusError('Internal error encountered.', 503), 'x')).toBe(
      USER_MESSAGES.server
    )
    expect(toUserMessage(new StatusError('خطای API: 500', 500), 'x')).toBe(USER_MESSAGES.server)
    expect(toUserMessage(new StatusError('Something odd', 418), 'پیش‌فرض')).toBe('پیش‌فرض')
  })

  it('never returns Latin-only text', () => {
    expect(toUserMessage(new Error('Unexpected token < in JSON'), 'ذخیره ناموفق بود')).toBe(
      'ذخیره ناموفق بود'
    )
    expect(toUserMessage(undefined, 'ذخیره ناموفق بود')).toBe('ذخیره ناموفق بود')
    expect(toUserMessage('Requested entity was not found', 'x')).toBe(USER_MESSAGES.notFound)
  })
})
