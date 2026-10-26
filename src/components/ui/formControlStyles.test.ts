import { describe, expect, it } from 'vitest'

import { customSelectTriggerClass, formTriggerBase } from './formControlStyles'

const classes = (value: string) => value.split(/\s+/)

describe('custom select trigger', () => {
  it('is at least one touch target tall and grows with a two-line value (no fixed height)', () => {
    const trigger = classes(customSelectTriggerClass)

    expect(trigger).toContain('min-h-touch-min')
    expect(trigger).toContain('h-auto')
    expect(trigger).not.toContain('h-touch-min')
  })

  it('leaves the date picker trigger on the fixed single-line height', () => {
    expect(classes(formTriggerBase)).toContain('h-touch-min')
  })
})
