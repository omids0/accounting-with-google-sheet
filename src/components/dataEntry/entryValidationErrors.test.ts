import { describe, expect, it } from 'vitest'

import { entryValidationErrors } from './entryValidationErrors'
import type { CustomForm } from '../../types'

const form = {
  id: 'expense',
  name: 'هزینه',
  type: 'expense',
  sheetName: 'expense',
  fields: [
    { id: 'amount', label: 'مبلغ', type: 'number', required: true },
    { id: 'title', label: 'عنوان', type: 'text', required: true }
  ]
} as unknown as CustomForm

const context = { showVehicleFields: false, selectedCategory: '', hasSubcategories: false }

describe('entryValidationErrors', () => {
  it('flags an empty required field and a zero amount for a new entry', () => {
    const errors = entryValidationErrors(form, { amount: 0, title: '' }, context)

    expect(errors.map(error => error.id)).toEqual(['amount', 'title'])
    expect(errors[1].message).toBe('«عنوان» الزامی است')
  })

  it('lets a saved zero amount stay editable when the amount is not strict', () => {
    const errors = entryValidationErrors(
      form,
      { amount: 0, title: 'x' },
      { ...context, strictAmount: false }
    )

    expect(errors).toEqual([])
  })

  it('still flags an empty amount when the amount is not strict', () => {
    const errors = entryValidationErrors(
      form,
      { amount: '', title: 'x' },
      { ...context, strictAmount: false }
    )

    expect(errors.map(error => error.id)).toEqual(['amount'])
  })

  it('lets an old record keep a field that was empty before', () => {
    const wasEmpty = (id: string) => id === 'title'
    const errors = entryValidationErrors(
      form,
      { amount: 5, title: '' },
      { ...context, strictAmount: false, wasEmpty }
    )

    expect(errors).toEqual([])
  })

  it('still flags a field the user emptied', () => {
    const errors = entryValidationErrors(
      form,
      { amount: '', title: 'x' },
      { ...context, strictAmount: false, wasEmpty: id => id === 'title' }
    )

    expect(errors.map(error => error.id)).toEqual(['amount'])
  })
})
