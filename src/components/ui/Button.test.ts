import { describe, expect, it } from 'vitest'

import { buttonClassName } from './Button'

describe('buttonClassName', () => {
  it('gives the small button a 44 px tap box without growing it', () => {
    const small = buttonClassName({ size: 'sm' })

    expect(small).toContain('after:min-h-touch-min')
    expect(small).toContain('after:min-w-touch-min')
    // The tap box reaches past the border, so the button must not clip it.
    expect(small).toContain('overflow-visible')
    expect(small).not.toContain('overflow-hidden')
    expect(small).toContain('py-1.5')
  })

  it('keeps the normal button clipped and without a tap extension', () => {
    const normal = buttonClassName({ size: 'md' })

    expect(normal).toContain('overflow-hidden')
    expect(normal).not.toContain('after:')
  })

  it('clips the primary shine to the rounded corners itself', () => {
    expect(buttonClassName({ variant: 'primary', size: 'sm' })).toContain(
      'before:rounded-[inherit]'
    )
  })
})
