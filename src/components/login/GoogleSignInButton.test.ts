import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import GoogleSignInButton from './GoogleSignInButton'

const render = (props: { ready: boolean; loading: boolean }) =>
  renderToStaticMarkup(createElement(GoogleSignInButton, { onClick: () => undefined, ...props }))

describe('GoogleSignInButton', () => {
  it('shows a disabled button with a spinner and the label while the script loads', () => {
    const html = render({ ready: false, loading: false })

    expect(html).toContain('ورود با Google')
    expect(html).toContain('disabled=""')
    expect(html).toContain('animate-spin')
    expect(html).toContain('aria-busy="true"')
    // The Google logo only replaces the spinner once sign-in can start.
    expect(html).not.toContain('<svg width="20"')
  })

  it('is an enabled button with the Google logo once the script is ready', () => {
    const html = render({ ready: true, loading: false })

    expect(html).toContain('ورود با Google')
    expect(html).not.toContain('disabled=""')
    expect(html).not.toContain('animate-spin')
    expect(html).toContain('<svg width="20"')
  })

  it('keeps the label in the markup while a sign-in is under way', () => {
    const html = render({ ready: true, loading: true })

    expect(html).toContain('ورود با Google')
    expect(html).toContain('aria-label="در حال بارگذاری"')
    expect(html).toContain('disabled=""')
  })
})
