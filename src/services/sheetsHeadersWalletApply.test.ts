import { describe, expect, it } from 'vitest'

import { getDefaultForms } from './settings'
import { buildFieldColumnMap, buildRecordRow, mapRowToValues } from './sheetsHeaders'

describe('«اثر بر موجودی» before its header exists', () => {
  it('keeps «خیر» on a tab whose header predates the column', () => {
    const expense = getDefaultForms().find(form => form.type === 'expense')!
    const oldHeaders = [
      'شناسه',
      'زمان ثبت',
      ...expense.fields.filter(field => field.id !== 'walletApply').map(field => field.label)
    ]
    const row = buildRecordRow(oldHeaders, expense.fields, 'r1', 'now', {
      amount: '100',
      walletAccount: 'acc',
      walletApply: 'خیر'
    })
    const values = mapRowToValues(
      row,
      expense.fields,
      buildFieldColumnMap(oldHeaders, expense.fields)
    )

    expect(values.walletApply).toBe('خیر')
    expect(values.walletAccount).toBe('acc')
    // The migration appends the header at the end, i.e. the column the value went to.
    expect(row.indexOf('خیر')).toBe(oldHeaders.length)
  })
})
