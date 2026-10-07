import { describe, expect, it } from 'vitest'

import { resolveHideOnScroll } from './useHideOnScroll'

const opts = { edgeOffset: 72, threshold: 12 }
const page = (top: number) => ({ top, viewport: 667, height: 3000 })

describe('resolveHideOnScroll', () => {
  it('stays visible near the top', () => {
    expect(resolveHideOnScroll(page(40), 0, opts)).toEqual({ hidden: false, lastTop: 40 })
  })

  it('hides while scrolling down and shows again on scroll up', () => {
    expect(resolveHideOnScroll(page(400), 300, opts)).toEqual({ hidden: true, lastTop: 400 })
    expect(resolveHideOnScroll(page(350), 400, opts)).toEqual({ hidden: false, lastTop: 350 })
  })

  it('ignores movement below the threshold', () => {
    expect(resolveHideOnScroll(page(405), 400, opts)).toBeNull()
  })

  it('shows near the end of the page so the last card can be reached', () => {
    expect(resolveHideOnScroll(page(3000 - 667 - 20), 2000, opts)).toEqual({
      hidden: false,
      lastTop: 2313
    })
  })

  it('treats the first event as a baseline, then reacts to the next move', () => {
    expect(resolveHideOnScroll(page(500), null, opts)).toEqual({ hidden: false, lastTop: 500 })
    expect(resolveHideOnScroll(page(540), 500, opts)).toEqual({ hidden: true, lastTop: 540 })
  })
})
