import { describe, expect, it } from 'vitest'

import { BUILDING_FIELD_IDS, withBuildingFields, withoutBuildingFields } from './buildingFields'
import { isStandardEntryForm, sortFormFields, withStandardFields } from './fieldUtils'
import { buildHeaders } from '../../services/sheetsHeaders'
import type { CustomForm } from '../../types'

const form = (type: 'income' | 'expense'): CustomForm => ({
  id: `form_${type}`,
  name: type,
  sheetName: type,
  type,
  fields: [
    { id: 'date', label: 'تاریخ', type: 'date', required: true },
    { id: 'title', label: 'عنوان', type: 'text', required: false },
    { id: 'category', label: 'دسته‌بندی', type: 'select', required: true, options: [] },
    { id: 'amount', label: 'مبلغ', type: 'number', required: true },
    { id: 'note', label: 'توضیحات', type: 'text', required: false }
  ]
})

const ids = (target: CustomForm) => target.fields.map(field => field.id)

const hasBuildingField = (target: CustomForm) =>
  BUILDING_FIELD_IDS.some(id => ids(target).includes(id))

describe('building record fields', () => {
  it('are added to expense forms only', () => {
    const [income, expense] = withBuildingFields([form('income'), form('expense')])

    expect(hasBuildingField(income)).toBe(false)
    expect(ids(expense)).toEqual(expect.arrayContaining(BUILDING_FIELD_IDS))
  })

  it('are added once', () => {
    const twice = withBuildingFields(withBuildingFields([form('expense')]))

    expect(ids(twice[0]).filter(id => id === 'payer')).toHaveLength(1)
  })

  it('come out again for a personal workspace', () => {
    const stripped = withoutBuildingFields(withBuildingFields([form('expense')]))

    expect(hasBuildingField(stripped[0])).toBe(false)
  })

  it('only a building workspace gets them from the standard fields', () => {
    const [personal] = withStandardFields([form('expense')])
    const [building] = withStandardFields([form('expense')], true)
    const [personalAgain] = withStandardFields([building])

    expect(hasBuildingField(personal)).toBe(false)
    expect(ids(building)).toEqual(expect.arrayContaining(BUILDING_FIELD_IDS))
    expect(hasBuildingField(personalAgain)).toBe(false)
  })

  it('keep the standard entry layout and sit at the end of the row', () => {
    const [building] = withStandardFields([form('expense')], true)

    expect(isStandardEntryForm(building)).toBe(true)
    expect(
      sortFormFields(building.fields)
        .map(field => field.id)
        .slice(-3)
    ).toEqual(BUILDING_FIELD_IDS)
    expect(buildHeaders(building.fields).slice(-3)).toEqual(['نوع هزینه', 'تقسیم', 'پرداخت‌کننده'])
  })
})
