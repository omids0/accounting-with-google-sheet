import { describe, expect, it } from 'vitest'

import {
  checkLinkedCount,
  dangLinkedCount,
  installmentPlanLinkedCount,
  linkedRecordsMessage,
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

  it('a debt or a check has at most one', () => {
    expect(dangLinkedCount({ transactionRecordId: 'r' })).toBe(1)
    expect(dangLinkedCount({ transactionRecordId: '' })).toBe(0)
    expect(checkLinkedCount({})).toBe(0)
    expect(checkLinkedCount({ transactionRecordId: 'r' })).toBe(1)
  })

  it('asks only when there is something to keep or delete', () => {
    expect(shouldAskLinkedRecords(0)).toBe(false)
    expect(shouldAskLinkedRecords(2)).toBe(true)
  })

  it('names the item, says how many records, and what deleting them does', () => {
    const message = linkedRecordsMessage(3, 'طلب «وام»')

    expect(message).toContain('طلب «وام»')
    expect(message).toContain('۳ رکورد مالی')
    expect(message).toContain('کیف پول و رکوردها دیگر با هم نمی‌خوانند')
    expect(message).toContain('✕')
  })
})
