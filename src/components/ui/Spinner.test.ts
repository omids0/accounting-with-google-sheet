import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { BUSY_HINT, BusyOverlayView } from './BusyOverlay'
import Button from './Button'
import Spinner from './Spinner'

describe('Spinner', () => {
  it('is a status with a visually hidden label and a ring that turns', () => {
    const html = renderToStaticMarkup(createElement(Spinner))

    expect(html).toContain('role="status"')
    expect(html).toContain('<span class="sr-only">در حال بارگذاری</span>')
    expect(html).toContain('animate-spin')
    expect(html).toContain('currentColor')
  })

  it('swaps the turning ring for still dots under reduced motion', () => {
    const html = renderToStaticMarkup(createElement(Spinner))

    expect(html).toContain('motion-reduce:hidden')
    expect(html).toContain('motion-reduce:inline-flex')
  })

  it('takes a custom label and the three sizes', () => {
    expect(renderToStaticMarkup(createElement(Spinner, { label: 'در حال ذخیره' }))).toContain(
      'در حال ذخیره'
    )
    expect(renderToStaticMarkup(createElement(Spinner, { size: 'sm' }))).toContain('h-4 w-4')
    expect(renderToStaticMarkup(createElement(Spinner, { size: 'lg' }))).toContain('h-10 w-10')
  })

  it('hides itself from readers when it sits next to text that says it all', () => {
    const html = renderToStaticMarkup(createElement(Spinner, { decorative: true }))

    expect(html).toContain('aria-hidden="true"')
    expect(html).not.toContain('role="status"')
    expect(html).not.toContain('sr-only')
  })
})

describe('Button loading', () => {
  it('shows dots by default and a spinner with `spinner`', () => {
    const dots = renderToStaticMarkup(createElement(Button, { loading: true }, 'ثبت'))

    const ring = renderToStaticMarkup(
      createElement(Button, { loading: true, spinner: true }, 'ثبت')
    )

    expect(dots).not.toContain('animate-spin')
    expect(ring).toContain('animate-spin')
    expect(ring).toContain('aria-busy="true"')
    expect(ring).toContain('disabled=""')
  })
})

describe('BusyOverlayView', () => {
  it('is a polite, busy live region that says what is happening', () => {
    const html = renderToStaticMarkup(
      createElement(BusyOverlayView, { message: 'در حال ورود به «ساختمان برج آبی»…' })
    )

    expect(html).toContain('role="status"')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('tabindex="-1"')
    expect(html).toContain('در حال ورود به «ساختمان برج آبی»…')
    expect(html).toContain(BUSY_HINT)
    expect(html).toContain('animate-spin')
  })

  it('covers the whole screen above the sheets and the drawer (z-100)', () => {
    const html = renderToStaticMarkup(createElement(BusyOverlayView, { message: 'x' }))

    expect(html).toContain('fixed inset-0')
    expect(html).toContain('z-[200]')
  })

  it('shows the bar only when it has progress', () => {
    const plain = renderToStaticMarkup(createElement(BusyOverlayView, { message: 'x' }))

    const bar = renderToStaticMarkup(
      createElement(BusyOverlayView, { message: 'در حال آماده‌سازی…', progress: 62 })
    )

    expect(plain).not.toContain('progress-bar')
    expect(bar).toContain('progress-bar')
  })

  it('holds the card back (taps are blocked from the first frame) until it is shown', () => {
    const early = renderToStaticMarkup(
      createElement(BusyOverlayView, { message: 'x', shown: false })
    )

    const late = renderToStaticMarkup(createElement(BusyOverlayView, { message: 'x' }))

    expect(early).toContain('opacity-0')
    expect(early).not.toContain('bg-[var(--color-overlay)]')
    expect(late).toContain('opacity-100')
    expect(late).toContain('bg-[var(--color-overlay)]')
  })
})
