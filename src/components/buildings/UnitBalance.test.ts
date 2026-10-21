import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import UnitBalance from './UnitBalance'

const html = (owed: number, credit: number) =>
  renderToStaticMarkup(createElement(UnitBalance, { owed, credit }))

describe('UnitBalance', () => {
  it('says «بدهکار» with the plain amount in red instead of a negative number', () => {
    const out = html(4000000, 0)

    expect(out).toContain('بدهکار')
    expect(out).toContain('text-danger')
    expect(out).toContain('۴٬۰۰۰٬۰۰۰')
    expect(out).not.toContain('−')
  })

  it('says «اعتبار» in green for a unit that holds credit', () => {
    const out = html(0, 1000000)

    expect(out).toContain('اعتبار')
    expect(out).toContain('text-success')
    expect(out).not.toContain('بدهکار')
  })

  it('shows both lines when a unit owes and holds credit, and a tick when settled', () => {
    const both = html(500000, 200000)

    expect(both).toContain('بدهکار')
    expect(both).toContain('اعتبار')
    expect(html(0, 0)).toContain('✓')
  })
})
