import { describe, expect, it } from 'vitest'

import {
  COUNTERPARTY_FIELD_ID,
  isStandardEntryForm,
  LINE_ITEMS_FIELD_ID,
  sortFormFields,
  SUBCATEGORY_FIELD_ID,
  withAutoTitle,
  withCounterpartyField,
  withLineItemsField,
  withSubCategoryField
} from './fieldUtils'
import { getDefaultForms } from '../../services/settings'
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

describe('counterparty and line-item fields', () => {
  it('adds each optional field once to income and expense forms only', () => {
    const other: CustomForm = { ...expenseForm([]), id: 'o', type: 'custom' }

    const forms = withLineItemsField(
      withCounterpartyField(withLineItemsField(withCounterpartyField([expenseForm([]), other])))
    )

    expect(forms[0].fields).toEqual([
      expect.objectContaining({ id: COUNTERPARTY_FIELD_ID, type: 'select', required: false }),
      expect.objectContaining({ id: LINE_ITEMS_FIELD_ID, type: 'text', required: false })
    ])
    expect(forms[1].fields).toEqual([])
  })

  it('relaxes the fields when a stored form marks them required', () => {
    const [form] = withSubCategoryField([
      expenseForm([
        { id: COUNTERPARTY_FIELD_ID, label: 'طرف حساب', type: 'select', required: true },
        { id: LINE_ITEMS_FIELD_ID, label: 'اقلام', type: 'text', required: true }
      ])
    ])

    expect(form.fields.filter(field => field.required)).toEqual([])
  })

  it('sorts them after the wallet fields and before the note', () => {
    const [form] = getDefaultForms()

    const ids = sortFormFields(form.fields).map(field => field.id)

    expect(ids.slice(-3)).toEqual([COUNTERPARTY_FIELD_ID, LINE_ITEMS_FIELD_ID, 'note'])
    expect(ids.indexOf('walletApply')).toBeLessThan(ids.indexOf(COUNTERPARTY_FIELD_ID))
  })

  it('keeps the default forms standard', () => {
    getDefaultForms().forEach(form => expect(isStandardEntryForm(form)).toBe(true))
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
