import { describe, expect, it } from 'vitest'

import { shouldPrefetch } from './prefetchPolicy'

describe('shouldPrefetch', () => {
  it('prefetches when the browser exposes no connection info', () => {
    expect(shouldPrefetch(undefined)).toBe(true)
  })

  it('prefetches on fast connections', () => {
    expect(shouldPrefetch({ effectiveType: '4g' })).toBe(true)
    expect(shouldPrefetch({ effectiveType: '3g', saveData: false })).toBe(true)
  })

  it('never prefetches with Data Saver on', () => {
    expect(shouldPrefetch({ saveData: true })).toBe(false)
    expect(shouldPrefetch({ saveData: true, effectiveType: '4g' })).toBe(false)
  })

  it('never prefetches on 2g or slow-2g', () => {
    expect(shouldPrefetch({ effectiveType: '2g' })).toBe(false)
    expect(shouldPrefetch({ effectiveType: 'slow-2g' })).toBe(false)
  })
})
