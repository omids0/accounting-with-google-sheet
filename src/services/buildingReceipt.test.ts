import { describe, expect, it } from 'vitest'

import type { PaymentResult } from './buildingPayment'
import { receiptImage, receiptSummary, receiptText } from './buildingReceipt'
import { formatMoney } from '../utils/formatMoney'

const result: PaymentResult = {
  unitId: 'u3',
  unitNumber: '3',
  debtor: 'احمدی',
  date: '2026-10-20',
  amount: 2_500_000,
  applied: 2_000_000,
  credit: 500_000,
  months: ['مرداد', 'شهریور'],
  remaining: 0,
  accountTitle: 'ملت'
}

describe('receipt', () => {
  it('writes the shareable text with months, credit, account and what is left', () => {
    const text = receiptText('نرگس', result)

    expect(text).toContain('رسید پرداخت')
    expect(text).toContain('ساختمان نرگس — واحد ۳ · احمدی')
    expect(text).toContain(`${formatMoney(2_500_000)} بابت مرداد، شهریور`)
    expect(text).toContain(`(اعتبار ثبت‌شده: ${formatMoney(500_000)})`)
    expect(text).toContain('واریز به ملت')
    expect(text).toContain(`ماندهٔ بدهی: ${formatMoney(0)}`)
  })

  it('a pure credit payment says it is for the unit credit and omits empty lines', () => {
    const credit = { ...result, months: [], applied: 0, credit: 2_500_000, accountTitle: '' }

    expect(receiptSummary(credit)).toContain('اعتبار شارژ')
    expect(receiptText('نرگس', credit)).not.toContain('واریز به')
  })

  it('builds the picture card from the same facts', () => {
    const image = receiptImage('نرگس', result)

    expect(image.title).toBe('واحد ۳ · احمدی')
    expect(image.stats.map(stat => stat.label)).toEqual([
      'پرداخت‌شده',
      'ماندهٔ بدهی',
      'اعتبار واحد'
    ])
    expect(image.footer).toContain('ساختمان نرگس')
    expect(image.footer).toContain('بابت مرداد، شهریور')
  })
})
