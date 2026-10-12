import { describe, expect, it } from 'vitest'

import {
  smsSenderKey,
  suggestSmsCategory,
  type SmsSuggestContext,
  type SmsSuggestInput
} from './bankSmsSuggest'
import type { LedgerEntry } from './recordDuplicates'
import type { RecurringItem } from '../types'

const input: SmsSuggestInput = {
  type: 'expense',
  amount: 480_000,
  accountId: 'mellat',
  sender: '+98 700',
  templateId: 'tMellat'
}

function recurring(patch: Partial<RecurringItem> = {}): RecurringItem {
  return {
    id: 'r1',
    createdAt: '',
    type: 'expense',
    category: 'قبوض',
    subCategory: 'اینترنت',
    accountId: 'mellat',
    amount: 480_000,
    title: 'اینترنت خانه',
    dayOfMonth: 5,
    mode: 'reminder',
    lastPosted: '',
    active: true,
    ...patch
  } as RecurringItem
}

function record(patch: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    type: 'expense',
    amount: 480_000,
    date: '2026-09-01',
    accountId: 'mellat',
    category: 'خوراک',
    subCategory: '',
    title: 'سوپرمارکت',
    createdAtMs: null,
    ...patch
  }
}

const empty: SmsSuggestContext = { recurring: [], ledger: [], bySender: {}, byTemplate: {} }

describe('suggestSmsCategory', () => {
  it('prefers an active recurring item with the same amount and account', () => {
    const suggestion = suggestSmsCategory(input, {
      ...empty,
      recurring: [recurring()],
      ledger: [record()]
    })

    expect(suggestion).toMatchObject({
      category: 'قبوض',
      subCategory: 'اینترنت',
      source: 'recurring',
      title: 'اینترنت خانه'
    })
  })

  it('skips inactive, other-type and other-account recurring items', () => {
    const items = [
      recurring({ active: false }),
      recurring({ type: 'income' }),
      recurring({ accountId: 'melli' })
    ]

    expect(suggestSmsCategory(input, { ...empty, recurring: items })).toBeNull()
  })

  it('then uses the newest record with the same amount and account, counting its category', () => {
    const ledger = [
      record({ date: '2026-08-01', category: 'قبوض' }),
      record({ date: '2026-09-10', category: 'قبوض', subCategory: 'برق', title: 'برق' }),
      record({ date: '2026-07-01', category: 'قبوض' }),
      record({ date: '2026-06-01', category: 'خوراک' }),
      record({ amount: 1, category: 'سلامت', date: '2026-10-01' }),
      record({ accountId: 'melli', category: 'سلامت', date: '2026-10-01' }),
      record({ type: 'income', category: 'حقوق', date: '2026-10-01' })
    ]

    expect(suggestSmsCategory(input, { ...empty, ledger })).toMatchObject({
      category: 'قبوض',
      subCategory: 'برق',
      title: 'برق',
      source: 'amount',
      count: 3
    })
  })

  it('breaks same-day ties by «زمان ثبت»', () => {
    const ledger = [
      record({ category: 'خانه', createdAtMs: 2000 }),
      record({ category: 'خوراک', createdAtMs: 1000 })
    ]

    expect(suggestSmsCategory(input, { ...empty, ledger })?.category).toBe('خانه')
  })

  it('then the category last chosen for the same sender, then for the template', () => {
    const choice = { category: 'حمل‌ونقل', subCategory: '' }
    const bySender = { [smsSenderKey(input.sender, 'expense')]: choice }
    const byTemplate = { tMellat: { category: 'سایر', subCategory: '' } }

    expect(suggestSmsCategory(input, { ...empty, bySender, byTemplate })).toMatchObject({
      category: 'حمل‌ونقل',
      source: 'sender'
    })
    expect(suggestSmsCategory(input, { ...empty, byTemplate })?.category).toBe('سایر')
    expect(suggestSmsCategory({ ...input, type: 'income' }, { ...empty, bySender })).toBeNull()
  })

  it('suggests nothing without any history', () => {
    expect(suggestSmsCategory(input, empty)).toBeNull()
  })
})

describe('smsSenderKey', () => {
  it('ignores spacing and case and keeps types apart', () => {
    expect(smsSenderKey(' +98 700 ', 'expense')).toBe('expense:+98700')
    expect(smsSenderKey('BankMellat', 'income')).toBe('income:bankmellat')
    expect(smsSenderKey('', 'expense')).toBe('')
  })
})
