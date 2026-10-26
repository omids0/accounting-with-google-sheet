import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import LinkTargetPlaceholder from './LinkTargetPlaceholder'

const html = (props: { label: string; childLabel?: string; hint?: string }) =>
  renderToStaticMarkup(createElement(LinkTargetPlaceholder, props))

describe('LinkTargetPlaceholder (the room the picker takes while its chunk loads)', () => {
  it('one disabled select for a debt, receivable or check', () => {
    const markup = html({ label: 'پرداخت کدام بدهی؟' })

    expect(markup).toContain('پرداخت کدام بدهی؟')
    expect(markup).toContain('در حال خواندن…')
    expect(markup.match(/form-field/g)).toHaveLength(1)
  })

  it('two for an installment book (book, then instalment), like the loaded field', () => {
    const markup = html({ label: 'پرداخت کدام دفترچه قسط؟', childLabel: 'کدام قسط؟' })

    expect(markup).toContain('کدام قسط؟')
    expect(markup.match(/form-field/g)).toHaveLength(2)
  })

  it('shows the «nothing open» hint when the last read found nothing, so the card keeps its height', () => {
    expect(html({ label: 'x', hint: 'بدهی بازی نیست.' })).toContain('بدهی بازی نیست.')
    expect(html({ label: 'x' })).not.toContain('بدهی بازی نیست.')
  })

  it('has no wrapper element: a wrapper would make the last field lose its bottom margin', () => {
    expect(html({ label: 'x' }).startsWith('<div class="form-field')).toBe(true)
  })
})
