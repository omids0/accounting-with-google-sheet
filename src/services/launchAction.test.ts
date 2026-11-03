import { describe, expect, it } from 'vitest'

import {
  buildSharedSmsState,
  launchTarget,
  parseLaunchUrl,
  readSharedSmsText
} from './launchAction'

describe('parseLaunchUrl', () => {
  it('reads the web shortcut query', () => {
    expect(parseLaunchUrl('?action=expense')).toEqual({ kind: 'entry', formType: 'expense' })
    expect(parseLaunchUrl('?action=income')).toEqual({ kind: 'entry', formType: 'income' })
    expect(parseLaunchUrl('?action=sms')).toEqual({ kind: 'sms' })
  })

  it('reads the native shortcut and notification URLs', () => {
    expect(parseLaunchUrl('com.omids0.accounting://entry?action=expense')).toEqual({
      kind: 'entry',
      formType: 'expense'
    })
    expect(parseLaunchUrl('com.omids0.accounting://entry')).toEqual({ kind: 'entry' })
    expect(parseLaunchUrl('com.omids0.accounting://bank-sms')).toEqual({ kind: 'sms' })
  })

  it('reads the notification quick action, and keeps the old URL opening the page', () => {
    const id = 'a'.repeat(64)

    expect(parseLaunchUrl(`com.omids0.accounting://bank-sms/quick?id=${id}`)).toEqual({
      kind: 'smsQuick',
      id
    })
    // An older APK, or a quick URL without a usable id, still opens «پیامک‌های بانکی».
    expect(parseLaunchUrl('com.omids0.accounting://bank-sms')).toEqual({ kind: 'sms' })
    expect(parseLaunchUrl('com.omids0.accounting://bank-sms/quick')).toEqual({ kind: 'sms' })
    expect(parseLaunchUrl('com.omids0.accounting://bank-sms/quick?id=')).toEqual({ kind: 'sms' })
    expect(parseLaunchUrl('com.omids0.accounting://bank-sms/quick?id=../x')).toEqual({
      kind: 'sms'
    })
  })

  it('reads the home-screen widget body as «open the dashboard»', () => {
    expect(parseLaunchUrl('com.omids0.accounting://dashboard')).toEqual({ kind: 'dashboard' })
  })

  it('reads the share target text, with or without its own marker', () => {
    const text = 'بانک ملت\nبرداشت:90,000'
    const query = new URLSearchParams({ text }).toString()

    expect(parseLaunchUrl(`?share=1&${query}`)).toEqual({ kind: 'share', text })
    expect(parseLaunchUrl(`?${query}`)).toEqual({ kind: 'share', text })
    expect(parseLaunchUrl('?share=1&text=+%20')).toBeNull()
  })

  it('ignores empty, unknown and unrelated URLs', () => {
    expect(parseLaunchUrl(undefined)).toBeNull()
    expect(parseLaunchUrl('')).toBeNull()
    expect(parseLaunchUrl('?action=toString')).toBeNull()
    expect(parseLaunchUrl('?type=expense')).toBeNull()
    expect(parseLaunchUrl('https://example.com/entry?x=1')).toBeNull()
  })
})

describe('launchTarget for the quick SMS action', () => {
  it('lands on the SMS page (or the shared home) when no sheet can open', () => {
    const action = { kind: 'smsQuick', id: 'ab' } as const

    expect(launchTarget(action, 'building')).toEqual({ tab: 'bank-sms' })
    expect(launchTarget(action, 'shared')).toEqual({ tab: 'shared-home' })
  })
})

describe('shared SMS router state', () => {
  it('round-trips the text and ignores other states', () => {
    expect(readSharedSmsText(buildSharedSmsState(' متن '))).toBe('متن')
    expect(readSharedSmsText(null)).toBe('')
    expect(readSharedSmsText({ sharedSms: 5 })).toBe('')
  })
})
