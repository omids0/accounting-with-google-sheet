import { describe, expect, it } from 'vitest'

import {
  checkLinkedCount,
  dangLinkedCount,
  installmentPlanLinkedCount,
  linkedDeleteQuestion,
  linkedRecordsCheckboxLabel,
  receivableLinkedCount,
  shouldAskLinkedRecords
} from './linkedRecordsDelete'

const payment = (transactionRecordId?: string) => ({ transactionRecordId } as never)

describe('linked records of an item about to be deleted', () => {
  it('counts only the payments that made a record', () => {
    expect(receivableLinkedCount({ payments: [payment('a'), payment(), payment('b')] })).toBe(2)
    expect(installmentPlanLinkedCount({ payments: [payment(), payment('x')] })).toBe(1)
    expect(receivableLinkedCount({ payments: [] })).toBe(0)
  })

  it('counts the payments of a debt that made a record; a check has at most one', () => {
    expect(dangLinkedCount({ payments: [payment('a'), payment(), payment('b')] })).toBe(2)
    expect(dangLinkedCount({ payments: [] })).toBe(0)
    expect(checkLinkedCount({})).toBe(0)
    expect(checkLinkedCount({ transactionRecordId: 'r' })).toBe(1)
  })

  it('offers the checkbox only when there is something to keep or delete', () => {
    expect(shouldAskLinkedRecords(0)).toBe(false)
    expect(shouldAskLinkedRecords(2)).toBe(true)
  })

  it('labels the checkbox with the number of records in Persian digits', () => {
    expect(linkedRecordsCheckboxLabel(3)).toBe('رکوردهای مالی مرتبط (۳ مورد) هم حذف شوند')
  })

  it('has no checkbox for an item without records', () => {
    const question = linkedDeleteQuestion('چک ۱۲', 'چک ۱۲ پاک می‌شود.', 0)

    expect(question).toEqual({ label: 'چک ۱۲', message: 'چک ۱۲ پاک می‌شود.' })
  })

  it('adds an unchecked box and the reason the records stay by default', () => {
    const question = linkedDeleteQuestion('طلب «وام»', 'طلب «وام» پاک می‌شود.', 3)

    expect(question.checkbox).toEqual({
      label: 'رکوردهای مالی مرتبط (۳ مورد) هم حذف شوند',
      defaultChecked: false
    })
    expect(question.message).toContain('طلب «وام» پاک می‌شود.')
    expect(question.message).toContain('می‌مانند')
    expect(question.message).toContain('حساب ماه‌های قبل عوض می‌شود')
  })
})
