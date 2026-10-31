import { describe, expect, it } from 'vitest'

import { forgetSharedQuestion, SHARED_ACTION_LABELS, sharedCardActions } from './sharedSpaceState'

describe('sharedCardActions', () => {
  it('lets a partner open the account only', () => {
    expect(sharedCardActions('normal', false)).toEqual(['open'])
  })

  it('lets the owner open and turn it off', () => {
    expect(sharedCardActions('normal', true)).toEqual(['open', 'off'])
  })

  it('offers connecting again and forgetting, never opening, when the file is unreachable', () => {
    expect(sharedCardActions('denied', false)).toEqual(['reconnect', 'forget'])
    expect(sharedCardActions('denied', true)).toEqual(['reconnect', 'forget'])
  })
})

describe('the card words', () => {
  it('labels every action in plain Persian', () => {
    expect(SHARED_ACTION_LABELS).toEqual({
      open: 'باز کردن',
      off: 'خاموش کردن قابلیت',
      reconnect: 'اتصال دوباره',
      forget: 'پاک کردن از این دستگاه'
    })
  })

  it('asks before forgetting and says what stays untouched', () => {
    const question = forgetSharedQuestion('خانه')

    expect(question.wording.title).toBe('از این دستگاه پاک شود؟')
    expect(question.message).toBe(
      'حساب مشترک ‹خانه› فقط از این دستگاه پاک می‌شود؛ دفتر شخصی تو و فایل مالک دست نمی‌خورد'
    )
  })
})
