import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GoogleSignInButton from './GoogleSignInButton'

const render = (props: { ready: boolean; loading: boolean; stalled?: boolean }) =>
  renderToStaticMarkup(createElement(GoogleSignInButton, { onClick: () => undefined, ...props }))

describe('GoogleSignInButton', () => {
  afterEach(() => vi.restoreAllMocks())

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

  it('turns clickable again, with a retry hint, when the script stays away', () => {
    const html = render({ ready: false, loading: false, stalled: true })

    expect(html).toContain('ورود با Google')
    expect(html).not.toContain('disabled=""')
    expect(html).not.toContain('animate-spin')
    expect(html).toContain('<svg width="20"')
    expect(html).toContain('role="status"')
    expect(html).toContain('بارگذاری Google ناموفق بود؛ دوباره تلاش')
  })

  it('says the internet is down when the browser is offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    const html = render({ ready: false, loading: false, stalled: true })

    expect(html).toContain('اینترنت قطع است؛ بعد از وصل شدن دوباره تلاش کنید')
    expect(html).not.toContain('بارگذاری Google ناموفق بود')
  })

  it('shows no hint once the script is ready, even if it was slow', () => {
    expect(render({ ready: true, loading: false, stalled: true })).not.toContain('role="status"')
  })

  it('keeps the label in the markup while a sign-in is under way', () => {
    const html = render({ ready: true, loading: true })

    expect(html).toContain('ورود با Google')
    expect(html).toContain('aria-label="در حال بارگذاری"')
    expect(html).toContain('disabled=""')
  })
})
