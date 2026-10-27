import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import Select from './Select'

const trigger = (props: { compact?: boolean }) => {
  const markup = renderToStaticMarkup(
    createElement(Select, {
      value: 'a',
      onChange: () => undefined,
      options: [{ value: 'a', label: 'قسط ۳ از ۶ · سررسید ۱۳ مهر ۱۴۰۵ — ۱٬۰۰۰٬۰۰۰ تومان' }],
      ...props
    })
  )

  return /<button[^>]*class="([^"]*)"/.exec(markup)?.[1].split(/\s+/) ?? []
}

describe('Select trigger height', () => {
  it('is at least one touch target tall and grows with a two-line value (no fixed height)', () => {
    const classes = trigger({})

    expect(classes).toContain('min-h-touch-min')
    expect(classes).toContain('h-auto')
    expect(classes).not.toContain('h-touch-min')
  })

  it('a compact select keeps its own padding and fixed height', () => {
    const classes = trigger({ compact: true })

    expect(classes).not.toContain('h-auto')
    expect(classes).not.toContain('py-1.5')
  })
})
