import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setFileRole, shareErrorMessage, shareFile, unshareFile } from './driveShare'
import { SheetsApiError } from './sheetsApi'

const api = vi.hoisted(() => ({
  calls: [] as { url: string; init?: RequestInit }[],
  reply: {} as unknown
}))

vi.mock('./sheetsApi', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  apiRequest: async (url: string, init?: RequestInit) => {
    api.calls.push({ url, init })

    return api.reply
  }
}))

beforeEach(() => {
  api.calls.length = 0
  api.reply = {}
})

describe('shareFile', () => {
  it('posts a user permission and lets Drive send the e-mail with the message', async () => {
    await shareFile('f1', ' Sara@Gmail.com ', 'writer', 'سلام\nhttps://x.test/')

    const [call] = api.calls

    expect(call.url).toContain('/files/f1/permissions?supportsAllDrives=true')
    expect(call.url).toContain('sendNotificationEmail=true')
    expect(call.url).toContain(`emailMessage=${encodeURIComponent('سلام\nhttps://x.test/')}`)
    expect(call.init?.method).toBe('POST')
    expect(JSON.parse(String(call.init?.body))).toEqual({
      type: 'user',
      role: 'writer',
      emailAddress: 'sara@gmail.com'
    })
  })

  it('sends no e-mail when there is no message', async () => {
    await shareFile('f1', 'a@x.com', 'reader')

    expect(api.calls[0].url).toContain('sendNotificationEmail=false')
    expect(api.calls[0].url).not.toContain('emailMessage')
  })
})

describe('setFileRole / unshareFile', () => {
  it('patches the role of the permission Drive lists for the e-mail', async () => {
    api.reply = { permissions: [{ id: 'p9', emailAddress: 'Sara@gmail.com', role: 'reader' }] }
    await setFileRole('f1', 'sara@gmail.com', 'writer')

    expect(api.calls[1].url).toContain('/permissions/p9?')
    expect(api.calls[1].init?.method).toBe('PATCH')
    expect(JSON.parse(String(api.calls[1].init?.body))).toEqual({ role: 'writer' })
  })

  it('adds the person without an e-mail when Drive does not know them', async () => {
    api.reply = { permissions: [] }
    await setFileRole('f1', 'new@x.com', 'reader')

    expect(api.calls[1].init?.method).toBe('POST')
    expect(api.calls[1].url).toContain('sendNotificationEmail=false')
  })

  it('never changes or removes the owner', async () => {
    api.reply = { permissions: [{ id: 'o1', emailAddress: 'boss@x.com', role: 'owner' }] }
    await setFileRole('f1', 'boss@x.com', 'reader')
    await unshareFile('f1', 'boss@x.com')

    expect(api.calls.every(call => !call.init?.method)).toBe(true)
  })

  it('deletes the permission of the e-mail, and does nothing for an unknown one', async () => {
    api.reply = { permissions: [{ id: 'p2', emailAddress: 'a@x.com', role: 'writer' }] }
    await unshareFile('f1', 'a@x.com')
    await unshareFile('f1', 'other@x.com')

    expect(api.calls.filter(call => call.init?.method === 'DELETE')).toHaveLength(1)
    expect(api.calls.find(call => call.init?.method === 'DELETE')?.url).toContain(
      '/permissions/p2?'
    )
  })
})

describe('shareErrorMessage', () => {
  it('explains a refused share instead of the generic «no access»', () => {
    expect(shareErrorMessage(new SheetsApiError('forbidden', 403))).toContain('اجازهٔ اشتراک')
    expect(shareErrorMessage(new SheetsApiError('bad', 400))).toContain('ایمیل')
    expect(shareErrorMessage(new SheetsApiError('slow', 429))).toContain('محدود')
  })

  it('says to go online when the request never reached Google', () => {
    expect(shareErrorMessage(new TypeError('Failed to fetch'))).toContain('آنلاین')
  })
})
