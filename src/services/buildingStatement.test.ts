import { describe, expect, it } from 'vitest'

import { buildStatement, itemLabel, reminderText, statementText } from './buildingStatement'
import type { Receivable } from '../types'
import { formatMoney } from '../utils/formatMoney'

const item = (reference: string, amount: number, fields: Partial<Receivable> = {}): Receivable => ({
  id: reference,
  createdAt: '',
  title: reference,
  debtor: 'احمدی',
  category: 'شارژ ساختمان',
  amount,
  borrowDate: '2026-10-01',
  note: '',
  payments: [],
  reference,
  ...fields
})

const header = { building: 'نرگس', unitNumber: '3', debtor: 'احمدی', card: '6037997112345678' }

describe('buildStatement', () => {
  const receivables = [
    item('charge:u1:1405-06', 1_000_000, {
      borrowDate: '2026-09-02',
      payments: [{ id: 'p1', amount: 400_000, paidAt: '2026-10-12', note: '' }]
    }),
    item('charge:u1:1405-07', 1_000_000),
    item('opening:u1', 500_000),
    item('share:u1:r1', 300_000, { subCategory: 'عمرانی', debtorId: 'owner-1' }),
    item('charge:u1:1405-04', 1_000_000, {
      payments: [{ id: 'p0', amount: 1_000_000, paidAt: '2026-07-01', note: '' }]
    }),
    item('charge:u2:1405-07', 9_999_999)
  ]

  const data = buildStatement({
    unitId: 'u1',
    receivables,
    credits: [
      { unitId: 'u1', amount: 20_000 },
      { unitId: 'u2', amount: 5 }
    ],
    ownerId: 'owner-1',
    todayIso: '2026-10-20'
  })

  it('lists what is open, a previous debt first, with the share addressed to the owner', () => {
    expect(data.items.map(row => [row.label, row.open, row.ownerNamed])).toEqual([
      ['بدهی قبلی', 500_000, false],
      ['شهریور', 600_000, false],
      ['مهر', 1_000_000, false],
      ['سهم عمرانی', 300_000, true]
    ])
    expect(data.totalOpen).toBe(2_400_000)
    expect(data.credit).toBe(20_000)
  })

  it('shows only the payments of the last three months', () => {
    expect(data.paid.map(row => [row.label, row.amount])).toEqual([['شهریور', 400_000]])
  })

  it('labels receivables without their unit suffix', () => {
    expect(itemLabel(item('charge:u1:1405-07', 1))).toBe('مهر')
    expect(itemLabel(item('opening:u1', 1))).toBe('بدهی قبلی')
    expect(itemLabel(item('share:u1:r', 1, { subCategory: 'عمرانی' }))).toBe('سهم عمرانی')
  })

  it('writes the statement text with total, credit and the fund card', () => {
    const text = statementText(header, data)

    expect(text).toContain('صورت‌حساب ساختمان نرگس')
    expect(text).toContain('واحد ۳ · احمدی')
    expect(text).toContain(`• شهریور: ${formatMoney(600_000)}`)
    expect(text).toContain('• سهم عمرانی (به نام مالک)')
    expect(text).toContain(`جمع بدهی: ${formatMoney(2_400_000)}`)
    expect(text).toContain(`اعتبار: ${formatMoney(20_000)}`)
    expect(text).toContain('کارت صندوق: ۶۰۳۷۹۹۷۱۱۲۳۴۵۶۷۸')
  })

  it('says so when nothing is owed, and reminds with amount and card', () => {
    const clear = buildStatement({
      unitId: 'u9',
      receivables,
      credits: [],
      ownerId: '',
      todayIso: '2026-10-20'
    })

    expect(statementText({ ...header, card: '' }, clear)).toContain('بدهی باز ندارید ✓')
    expect(statementText({ ...header, card: '' }, clear)).not.toContain('کارت')

    const reminder = reminderText(header, 1_500_000)

    expect(reminder).toContain('بدهی واحد ۳')
    expect(reminder).toContain(formatMoney(1_500_000))
    expect(reminder).toContain('شماره کارت')
  })
})
