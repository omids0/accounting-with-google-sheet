import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  accountCards,
  cardLabel,
  filterSmsForWorkspace,
  getWorkspaceCardsVersion,
  rememberWorkspaceCards,
  routedCardAccounts,
  routedCardLabels,
  routeSmsToWorkspace,
  routingWorkspaces,
  smsForActiveWorkspace,
  subscribeWorkspaceCards,
  walletRowsToCardSources,
  type RoutingWorkspace
} from './bankSmsRouting'
import { getDefaultSettings, saveSettings } from './settings'
import { setWorkspaceType } from './workspace'

const personal: RoutingWorkspace = { id: 'personal', cards: ['6037997512345678'] }

const building: RoutingWorkspace = { id: 'building', cards: ['6104337812343210', '0101234567001'] }

const fundDeposit = {
  body: 'بانک ملت\nواریز:1,000,000\nحساب:6104***3210\nمانده:9,000,000\nاز کارت 6219***1100'
}

const personalWithdrawal = { body: 'بانک ملی\nبرداشت:90,000\nحساب:6037***5678\nمانده:3,000,000' }

const strangerSms = { body: 'بانک سامان\nانتقال از 1234...9999\nمبلغ: 300,000-\nمانده: 14,700,000' }

describe('routeSmsToWorkspace', () => {
  const workspaces = [personal, building]

  it('routes an SMS to the workspace that owns the card', () => {
    expect(routeSmsToWorkspace(fundDeposit, workspaces)).toBe('building')
    expect(routeSmsToWorkspace(personalWithdrawal, workspaces)).toBe('personal')
  })

  it('leaves a card no workspace knows unrouted (the personal queue)', () => {
    expect(routeSmsToWorkspace(strangerSms, workspaces)).toBeNull()
    expect(routeSmsToWorkspace({ body: 'سلام' }, workspaces)).toBeNull()
  })

  it('matches an account number as well as a card number', () => {
    const sms = { body: 'بانک ملی\nواریز:5,000\nاز:0101234567001' }

    expect(routeSmsToWorkspace(sms, workspaces)).toBe('building')
  })

  it('prefers the open workspace when the digits fit several', () => {
    const both = { body: 'واریز 500,000 حساب 6104***3210 از کارت 6037***5678' }

    expect(routeSmsToWorkspace(both, workspaces, 'personal')).toBe('personal')
    expect(routeSmsToWorkspace(both, workspaces, 'building')).toBe('building')
    expect(routeSmsToWorkspace(both, workspaces)).toBe('personal')
  })

  it('knows nothing about a workspace without cards', () => {
    expect(routeSmsToWorkspace(fundDeposit, [{ id: 'b', cards: [] }])).toBeNull()
  })
})

describe('filterSmsForWorkspace', () => {
  const all = [fundDeposit, personalWithdrawal, strangerSms]

  const workspaces = [personal, building]

  it('lists in the building only the SMS routed to it', () => {
    expect(filterSmsForWorkspace(all, workspaces, 'building', true)).toEqual([fundDeposit])
  })

  it('lists in the personal workspace its own and the unrouted SMS, never a building card', () => {
    expect(filterSmsForWorkspace(all, workspaces, 'personal', false)).toEqual([
      personalWithdrawal,
      strangerSms
    ])
  })

  it('keeps every SMS in the personal queue while no building is registered', () => {
    expect(filterSmsForWorkspace(all, [personal], 'personal', false)).toEqual(all)
  })
})

describe('the card cache', () => {
  beforeEach(() => {
    localStorage.clear()
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'personal-1',
      spreadsheets: [
        { id: 'personal-1', name: 'a', createdAt: '' },
        { id: 'building-1', name: 'b', createdAt: '', kind: 'building' }
      ]
    })
    setWorkspaceType('building-1', 'building')
  })

  const account = (title: string, cardNumber: string, accountNumber = '', iban = '') => ({
    title,
    cardNumber,
    accountNumber,
    iban
  })

  it('keeps the digits of card, account and IBAN, and drops stubs', () => {
    expect(accountCards(account('x', '6104-3378-1234-3210', '12', 'IR 0601700000001'))).toEqual([
      '6104337812343210',
      '0601700000001'
    ])
  })

  it('routes across two workspaces from the cached cards of each', () => {
    rememberWorkspaceCards('personal-1', [account('شخصی', '6037997512345678')])
    rememberWorkspaceCards('building-1', [account('ملت صندوق', '6104337812343210')])

    expect(routingWorkspaces().map(item => item.id)).toEqual(['personal-1', 'building-1'])
    expect(routeSmsToWorkspace(fundDeposit, routingWorkspaces(), 'personal-1')).toBe('building-1')
    // The open workspace is personal: the fund card's SMS belongs to the building's queue.
    expect(smsForActiveWorkspace([fundDeposit, personalWithdrawal])).toEqual([personalWithdrawal])
    expect(routedCardLabels('building-1')).toEqual(['۶۱۰۴…۳۲۱۰'])
  })

  it('ignores a cached workspace that is no longer registered', () => {
    rememberWorkspaceCards('gone', [account('x', '6104337812343210')])

    expect(routingWorkspaces().map(item => item.id)).not.toContain('gone')
  })

  it('announces a change only when the cards changed', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeWorkspaceCards(listener)
    const before = getWorkspaceCardsVersion()

    rememberWorkspaceCards('building-1', [account('a', '6104337812343210')])
    rememberWorkspaceCards('building-1', [account('a', '6104337812343210')])
    unsubscribe()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(getWorkspaceCardsVersion()).toBe(before + 1)
    expect(routedCardAccounts('building-1')).toHaveLength(1)
  })

  it('reads the card columns of raw «حساب‌ها» rows', () => {
    const row = Array.from({ length: 14 }, () => '')

    row[0] = 'w1'
    row[2] = 'ملت'
    row[7] = '6104337812343210'
    row[12] = '0101234567001'

    expect(walletRowsToCardSources([row, [''], ['w2']])).toEqual([
      { title: 'ملت', cardNumber: '6104337812343210', accountNumber: '0101234567001', iban: '' },
      { title: '', cardNumber: '', accountNumber: '', iban: '' }
    ])
  })
})

describe('cardLabel', () => {
  it('shows the first and last four digits in Persian digits', () => {
    expect(cardLabel('6104337812343210')).toBe('۶۱۰۴…۳۲۱۰')
    expect(cardLabel('3210')).toBe('۳۲۱۰')
  })
})
