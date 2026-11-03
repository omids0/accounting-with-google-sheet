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
    expect(question.message.split('\n')[1]).toBe(linkedRecordsStayLine(3, 'income'))
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

  it('says plainly what stays when the box is off, per kind and count', () => {
    expect(linkedRecordsStayLine(1, 'expense')).toBe(
      'اگر تیک نزنید، هزینهٔ پرداخت در رکوردها می‌ماند و در جمع «هزینه ماه» حساب می‌شود.'
    )
    expect(linkedRecordsStayLine(3, 'expense')).toBe(
      'اگر تیک نزنید، هزینه‌های پرداخت‌ها در رکوردها می‌مانند و در جمع «هزینه ماه» حساب می‌شوند.'
    )
    expect(linkedRecordsStayLine(1, 'income')).toBe(
      'اگر تیک نزنید، درآمد پرداخت در رکوردها می‌ماند و در جمع «درآمد ماه» حساب می‌شود.'
    )
    expect(linkedRecordsStayLine(2, 'income')).toBe(
      'اگر تیک نزنید، درآمدهای پرداخت‌ها در رکوردها می‌مانند و در جمع «درآمد ماه» حساب می‌شوند.'
    )
    expect(linkedRecordsStayLine(1, 'either')).toBe(
      'اگر تیک نزنید، رکورد مالی پرداخت در رکوردها می‌ماند و در جمع «درآمد و هزینه ماه» حساب می‌شود.'
    )
  })

  it('keeps the question to the message line plus one short line', () => {
    for (const kind of ['income', 'expense', 'either'] as const) {
      for (const count of [1, 4]) {
        const { message } = linkedDeleteQuestion('x', 'x پاک می‌شود.', count, kind)
        const lines = message.split('\n')

        expect(lines).toHaveLength(2)
        expect(lines[1].length).toBeLessThanOrEqual(110)
        expect(lines[1].startsWith('اگر')).toBe(true)
      }
    }
  })

  it('names both totals when the kind is not given, and no box means no line', () => {
    const { message } = linkedDeleteQuestion('چک ۱۲', 'چک ۱۲ پاک می‌شود.', 1)

    expect(message).toContain('«درآمد و هزینه ماه»')
    expect(linkedDeleteQuestion('چک ۱۲', 'چک ۱۲ پاک می‌شود.', 0).message).not.toContain('تیک')
  })
})
