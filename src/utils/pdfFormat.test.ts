import { describe, expect, it } from 'vitest'

import type { InstallmentPayment } from '../types'
import { formatInstallmentPayments } from './pdfFormat'

const payment = (n: number, dueDate: string, paid = false): InstallmentPayment => ({
  n,
  paid,
  paidAt: paid ? '2026-01-01' : '',
  dueDate
})

describe('formatInstallmentPayments', () => {
  const today = '2026-10-24'

  it('marks only past-due unpaid installments as overdue', () => {
    const lines = formatInstallmentPayments(
      [payment(1, '2026-09-01'), payment(2, '2026-10-24'), payment(3, '2027-01-01')],
      1000,
      today
    ).split('\n')

    expect(lines[0]).toContain('معوق')
    expect(lines[1]).not.toContain('معوق')
    expect(lines[1]).toContain('پرداخت نشده')
    expect(lines[2]).not.toContain('معوق')
    expect(lines[2]).toContain('پرداخت نشده')
  })

  it('shows paid installments as paid even when their due date is past', () => {
    const [line] = formatInstallmentPayments([payment(1, '2026-01-01', true)], 1000, today).split(
      '\n'
    )

    expect(line).toContain('پرداخت شده')
    expect(line).not.toContain('معوق')
  })
})
