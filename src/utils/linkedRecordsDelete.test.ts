import { describe, expect, it } from 'vitest'

import {
  checkLinkedCount,
  dangLinkedCount,
  installmentPlanLinkedCount,
  linkedDeleteQuestion,
  linkedRecordsCheckboxLabel,
  linkedRecordsStayLine,
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

  it('adds an unchecked box and one short line on why the records stay by default', () => {
    const question = linkedDeleteQuestion('طلب «وام»', 'طلب «وام» پاک می‌شود.', 3, 'income')

    expect(question.checkbox).toEqual({
      label: 'رکوردهای مالی مرتبط (۳ مورد) هم حذف شوند',
      defaultChecked: false
    })
    expect(question.message.startsWith('طلب «وام» پاک می‌شود.\n')).toBe(true)
    expect(question.message.split('\n')).toHaveLength(2)
    expect(question.message).toContain('می‌مانند')
  })

  it('names only what the item can really make', () => {
    const stay = (kind: Parameters<typeof linkedRecordsStayLine>[1]) =>
      linkedRecordsStayLine(2, kind)

    expect(stay('expense')).toContain('هزینه')
    expect(stay('expense')).not.toContain('درآمد')
    expect(stay('income')).toContain('درآمد')
    expect(stay('income')).not.toContain('هزینه')
    expect(stay('either')).toContain('رکوردهای مالی')
    expect(linkedRecordsStayLine(1, 'expense')).toContain('می‌ماند')
  })

  it('never mentions income or expense when the kind is not given', () => {
    const { message } = linkedDeleteQuestion('چک ۱۲', 'چک ۱۲ پاک می‌شود.', 1)

    expect(message).not.toContain('درآمد')
    expect(message).not.toContain('هزینه')
  })
})
