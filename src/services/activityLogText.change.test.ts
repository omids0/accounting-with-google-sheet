import { describe, expect, it } from 'vitest'

import { firstPersonSummary, summaryFor } from './activityLogText'

describe('summaryFor: an edited amount', () => {
  it('puts the old and the new amount in the line', () => {
    const line = summaryFor('update', 'records', 'قبض برق', {
      change: { from: 800000, to: 850000 }
    })

    expect(line).toMatch(/^«قبض برق» را از .+ به .+ ویرایش کرد$/)
    expect(line.replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06f0))).toMatch(
      /از 800.?000 به 850.?000 \S+ ویرایش کرد$/
    )
  })

  it('stays «را ویرایش کرد» without a change, and reads in first person for me', () => {
    expect(summaryFor('update', 'records', 'قبض برق')).toBe('«قبض برق» را ویرایش کرد')
    expect(firstPersonSummary(summaryFor('update', 'records', 'قبض برق'))).toBe(
      '«قبض برق» را ویرایش کردم'
    )
  })
})
