import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  addInvite,
  invitedEmails,
  inviteMessage,
  inviteText,
  isValidEmail
} from './buildingInvites'
import { parseMembers } from './buildingRoles'
import { setWorkspaceType } from './workspace'

const written = vi.hoisted(() => ({ rows: [] as [string, string][] }))

vi.mock('./periodSettings', () => ({
  setPeriodSetting: async (_id: string, key: string, value: string) => {
    written.rows.push([key, value])
  }
}))

beforeEach(() => {
  setWorkspaceType('b1', 'building')
  written.rows.length = 0
})

describe('invites', () => {
  it('adds the role row and the invited marker for the e-mail, lower-cased', async () => {
    await addInvite('b1', ' Sara@Gmail.com ', 'accountant')

    expect(written.rows[0]).toEqual(['نقش:sara@gmail.com', 'accountant'])
    expect(written.rows[1][0]).toBe('دعوت:sara@gmail.com')
  })

  it('writes rows the roles module reads back as that member', async () => {
    await addInvite('b1', 'sara@gmail.com', 'board')

    const members = parseMembers(written.rows.map(([key, value]) => [key, value]))

    expect(members).toEqual([{ email: 'sara@gmail.com', role: 'board', overrides: {} }])
  })

  it('lists the invited e-mails of the period rows', () => {
    expect(
      invitedEmails([
        ['نقش:a@x.com', 'manager'],
        ['دعوت:b@x.com', '1405/07/01'],
        ['دعوت:C@x.com', '1405/07/02']
      ])
    ).toEqual(['b@x.com', 'c@x.com'])
  })

  it('validates an e-mail', () => {
    expect(isValidEmail('sara@gmail.com')).toBe(true)
    expect(isValidEmail('sara@')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })

  it('writes a ready-made invitation with the role and the sheet link', () => {
    const text = inviteText('نرگس', 'accountant', 'https://docs.google.com/spreadsheets/d/x')

    expect(text).toContain('«نرگس»')
    expect(text).toContain('حسابدار')
    expect(text).toContain('https://docs.google.com/spreadsheets/d/x')
  })

  it('writes the e-mail message with the inviter, the role and each link on its own line', () => {
    const text = inviteMessage({
      inviterName: 'امید',
      buildingName: 'برج آفتاب',
      role: 'accountant',
      appUrl: 'https://app.test/',
      downloadUrl: 'https://app.test/a.apk'
    })

    expect(text).toContain('امید شما را به ساختمان «برج آفتاب» با نقش «حسابدار» دعوت کرده است.')
    expect(text).toContain('باز کردن شیت با گوگل')
    expect(text.split('\n')).toContain('https://app.test/')
    expect(text.split('\n')).toContain('https://app.test/a.apk')
    expect(text).not.toContain('آزمایشی')
  })

  it('drops the link lines that are not set and labels a test build', () => {
    const text = inviteMessage({
      inviterName: '  ',
      buildingName: '',
      role: 'board',
      testBuild: true
    })

    expect(text.startsWith('(نسخهٔ آزمایشی اپ)')).toBe(true)
    expect(text).toContain('مدیر ساختمان شما را به یک ساختمان')
    expect(text).not.toContain('http')
    expect(text).not.toContain('نسخهٔ اندروید')
    expect(text).not.toContain('undefined')
  })
})
