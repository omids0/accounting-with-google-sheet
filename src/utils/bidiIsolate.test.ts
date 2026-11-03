import { describe, expect, it } from 'vitest'

import { isolateLatin } from './bidiIsolate'

describe('isolateLatin', () => {
  it('wraps a name with Latin letters in a first-strong isolate', () => {
    expect(isolateLatin('John')).toBe('\u2068John\u2069')
    expect(isolateLatin('سارا Smith')).toBe('\u2068سارا Smith\u2069')
  })

  it('leaves Persian text alone', () => {
    expect(isolateLatin('مینا')).toBe('مینا')
    expect(isolateLatin('')).toBe('')
  })
})
