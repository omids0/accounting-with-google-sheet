import { describe, expect, it } from 'vitest'

import { fakeRecord } from './recordInputs.fake'
import { suggestItemNames } from './recordLineItems'

const TODAY = '2026-10-13'

function withItems(names: string[], overrides: Parameters<typeof fakeRecord>[0] = {}) {
  return fakeRecord({ items: names.map(name => ({ name, amount: 1000 })), ...overrides })
}

describe('suggestItemNames', () => {
  it('ranks names by how often they appear in the category', () => {
    const records = [
      withItems(['کیوی', 'موز']),
      withItems(['موز', 'خیار']),
      withItems(['موز']),
      withItems(['کیوی'])
    ]

    expect(suggestItemNames(records, 'خوراک', 6, TODAY)).toEqual(['موز', 'کیوی', 'خیار'])
  })

  it('merges spellings and shows the most frequent one', () => {
    const records = [
      withItems(['موز ']),
      withItems(['موز']),
      withItems(['موز']),
      withItems(['كيوي'])
    ]

    expect(suggestItemNames(records, 'خوراک', 6, TODAY)).toEqual(['موز', 'كيوي'])
  })

  it('skips other categories, records older than six months and records without items', () => {
    const records = [
      withItems(['بنزین'], { category: 'حمل‌ونقل' }),
      withItems(['قدیمی'], { date: '2026-03-01' }),
      fakeRecord(),
      withItems(['تازه'], { date: '2026-06-01' })
    ]

    expect(suggestItemNames(records, 'خوراک', 6, TODAY)).toEqual(['تازه'])
  })

  it('caps the list and needs a category', () => {
    const records = [withItems(['الف', 'ب', 'پ', 'ت', 'ث', 'ج', 'چ', 'ح'])]

    expect(suggestItemNames(records, 'خوراک', 6, TODAY)).toHaveLength(6)
    expect(suggestItemNames(records, '', 6, TODAY)).toEqual([])
  })
})
