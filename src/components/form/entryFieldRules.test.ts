import { describe, expect, it } from 'vitest'

import { SUBCATEGORY_FIELD_ID, withAutoTitle, withSubCategoryField } from './fieldUtils'
import type { CustomForm } from '../../types'

function expenseForm(fields: CustomForm['fields']): CustomForm {
  return { id: 'e', name: 'هزینه', sheetName: 'هزینه', type: 'expense', fields }
}

describe('withSubCategoryField', () => {
  it('relaxes a stored required title and subcategory', () => {
    const [form] = withSubCategoryField([
      expenseForm([
        { id: 'title', label: 'عنوان', type: 'text', required: true },
        { id: 'amount', label: 'مبلغ', type: 'number', required: true },
        { id: SUBCATEGORY_FIELD_ID, label: 'زیردسته', type: 'select', required: true, options: [] }
      ])
    ])

    const required = Object.fromEntries(form.fields.map(field => [field.id, field.required]))

    expect(required).toEqual({ title: false, amount: true, [SUBCATEGORY_FIELD_ID]: false })
  })

  it('adds an optional subcategory when missing', () => {
    const [form] = withSubCategoryField([expenseForm([])])

    expect(form.fields).toEqual([
      expect.objectContaining({ id: SUBCATEGORY_FIELD_ID, required: false })
    ])
  })
})

describe('withAutoTitle', () => {
  it('fills an empty title from category and subcategory', () => {
    expect(
      withAutoTitle({ title: ' ', category: 'خوراک', [SUBCATEGORY_FIELD_ID]: 'نان' }).title
    ).toBe('خوراک · نان')
    expect(withAutoTitle({ title: '', category: 'خوراک', [SUBCATEGORY_FIELD_ID]: '' }).title).toBe(
      'خوراک'
    )
  })

  it('keeps a typed title and leaves values without a category alone', () => {
    const typed = { title: 'نان سنگک', category: 'خوراک' }

    expect(withAutoTitle(typed)).toBe(typed)
    expect(withAutoTitle({ title: '', amount: 5 }).title).toBe('')
  })
})
