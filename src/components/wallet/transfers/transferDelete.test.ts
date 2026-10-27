import { describe, expect, it } from 'vitest'

import { transferDeleteQuestion } from './transferDelete'
import type { Transfer } from '../../../services/transfers'
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

    expect(label).toMatch(/^«انتقال .+ از ملی به نقد»$/)
    expect(message).toContain('به «ملی» برمی‌گردد')
    expect(message).toContain('از «نقد» کم می‌شود')
  })

  it('says only the record goes when an account was deleted', () => {
    const { label, message } = transferDeleteQuestion(transfer, [account('a', 'ملی')])

    expect(label).toContain('حساب حذف‌شده')
    expect(message).toContain('فقط خود ردیف انتقال پاک می‌شود')
    expect(message).toContain('موجودی هیچ حسابی تغییر نمی‌کند')
  })
})
