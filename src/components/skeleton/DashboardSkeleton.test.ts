import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DashboardSkeleton } from './DashboardSkeletons'

const PERSONAL_BLOCKS = ['پیش رو', 'تراکنش‌های اخیر', 'تحلیل این ماه', 'دارایی و بدهی']

describe('DashboardSkeleton', () => {
  it('names the blocks of the personal dashboard by default', () => {
    const html = renderToStaticMarkup(createElement(DashboardSkeleton))

    for (const title of PERSONAL_BLOCKS) expect(html).toContain(title)
  })

  it('shows a building none of the personal dashboard blocks while it loads', () => {
    const html = renderToStaticMarkup(createElement(DashboardSkeleton, { variant: 'building' }))

    for (const title of PERSONAL_BLOCKS) expect(html).not.toContain(title)
    expect(html).toContain('skeleton-dashboard')
    expect(html).toContain('aria-busy="true"')
  })
})
