import { describe, expect, it } from 'vitest'

import { withoutNonFlow } from './buildingDashboard'
import type { MonthlyReportData } from './monthlyReport'
import { monthlyReportFacts } from './monthlyReportPdf'
import { reportWords } from './reportWording'

const report: MonthlyReportData = {
  monthKey: '1405-06',
  income: 1,
  expense: 1,
  net: 0,
  budgets: [],
  installments: { paid: 1, due: 2 },
  checksCleared: 3,
  netWorth: 5_000_000,
  netWorthChange: 100_000,
  recurringPosted: 4,
  highlights: { counterparties: [], item: '' }
}

describe('reportWords', () => {
  it('words a building by collected money and the fund, a person by income and savings', () => {
    expect(reportWords(false)).toMatchObject({ income: 'درآمد', net: 'خالص', savings: 'پس‌انداز' })
    expect(reportWords(true)).toMatchObject({ income: 'وصول', net: 'وصول − هزینه' })
  })
})

describe('monthlyReportFacts', () => {
  it('keeps installments and net worth for a person', () => {
    const facts = monthlyReportFacts(report, false)

    expect(facts).toHaveLength(4)
    expect(facts.some(fact => fact.startsWith('اقساط'))).toBe(true)
    expect(facts.some(fact => fact.startsWith('دارایی خالص'))).toBe(true)
  })

  it('drops them in a building, where unit credit would count as a receivable', () => {
    const facts = monthlyReportFacts(report, true)

    expect(facts.map(fact => fact.split(' ')[0])).toEqual(['چک', 'تکرارهای'])
  })
})

describe('withoutNonFlow', () => {
  const row = (category: string) => ({
    id: category,
    createdAt: '',
    values: { amount: '1', category }
  })

  it('drops transfers and fund corrections from both sides', () => {
    const records = withoutNonFlow({
      incomeRecords: [row('شارژ ساختمان'), row('اصلاح موجودی'), row('تطبیق')],
      expenseRecords: [row('آسانسور'), row('انتقال'), row('اصلاح موجودی')],
      incomeDateField: 'date',
      expenseDateField: 'date'
    })

    expect(records.incomeRecords.map(item => item.values.category)).toEqual(['شارژ ساختمان'])
    expect(records.expenseRecords.map(item => item.values.category)).toEqual(['آسانسور'])
  })
})
