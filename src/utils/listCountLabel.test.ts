import { describe, expect, it } from 'vitest'

import { listCountLabel } from './listCountLabel'

describe('listCountLabel', () => {
  it('says «shown از total» while rows are hidden', () => {
    expect(listCountLabel(50, 8457, 'ردیف')).toBe(
      `${(50).toLocaleString('fa-IR')} از ${(8457).toLocaleString('fa-IR')} ردیف`
    )
    expect(listCountLabel(50, 8457, 'ردیف')).toContain('۵۰ از ')
  })

  it('shows only the total once everything is visible', () => {
    expect(listCountLabel(50, 50, 'مورد')).toBe('۵۰ مورد')
    expect(listCountLabel(3, 3, 'مورد')).toBe('۳ مورد')
  })

  it('handles an empty list', () => {
    expect(listCountLabel(0, 0, 'مورد')).toBe('۰ مورد')
  })
})
