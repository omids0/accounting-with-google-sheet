import { describe, expect, it } from 'vitest'

import { hasDuplicatePersonName } from './dangSplitPeople'

const people = [
  { id: 'p1', name: 'علی' },
  { id: 'p2', name: 'مریم رضایی' }
]

describe('hasDuplicatePersonName', () => {
  it('finds the same name, whatever the spacing, case or Arabic letter forms', () => {
    expect(hasDuplicatePersonName(people, 'علی')).toBe(true)
    expect(hasDuplicatePersonName(people, '  مریم   رضایی ')).toBe(true)
    expect(hasDuplicatePersonName([{ id: 'p3', name: 'کیان' }], 'كيان')).toBe(true)
  })

  it('lets a different name through', () => {
    expect(hasDuplicatePersonName(people, 'رضا')).toBe(false)
  })

  it('does not count the person being edited', () => {
    expect(hasDuplicatePersonName(people, 'علی', 'p1')).toBe(false)
    expect(hasDuplicatePersonName(people, 'علی', 'p2')).toBe(true)
  })
})
