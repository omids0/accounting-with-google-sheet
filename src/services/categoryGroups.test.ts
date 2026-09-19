import { describe, expect, it } from 'vitest'

import { groupsToRows, rowsToGroups, rowsToSubcategories } from './categoryGroups'

function emptyGroups() {
  return {
    income: [],
    expense: [],
    dang: [],
    receivable: [],
    personalReminder: [],
    vehiclePeriodic: [],
    vehicleDeadline: [],
    vehicleMechanic: [],
    vehicleExpense: []
  }
}

describe('category subcategory rows', () => {
  it('reads legacy two-column rows as plain categories', () => {
    const rows = [
      ['هزینه', 'خوراک'],
      ['درآمد', 'حقوق']
    ]

    expect(rowsToGroups(rows).expense).toEqual(['خوراک'])
    expect(rowsToGroups(rows).income).toEqual(['حقوق'])
    expect(rowsToSubcategories(rows)).toEqual({})
  })

  it('does not turn a subcategory row into a category', () => {
    const rows = [
      ['هزینه', 'دارو و درمان', ''],
      ['هزینه', 'دارو و درمان', 'قرص'],
      ['هزینه', 'حذف‌شده', 'یتیم']
    ]

    expect(rowsToGroups(rows).expense).toEqual(['دارو و درمان'])
    expect(rowsToSubcategories(rows).expense).toEqual({
      'دارو و درمان': ['قرص'],
      'حذف‌شده': ['یتیم']
    })
  })

  it('round-trips categories with their subcategories', () => {
    const groups = { ...emptyGroups(), expense: ['دارو و درمان', 'خوراک'] }
    const subcategories = { expense: { 'دارو و درمان': ['قرص', 'دکتر پوست'] } }

    const rows = groupsToRows(groups, subcategories)

    expect(rowsToGroups(rows).expense).toEqual(['دارو و درمان', 'خوراک'])
    expect(rowsToSubcategories(rows)).toEqual(subcategories)
  })

  it('keeps subcategories of a category that is missing from the group list', () => {
    const groups = emptyGroups()
    const subcategories = { expense: { 'دارو و درمان': ['قرص'] } }

    expect(rowsToSubcategories(groupsToRows(groups, subcategories))).toEqual(subcategories)
  })
})
