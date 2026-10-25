import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getDefaultSettings, saveSettings } from './settings'
import { isSharedAccountHidden } from './sharedAccountSwitch'
import { leaveSharedAccount, loadSharedNet } from './sharedLeave'
import { SheetsApiError } from './sheetsApi'
import { setSheetAllRows } from './spreadsheetStore'
import { setWorkspaceType } from './workspace'
import {
  leaveConfirmMessage,
  removeMemberMessage,
  sharedOffIntro,
  withBalanceWarning
} from '../components/shared/memberCopy'
import { sharedBalanceWarning } from '../components/shared/sharedViewModel'

const user = vi.hoisted(() => ({ email: 'partner@x.com' }))

const calls = vi.hoisted(() => ({
  unshared: [] as string[],
  deleted: [] as string[],
  unshare: async (): Promise<void> => undefined,
  remove: async (): Promise<void> => undefined
}))

vi.mock('./auth', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getUserEmail: () => user.email
}))

vi.mock('./driveShare', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  unshareFile: async (_id: string, email: string) => {
    calls.unshared.push(email)
    await calls.unshare()
  }
}))

vi.mock('./buildingSettings', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  deleteMemberSettings: async (_id: string, keys: string[]) => {
    calls.deleted.push(...keys)
    await calls.remove()
  }
}))

const HEADER = ['کلید', 'مقدار', 'زمان ثبت']

const remote = vi.hoisted(() => ({ tabs: new Map<string, string[][]>() }))

vi.mock('./sharedLink', async () => {
  const { sharedRecordForm } = await import('./sharedLinkRows')

  return {
    readTarget: async () => ({
      form: sharedRecordForm('expense'),
      read: new Map([
        [
          'تنظیمات دوره',
          [
            ['کلید', 'مقدار', 'زمان ثبت'],
            ['نقش:owner@x.com', 'owner', 't'],
            ['نقش:partner@x.com', 'partner', 't']
          ]
        ]
      ]),
      tabs: remote.tabs
    })
  }
})

beforeEach(() => {
  localStorage.clear()
  calls.unshared = []
  calls.deleted = []
  calls.unshare = async () => undefined
  calls.remove = async () => undefined
  user.email = 'partner@x.com'
  saveSettings({ ...getDefaultSettings(), spreadsheetId: 's1' })
  setWorkspaceType('s1', 'shared')
  setSheetAllRows('s1', 'تنظیمات دوره', [
    HEADER,
    ['نقش:owner@x.com', 'owner', 't'],
    ['نقش:partner@x.com', 'partner', 't']
  ])
})

describe('leaveSharedAccount', () => {
  it('takes the own Drive share back and hides the account: «removed»', async () => {
    await expect(leaveSharedAccount('s1')).resolves.toBe('removed')

    expect(calls.unshared).toEqual(['partner@x.com'])
    expect(isSharedAccountHidden('s1')).toBe(true)
  })

  it('falls back when Drive refuses: own member rows removed, account hidden', async () => {
    calls.unshare = async () => {
      throw new SheetsApiError('forbidden', 403)
    }

    await expect(leaveSharedAccount('s1')).resolves.toBe('fallback')

    expect(calls.deleted).toEqual([
      'نقش:partner@x.com',
      'دسترسی:partner@x.com',
      'دعوت:partner@x.com'
    ])
    expect(isSharedAccountHidden('s1')).toBe(true)
  })

  it('still falls back (and hides) when removing the rows fails too', async () => {
    calls.unshare = async () => {
      throw new SheetsApiError('not found', 404)
    }
    calls.remove = async () => {
      throw new SheetsApiError('read only', 403)
    }

    await expect(leaveSharedAccount('s1')).resolves.toBe('fallback')
    expect(isSharedAccountHidden('s1')).toBe(true)
  })

  it('keeps the account when Drive fails for another reason, so it can be tried again', async () => {
    calls.unshare = async () => {
      throw new TypeError('Failed to fetch')
    }

    await expect(leaveSharedAccount('s1')).rejects.toThrow('Failed to fetch')
    expect(calls.deleted).toEqual([])
    expect(isSharedAccountHidden('s1')).toBe(false)
  })

  it('refuses the owner: the owner turns the account off instead', async () => {
    user.email = 'owner@x.com'

    await expect(leaveSharedAccount('s1')).rejects.toThrow('forbidden')
    expect(calls.unshared).toEqual([])
    expect(isSharedAccountHidden('s1')).toBe(false)
  })
})

describe('loadSharedNet', () => {
  it('reads the balance of a shared account that is not open, archives included', async () => {
    const headers = ['شناسه', 'زمان ثبت', 'مبلغ', 'دسته', 'پرداخت‌کننده', 'تقسیم']

    remote.tabs = new Map([
      ['هزینه', [headers, ['r1', 't', '1000', 'خانه', 'owner@x.com', 'equal']]],
      ['هزینه ۱۴۰۴', [headers, ['r2', 't', '600', 'خانه', 'owner@x.com', 'only:partner@x.com']]]
    ])

    expect(await loadSharedNet('s1')).toEqual({ 'owner@x.com': 1100, 'partner@x.com': -1100 })
  })
})

describe('sharedBalanceWarning', () => {
  const names = { 'mina@x.com': 'مینا' }

  it('says who owes whom and how much while the balance is open', () => {
    const net = { 'me@x.com': 3_140_000, 'mina@x.com': -3_140_000 }

    expect(sharedBalanceWarning(net, 'me@x.com', names)).toBe(
      'مینا ۳٬۱۴۰٬۰۰۰ تومان به شما بدهکار است.'
    )
    expect(sharedBalanceWarning(net, 'mina@x.com', {})).toBe('شما ۳٬۱۴۰٬۰۰۰ تومان به me بدهکارید.')
  })

  it('is null when the account is settled', () => {
    expect(sharedBalanceWarning({ 'me@x.com': 0, 'mina@x.com': 0 }, 'me@x.com', names)).toBeNull()
  })
})

describe('confirmation texts', () => {
  const warning = 'مینا ۳٬۱۴۰٬۰۰۰ تومان به شما بدهکار است.'

  it('put the balance warning first and never replace the message', () => {
    expect(leaveConfirmMessage(warning).startsWith(warning)).toBe(true)
    expect(leaveConfirmMessage(warning)).toContain('ثبت‌های شما برای بقیه می‌ماند')

    const removal = removeMemberMessage('shared', 'mina@x.com')

    expect(withBalanceWarning(warning, removal)).toBe(`${warning}\n\n${removal}`)
    expect(sharedOffIntro(warning).startsWith(warning)).toBe(true)
    expect(sharedOffIntro(warning)).toContain('حساب شخصی شما در هر دو حالت دست‌نخورده می‌ماند')
  })

  it('are the plain message when the account is settled', () => {
    expect(leaveConfirmMessage(null)).not.toContain('بدهکار')
    expect(withBalanceWarning(null, 'متن')).toBe('متن')
  })
})
