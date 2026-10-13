import { describe, expect, it } from 'vitest'

import type { MonthlyReportData } from './monthlyReport'
import { monthHighlights } from './monthlyReportHighlights'
import { monthlyReportHighlightLine } from './monthlyReportPdf'
import { serializeLineItems } from '../utils/lineItems'

const expense = (values: Record<string, string>) => ({ values })

describe('monthHighlights', () => {
  it('names the three counterparties with the most spend, largest first', () => {
    const { counterparties } = monthHighlights([
      expense({ counterparty: 'الف', amount: '100' }),
      expense({ counterparty: 'ب', amount: '500' }),
      expense({ counterparty: 'الف', amount: '450' }),
      expense({ counterparty: 'ج', amount: '300' }),
      expense({ counterparty: 'د', amount: '50' }),
      expense({ amount: '9999' })
    ])

    expect(counterparties).toEqual(['الف', 'ب', 'ج'])
  })

  it('names the item on the most lines, across spellings', () => {
    const lines = (...names: string[]) =>
      serializeLineItems(names.map(name => ({ name, amount: 1 })))

    const { item } = monthHighlights([
      expense({ lineItems: lines('موز', 'کیوی') }),
      expense({ lineItems: lines('موز ') }),
      expense({ lineItems: lines('کیوی') }),
      expense({ lineItems: lines('موز') })
    ])

    expect(item).toBe('موز')
  })

  it('is empty for a month with neither', () => {
    expect(monthHighlights([expense({ amount: '5' })])).toEqual({ counterparties: [], item: '' })
    expect(monthHighlights([])).toEqual({ counterparties: [], item: '' })
  })
})

describe('monthlyReportHighlightLine', () => {
  const report = (counterparties: string[], item: string) =>
    ({ highlights: { counterparties, item } } as MonthlyReportData)

  it('joins both parts, or shows the one that exists', () => {
    expect(monthlyReportHighlightLine(report(['الف', 'ب'], 'موز'))).toBe(
      'بیشترین خرید از: الف، ب · پرتکرارترین قلم: موز'
    )
    expect(monthlyReportHighlightLine(report(['الف'], ''))).toBe('بیشترین خرید از: الف')
    expect(monthlyReportHighlightLine(report([], 'موز'))).toBe('پرتکرارترین قلم: موز')
  })

  it('is empty when the month has neither', () => {
    expect(monthlyReportHighlightLine(report([], ''))).toBe('')
  })
})
