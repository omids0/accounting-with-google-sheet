import { describe, expect, it, vi } from 'vitest'

import { buildMapDirectionsHref } from './mapNavigation'

const location = { lat: 35.73383, lng: 51.31774 }

describe('buildMapDirectionsHref', () => {
  it('uses geo URI on Android for native map app chooser', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 14)' })

    expect(buildMapDirectionsHref(location)).toBe('geo:35.73383,51.31774?q=35.73383%2C51.31774')
  })

  it('uses Apple Maps URI on iOS', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
    })

    expect(buildMapDirectionsHref(location)).toBe('maps://?daddr=35.73383%2C51.31774&dirflg=d')
  })

  it('uses Google Maps web URL on desktop', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' })

    expect(buildMapDirectionsHref(location)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=35.73383%2C51.31774'
    )
  })
})
