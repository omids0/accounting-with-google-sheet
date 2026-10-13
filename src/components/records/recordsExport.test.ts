import { describe, expect, it } from 'vitest'

import { recordsExportRows } from './recordsExport'
import type { StoredRecord } from './recordsUtils'
import { getDefaultForms } from '../../services/settings'
import { formatPersianNumber } from '../../utils/formatMoney'
import { serializeLineItems } from '../../utils/lineItems'

const forms = getDefaultForms()

const expense = forms.find(form => form.type === 'expense')!

function record(values: Record<string, string>): StoredRecord {
  return {
    id: 'r1',
    createdAt: '',
    rowNumber: 2,
    values,
    formId: expense.id,
    formType: 'expense',
    formName: expense.name
  }
}

describe('recordsExportRows', () => {
  it('puts the counterparty and the items after the note', () => {
    const [row] = recordsExportRows(
      [
        record({
          title: 'میوه',
          note: 'تازه',
          counterparty: 'رضا',
          lineItems: serializeLineItems([{ name: 'کیوی', amount: 320000, note: '۲ کیلو' }])
        })
      ],
      forms
    )

    expect(row.slice(6)).toEqual(['تازه', 'رضا', `کیوی ۲ کیلو ${formatPersianNumber(320000)}`])
  })

  it('leaves both columns empty for a record without them', () => {
    const [row] = recordsExportRows([record({ title: 'نان' })], forms)

    expect(row.slice(7)).toEqual(['', ''])
  })
})
