import { describe, expect, it } from 'vitest'

import { transferDeleteQuestion } from './transferDelete'
import type { Transfer, TransferLegInfo } from '../../../services/transfers'
import type { WalletAccount } from '../../../types'

const transfer: Transfer = {
  id: 't1',
  createdAt: '',
  date: '2026-10-27',
  fromAccountId: 'a',
  toAccountId: 'b',
  amount: 500,
  note: '',
  createdBy: ''
}

const account = (id: string, title: string) => ({ id, title } as WalletAccount)

describe('transferDeleteQuestion', () => {
  it('names the transfer and says both balances go back', () => {
    const { label, message } = transferDeleteQuestion(transfer, [
      account('a', 'ملی'),
      account('b', 'نقد')
    ])

    expect(label).toMatch(/^«انتقال ملی به نقد»$/)
    expect(label).not.toMatch(/[0-9۰-۹]/)
    expect(message).toContain('به «ملی» برمی‌گردد')
    expect(message).toContain('از «نقد» کم می‌شود')
  })

  it('says only the record goes when an account was deleted', () => {
    const { label, message } = transferDeleteQuestion(transfer, [account('a', 'ملی')])

    expect(label).toContain('حساب حذف‌شده')
    expect(message).toContain('فقط خود ردیف انتقال پاک می‌شود')
    expect(message).toContain('موجودی هیچ حسابی تغییر نمی‌کند')
  })

  const accounts = [account('a', 'ملی'), account('b', 'نقد')]
  const legs = (...movedAccountIds: string[]): TransferLegInfo => ({
    state: movedAccountIds.length as TransferLegInfo['state'],
    movedAccountIds
  })

  it('says a phantom transfer never changed a balance', () => {
    const { message } = transferDeleteQuestion(transfer, accounts, legs())

    expect(message).toBe('این انتقال هرگز موجودی را تغییر نداده؛ فقط ردیف آن حذف می‌شود.')
  })

  it('says only the account that moved is restored for a half-done transfer', () => {
    const source = transferDeleteQuestion(transfer, accounts, legs('a')).message
    const destination = transferDeleteQuestion(transfer, accounts, legs('b')).message

    expect(source).toContain('فقط یک سمت این انتقال موجودی را تغییر داده بود')
    expect(source).toContain('به «ملی» برمی‌گردد')
    expect(source).toContain('موجودی «نقد» تغییری نمی‌کند')
    expect(destination).toContain('از «نقد» کم می‌شود')
    expect(destination).toContain('موجودی «ملی» تغییری نمی‌کند')
  })

  it('keeps the two-sided wording for a complete transfer', () => {
    const { message } = transferDeleteQuestion(transfer, accounts, legs('a', 'b'))

    expect(message).toContain('به «ملی» برمی‌گردد و از «نقد» کم می‌شود')
  })

  it('says only the row goes when the account that moved was deleted', () => {
    const { message } = transferDeleteQuestion(transfer, [account('a', 'ملی')], legs('a', 'b'))

    expect(message).toContain('فقط خود ردیف انتقال پاک می‌شود')
  })
})
