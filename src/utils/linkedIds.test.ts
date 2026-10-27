import { describe, expect, it } from 'vitest'

import { linkedIdsOf } from './linkedIds'

describe('linkedIdsOf', () => {
  it('collects the ids of every item in order', () => {
    const items = [{ ids: ['a', 'b'] }, { ids: [] }, { ids: ['c'] }]

    expect(linkedIdsOf(items, item => item.ids)).toEqual(['a', 'b', 'c'])
  })

  it('drops empty and missing ids', () => {
    const items = [{ id: 'x' }, { id: '' }, { id: undefined }]

    expect(linkedIdsOf(items, item => [item.id])).toEqual(['x'])
  })

  it('returns an empty list for no items', () => {
    expect(linkedIdsOf([], () => ['a'])).toEqual([])
  })
})
