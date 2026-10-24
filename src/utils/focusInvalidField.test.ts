import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { focusFirstInvalidField } from './focusInvalidField'

describe('focusFirstInvalidField', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = `
      <form id="f">
        <input id="ok" />
        <input id="first" aria-invalid="true" />
        <input id="second" aria-invalid="true" />
        <input id="off" aria-invalid="true" disabled />
      </form>`
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('focuses and scrolls to the first invalid field once the errors are painted', () => {
    focusFirstInvalidField(document.getElementById('f'))
    expect(document.activeElement).toBe(document.body)

    vi.runAllTimers()

    expect(document.activeElement?.id).toBe('first')
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledOnce()
  })

  it('does nothing when no field is invalid', () => {
    document.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'))
    focusFirstInvalidField(document.getElementById('f'))
    vi.runAllTimers()

    expect(document.activeElement).toBe(document.body)
  })

  it('accepts a missing root', () => {
    expect(() => focusFirstInvalidField(null)).not.toThrow()
  })
})
