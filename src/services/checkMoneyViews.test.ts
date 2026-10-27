import { describe, expect, it } from 'vitest'

import { applyNetAvailableConfig } from './dashboardNetAvailable'
import { dueItemIcsSummary } from './dueCalendar'
import { parseImportCsv } from './importPlan'
import { getUpcomingDueDateReminders } from './reminderDueDates'
import { collectCheckDueItems, getDueDateItemLabel } from './reports'
import { CHECKS_HEADERS } from './sheetHeaders'
import { selectedPartLabels } from '../components/dashboard/DashboardBalanceBlock'
import type { Check, NetAvailableConfig, ReminderRule } from '../types'
import { isLockedExpenseCategory, withLockedIncomeCategories } from '../utils/protectedCategories'

const check = (overrides: Partial<Check>): Check => ({
  id: 'c1',
  createdAt: '',
  checkNumber: '777',
  direction: 'paid',
  counterparty: 'علی',
  amount: 1_000_000,
  creationDate: '2026-10-01',
  dueDate: '2026-10-20',
  paid: false,
  paidAt: '',
  ...overrides
})

const ALL_ON: NetAvailableConfig = {
  assets: { wallet: true, treasury: true, goals: true, receivables: true, checksReceived: true },
  liabilities: { installments: true, dangs: true, checks: true }
}

const financial = {
  walletTotal: 100,
  treasuryTotal: 0,
  receivablesTotal: 10,
  installmentsDue: 5,
  dangsTotal: 0,
  checksDue: 30,
  checksReceivable: 20
}

describe('net available with checks', () => {
  it('adds received checks to the assets and takes only payable ones off', () => {
    expect(applyNetAvailableConfig(financial, ALL_ON)).toEqual({
      totalAssets: 130,
      totalLiabilities: 35,
      netAvailable: 95
    })
  })

  it('leaves received checks out when their switch is off, independent of the payable one', () => {
    const off = { ...ALL_ON, assets: { ...ALL_ON.assets, checksReceived: false } }

    expect(applyNetAvailableConfig(financial, off).totalAssets).toBe(110)
    expect(applyNetAvailableConfig(financial, off).totalLiabilities).toBe(35)

    const noPayable = { ...ALL_ON, liabilities: { ...ALL_ON.liabilities, checks: false } }

    expect(applyNetAvailableConfig(financial, noPayable).totalLiabilities).toBe(5)
    expect(applyNetAvailableConfig(financial, noPayable).totalAssets).toBe(130)
  })

  it('reads an older summary without received checks as zero', () => {
    const { checksReceivable: _, ...older } = financial

    expect(applyNetAvailableConfig(older, ALL_ON).totalAssets).toBe(110)
  })

  it('names the parts of each total: received checks only once there are some', () => {
    expect(selectedPartLabels(ALL_ON, false, true).assets).toContain('چک‌های دریافتی')
    expect(selectedPartLabels(ALL_ON).assets).not.toContain('چک‌های دریافتی')
    expect(selectedPartLabels(ALL_ON).liabilities).toContain('چک‌های پرداختی')
  })

  it('says which day the wallet is counted at when the period has ended', () => {
    expect(selectedPartLabels(ALL_ON).assets).toContain('کیف پول')
    expect(selectedPartLabels(ALL_ON, false, false, 'تا پایان مهر ۱۴۰۵').assets).toContain(
      'کیف پول (تا پایان مهر ۱۴۰۵)'
    )
  })
})

describe('due items and reminders', () => {
  it('tells the type of a check in the due-date report', () => {
    const [paid, received] = collectCheckDueItems(
      [check({}), check({ id: 'c2', direction: 'received' }), check({ id: 'c3', paid: true })],
      '2026-10-10',
      '2026-11-10'
    )

    expect(getDueDateItemLabel(paid)).toBe('چک پرداختی')
    expect(paid.incoming).toBe(false)
    expect(getDueDateItemLabel(received)).toBe('چک دریافتی')
    expect(received.incoming).toBe(true)
  })

  it('words the notification by type', () => {
    const rule = {
      kind: 'checks',
      enabled: true,
      daysBefore: 1,
      hour: 9,
      minute: 0
    } as ReminderRule
    const checks = [check({}), check({ id: 'c2', direction: 'received' })]
    const [paid, received] = getUpcomingDueDateReminders('checks', checks, rule, '2026-10-19')

    expect(paid.title).toBe('یادآوری چک پرداختی')
    expect(paid.body).toContain('چک پرداختی علی')
    expect(paid.body).toContain('سررسید')
    expect(received.title).toBe('یادآوری چک دریافتی')
    expect(received.body).toContain('چک دریافتی علی')
  })

  it('names the type in the phone-calendar title too', () => {
    expect(
      dueItemIcsSummary({
        id: 'x',
        kind: 'checks',
        kindLabel: 'چک دریافتی',
        title: 'علی',
        subtitle: 'شماره 7',
        dueDate: '2026-10-20',
        amount: 0,
        status: 'upcoming'
      })
    ).toBe('چک دریافتی علی')
  })
})

describe('the «چک» category', () => {
  it('is locked for income as well, since a received check writes an income record', () => {
    expect(withLockedIncomeCategories(['حقوق'])).toContain('چک')
    expect(isLockedExpenseCategory('چک')).toBe(true)
  })
})

describe('CSV import header', () => {
  const rowOf = (headers: string[]) => `${headers.join(',')}\n`

  it('still recognises a file exported before the type column existed', () => {
    const old = rowOf(CHECKS_HEADERS.slice(0, CHECKS_HEADERS.length - 1))
    const older = rowOf(CHECKS_HEADERS.slice(0, 11))

    expect(parseImportCsv(`${old}a,b,1,c,5`, CHECKS_HEADERS).firstLine).toBe(2)
    expect(parseImportCsv(`${older}a,b,1,c,5`, CHECKS_HEADERS).firstLine).toBe(2)
    expect(parseImportCsv(rowOf(CHECKS_HEADERS), CHECKS_HEADERS).firstLine).toBe(2)
  })
})
