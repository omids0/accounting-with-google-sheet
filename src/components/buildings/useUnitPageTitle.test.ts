import { describe, expect, it } from 'vitest'

import { unitPageTitle } from './useUnitPageTitle'

describe('unitPageTitle', () => {
  it('shows the stored ASCII unit number with Persian digits', () => {
    expect(unitPageTitle('1')).toBe('واحد ۱')
    expect(unitPageTitle('12')).toBe('واحد ۱۲')
  })
})
