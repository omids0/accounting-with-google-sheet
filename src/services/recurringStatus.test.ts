import { describe, expect, it } from 'vitest'

import type { LedgerEntry } from './recordDuplicates'
import { needsAttention, recurringStatuses } from './recurringStatus'
import type { RecurringItem } from '../types'

const TODAY = '2026-10-24' // 2 آبان 1405

const item = (patch: Partial<RecurringItem> = {}): RecurringItem => ({
  id: 'i1',
  createdAt: 't',
  type: 'expense',
  category: 'مسکن',
  subCategory: '',
  accountId: 'acc',
  amount: 18_000_000,
  title: 'اجارهٔ خانه',
  dayOfMonth: 1,
  mode: 'reminder',
  lastPosted: '',
  active: true,
  ...patch
})

const record = (patch: Partial<LedgerEntry> = {}): LedgerEntry => ({
  type: 'expense',
  amount: 18_000_000,
  date: '2026-10-23',
  accountId: 'acc',
  id: 'x1',
  category: 'مسکن',
  title: 'اجارهٔ خانه',
  ...patch
})

describe('recurringStatuses', () => {
  it('is new when nothing like it is recorded', () => {
    const status = recurringStatuses([item()], [], TODAY).get('i1')

    expect(status).toEqual({ kind: 'new' })
    expect(needsAttention(status)).toBe(false)
  })

  it('is registered when the same payment is already a record (any source)', () => {
    const status = recurringStatuses([item()], [record({ note: 'ثبت از پیامک' })], TODAY).get('i1')

    expect(status?.kind).toBe('registered')
    expect(status && 'record' in status && status.record.id).toBe('x1')
    expect(needsAttention(status)).toBe(true)
  })

  it('is probable when a similar record has another category or an unnamed account', () => {
    const similar = record({ category: 'قبوض', accountId: '' })

    expect(recurringStatuses([item()], [similar], TODAY).get('i1')?.kind).toBe('probable')
  })

  it('is new when the amount differs by one toman or the record is far away', () => {
    expect(
      recurringStatuses([item()], [record({ amount: 18_000_001 })], TODAY).get('i1')?.kind
    ).toBe('new')
    expect(
      recurringStatuses([item()], [record({ date: '2026-09-10' })], TODAY).get('i1')?.kind
    ).toBe('new')
  })

  it('lets one record answer one item only', () => {
    const statuses = recurringStatuses([item(), item({ id: 'i2' })], [record()], TODAY)

    expect(statuses.get('i1')?.kind).toBe('registered')
    expect(statuses.get('i2')?.kind).toBe('new')
  })

  it('does not match a record of the other direction', () => {
    expect(recurringStatuses([item()], [record({ type: 'income' })], TODAY).get('i1')?.kind).toBe(
      'new'
    )
  })
})
