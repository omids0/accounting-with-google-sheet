import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getDefaultSettings,
  getSettings,
  getSpreadsheets,
  saveSettings,
  setActiveSpreadsheet
} from './settings'
import {
  hideSharedAccount,
  isSharedAccountHidden,
  registeredSharedAccount,
  visibleSharedAccount
} from './sharedAccountSwitch'
import { forgetSharedLocal, leaveSharedAccount, loadSharedNet } from './sharedLeave'
import { SheetsApiError } from './sheetsApi'
import { setSheetAllRows } from './spreadsheetStore'
import { addOutboxEntry, getOutboxCount } from './syncOutbox'
import { getWorkspaceType, hasSharedAccount, setWorkspaceType } from './workspace'
import {
  leaveConfirmMessage,
  removeMemberMessage,
  sharedOffIntro,
  withBalanceWarning
} from '../components/shared/memberCopy'
import { sharedBalanceWarning } from '../components/shared/sharedViewModel'

const user = vi.hoisted(() => ({ email: 'partner@x.com' }))

const calls = vi.hoisted(() => ({
  events: [] as string[],
  deleted: [] as string[],
  /** What Drive lists besides the owner; a resolved unshare takes the e-mail out. */
  drive: [] as string[],
  unshare: async (): Promise<void> => undefined,
  list: async (): Promise<void> => undefined,
  remove: async (): Promise<void> => undefined
}))

vi.mock('./auth', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getUserEmail: () => user.email
}))

vi.mock('./driveShare', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  listSharedEmails: async () => {
    calls.events.push('list')
    await calls.list()

    return [...calls.drive]
  },
  unshareFile: async (_id: string, email: string) => {
    calls.events.push(`unshare:${email}`)
    await calls.unshare()
    calls.drive = calls.drive.filter(item => item !== email)
  }
}))

vi.mock('./sheetSync', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  flushOutbox: async () => {
    calls.events.push('flush')

    return true
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

const OWNER = ['نقش:owner@x.com', 'owner', 't']

const PARTNER = ['نقش:partner@x.com', 'partner', 't']

const remote = vi.hoisted(() => ({
  tabs: new Map<string, string[][]>(),
  members: [] as string[][]
}))

vi.mock('./sharedLink', async () => {
  const { sharedRecordForm } = await import('./sharedLinkRows')

  return {
    readTarget: async () => ({
      form: sharedRecordForm('expense'),
      read: new Map([['تنظیمات دوره', [['کلید', 'مقدار', 'زمان ثبت'], ...remote.members]]]),
      tabs: remote.tabs
    })
  }
})

beforeEach(() => {
  localStorage.clear()
  calls.events = []
  calls.deleted = []
  calls.drive = ['partner@x.com']
  calls.unshare = async () => undefined
  calls.list = async () => undefined
  calls.remove = async () => undefined
  remote.members = [OWNER, PARTNER]
  user.email = 'partner@x.com'
  saveSettings({
    ...getDefaultSettings(),
    spreadsheetId: 's1',
    spreadsheets: [
      { id: 'p1', name: 'حسابداری · شخصی', createdAt: '' },
      { id: 's1', name: 'حسابداری · مشترک خانه', createdAt: '', kind: 'shared' }
    ]
  })
  setWorkspaceType('s1', 'shared')
  setSheetAllRows('s1', 'تنظیمات دوره', [HEADER, OWNER, PARTNER])
})

const refuse = (status: number) => async () => {
  throw new SheetsApiError('refused', status)
}

/**
 * Hidden at once; unregistered once the route has switched to the personal sheet: «فضاهای من»
 * offers «راه‌اندازی» / «اتصال» again.
 */
const expectForgotten = () => {
  expect(visibleSharedAccount()).toBeNull()
  expect(getOutboxCount('s1')).toBe(0)
  setActiveSpreadsheet('p1')
  forgetSharedLocal('s1')

  expect(getSettings()?.spreadsheetId).toBe('p1')
  expect(getWorkspaceType('s1')).toBe('personal')
  expect(hasSharedAccount()).toBe(false)
  expect(visibleSharedAccount()).toBeNull()
  expect(registeredSharedAccount()).toBeNull()
  expect(isSharedAccountHidden('s1')).toBe(false)
  expect(getSpreadsheets().map(entry => entry.id)).toEqual(['p1'])
}

describe('leaveSharedAccount', () => {
  it('sends what is queued first, takes the own share back and unregisters: «removed»', async () => {
    await expect(leaveSharedAccount('s1')).resolves.toBe('removed')

    expect(calls.events).toEqual(['flush', 'list', 'unshare:partner@x.com', 'list'])
    expect(calls.deleted).toEqual([])
    expectForgotten()
  })

  it('is «removed» when the re-check cannot read the file any more (access gone)', async () => {
    calls.unshare = async () => {
      calls.list = refuse(404)
    }

    await expect(leaveSharedAccount('s1')).resolves.toBe('removed')
    expectForgotten()
  })

  it('falls back when Drive refuses: own member rows removed, account unregistered', async () => {
    calls.unshare = refuse(403)
    // A row that cannot be sent any more must not hold the switch at «تغییرهای ارسال‌نشده».
    addOutboxEntry('s1', { type: 'append', sheetName: 'هزینه', row: ['x'] })

    await expect(leaveSharedAccount('s1')).resolves.toBe('fallback')

    expect(calls.deleted).toEqual([
      'نقش:partner@x.com',
      'دسترسی:partner@x.com',
      'دعوت:partner@x.com'
    ])
    expectForgotten()
  })

  it('falls back when Drive still lists the user after the unshare (a quiet no-op)', async () => {
    calls.unshare = async () => {
      calls.list = async () => {
        calls.drive = ['partner@x.com']
      }
    }

    await expect(leaveSharedAccount('s1')).resolves.toBe('fallback')
    expect(calls.deleted).toHaveLength(3)
  })

  it('falls back without unsharing when Drive never listed the user (it cannot tell)', async () => {
    calls.drive = []

    await expect(leaveSharedAccount('s1')).resolves.toBe('fallback')
    expect(calls.events).not.toContain('unshare:partner@x.com')
    expectForgotten()
  })

  it('still falls back (and unregisters) when removing the rows fails too', async () => {
    calls.unshare = refuse(404)
    calls.remove = refuse(403)

    await expect(leaveSharedAccount('s1')).resolves.toBe('fallback')
    expectForgotten()
  })

  it('keeps the account when Drive fails for another reason, so it can be tried again', async () => {
    calls.unshare = async () => {
      throw new TypeError('Failed to fetch')
    }

    await expect(leaveSharedAccount('s1')).rejects.toThrow('Failed to fetch')
    expect(calls.deleted).toEqual([])
    expect(hasSharedAccount()).toBe(true)
  })

  it('refuses the owner: the owner turns the account off instead', async () => {
    user.email = 'owner@x.com'

    await expect(leaveSharedAccount('s1')).rejects.toThrow('forbidden')
    expect(calls.events).toEqual([])
    expect(hasSharedAccount()).toBe(true)
  })

  it('«فقط از منوی من پنهان شود» keeps the registration', () => {
    hideSharedAccount('s1')

    expect(hasSharedAccount()).toBe(true)
    expect(registeredSharedAccount()?.id).toBe('s1')
    expect(visibleSharedAccount()).toBeNull()
  })

  it('never unregisters the sheet that is still open (another one would turn active)', async () => {
    await leaveSharedAccount('s1')
    forgetSharedLocal('s1')

    expect(getSettings()?.spreadsheetId).toBe('s1')
    expect(getWorkspaceType('s1')).toBe('shared')
    expect(registeredSharedAccount()?.id).toBe('s1')
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

    // The partner left (role row gone): the rows still name them, the balance stays.
    remote.members = [OWNER]
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
