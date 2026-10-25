import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DRIVE_ROLE, inviteMember } from './buildingMemberDrive'
import { getDefaultSettings, saveSettings } from './settings'
import { setSheetAllRows } from './spreadsheetStore'
import { setWorkspaceType } from './workspace'

const calls = vi.hoisted(() => ({ order: [] as string[], message: '' }))

vi.mock('./auth', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getUserEmail: () => 'boss@x.com',
  getUserName: () => 'امید'
}))

vi.mock('./driveShare', () => ({
  setFileRole: async () => undefined,
  unshareFile: async () => undefined,
  shareFile: async (_id: string, email: string, role: string, message?: string) => {
    calls.order.push(`share:${email}:${role}`)
    calls.message = message ?? ''
    if (email === 'refused@x.com') throw new Error('forbidden')
  }
}))

vi.mock('./sharing', () => ({ refreshSharingInfo: async () => undefined }))

vi.mock('./periodSettings', () => ({
  setPeriodSetting: async (_id: string, key: string) => {
    calls.order.push(`row:${key}`)
  }
}))

beforeEach(() => {
  calls.order.length = 0
  calls.message = ''
  saveSettings({ ...getDefaultSettings(), spreadsheetId: 'b1' })
  setWorkspaceType('b1', 'building')
  setSheetAllRows('b1', 'تنظیمات دوره', [
    ['کلید', 'مقدار', 'زمان ثبت'],
    ['نقش:boss@x.com', 'manager', ''],
    ['نقش:acc@x.com', 'accountant', '']
  ])
})

describe('inviteMember', () => {
  it('shares first, then writes the member and invite rows', async () => {
    expect(await inviteMember('b1', ' Sara@x.com ', 'board', 'برج')).toBeNull()

    expect(calls.order).toEqual([
      'share:sara@x.com:reader',
      'row:نقش:sara@x.com',
      'row:دعوت:sara@x.com'
    ])
    expect(calls.message).toContain('امید شما را به ساختمان «برج»')
  })

  it('writes no row when Drive refuses the share', async () => {
    await expect(inviteMember('b1', 'refused@x.com', 'accountant', 'برج')).rejects.toThrow(
      'forbidden'
    )

    expect(calls.order).toEqual(['share:refused@x.com:writer'])
  })

  it('refuses yourself and an e-mail that is already a member, without any call', async () => {
    expect(await inviteMember('b1', 'BOSS@x.com', 'board', 'برج')).toBe('self')
    expect(await inviteMember('b1', 'acc@x.com', 'board', 'برج')).toBe('exists')
    expect(calls.order).toEqual([])
  })

  it('gives the writing roles Drive «writer» and the board «reader»', () => {
    expect(DRIVE_ROLE).toEqual({ manager: 'writer', accountant: 'writer', board: 'reader' })
  })
})
